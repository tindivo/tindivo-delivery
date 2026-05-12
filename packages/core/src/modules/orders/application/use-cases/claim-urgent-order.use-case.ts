import type { DomainError } from '../../../../shared/errors/domain-error'
import { Result } from '../../../../shared/kernel/result'
import type { UseCase } from '../../../../shared/kernel/use-case'
import {
  DriverCapacityExceeded,
  DriverNotAuthorizedForRestaurant,
  OrderAlreadyAccepted,
  OrderNotFound,
  UrgentNotAvailable,
} from '../../domain/errors/order-errors'
import {
  type AssignmentRules,
  DEFAULT_ASSIGNMENT_RULES,
} from '../../domain/policies/assignment-rules'
import { DriverId } from '../../domain/value-objects/driver-id'
import { OrderId } from '../../domain/value-objects/order-id'
import type { AssignmentRulesRepository } from '../ports/assignment-rules.repository'
import type { Clock } from '../ports/clock'
import type { DriverRepository } from '../ports/driver.repository'
import type { EventPublisher } from '../ports/event-publisher'
import type { OrderRepository } from '../ports/order.repository'

export type ClaimUrgentOrderCommand = {
  orderId: string
  driverId: string
}

export type ClaimUrgentOrderResult = {
  id: string
  status: string
  acceptedAt: string
  driverId: string
}

/**
 * Un driver toma manualmente un pedido de la cola "Urgente". Combina
 * `assignTo` + `acceptBy` en una sola transición sin pasar por las reglas
 * R1-R5 (la cola urgente es FCFS pura — el primer driver del restaurante
 * que toque el botón gana).
 *
 * Validaciones:
 *  1. Order existe y está en (status='waiting_driver' AND urgent_since IS NOT NULL)
 *  2. Driver tiene fila en `driver_restaurants` para ese restaurante
 *  3. Driver tiene espacio en mochila (R3): activeSlots + occupancySlots ≤ cap
 *
 * Concurrencia: el `OrderRepository.claimUrgent` hace un UPDATE atómico
 * con WHERE compuesto. Si dos drivers tap-ean al mismo tiempo, solo uno
 * matchea las 3 condiciones (status + driver_id IS NULL + urgent_since IS
 * NOT NULL) — el segundo recibe `count=0` y devolvemos `OrderAlreadyAccepted`.
 */
export class ClaimUrgentOrderUseCase
  implements UseCase<ClaimUrgentOrderCommand, ClaimUrgentOrderResult, DomainError>
{
  constructor(
    private readonly orders: OrderRepository,
    private readonly drivers: DriverRepository,
    private readonly assignmentRules: AssignmentRulesRepository,
    private readonly events: EventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(
    cmd: ClaimUrgentOrderCommand,
  ): Promise<Result<ClaimUrgentOrderResult, DomainError>> {
    const orderId = OrderId.of(cmd.orderId)
    const driverId = DriverId.of(cmd.driverId)

    const order = await this.orders.findById(orderId)
    if (!order) return Result.fail(new OrderNotFound(cmd.orderId))
    if (order.status.value !== 'waiting_driver' || order.urgentSince === null)
      return Result.fail(new UrgentNotAvailable())

    const authorized = await this.drivers.canDriverServe(cmd.driverId, order.restaurantId.value)
    if (!authorized)
      return Result.fail(
        new DriverNotAuthorizedForRestaurant(cmd.driverId, order.restaurantId.value),
      )

    const rules = await this.loadRules()
    const activeCount = await this.orders.countActiveByDriver(driverId)
    const incomingSlots = order.occupancySlots.value
    if (activeCount + incomingSlots > rules.maxOrdersPerDriver) {
      return Result.fail(new DriverCapacityExceeded())
    }

    const now = this.clock.now()
    const claimed = await this.orders.claimUrgent(orderId, driverId, now)
    if (!claimed) return Result.fail(new OrderAlreadyAccepted())

    // Mutación in-memory para emitir eventos coherentes con el estado nuevo
    // que el repo ya persistió. Si applyClaimUrgent fallara aquí, el repo ya
    // hizo el UPDATE — pero las pre-condiciones del agregado son las mismas
    // que validamos arriba (status + urgent_since), así que en práctica no
    // ocurre. Dejamos el guard por defensa en profundidad.
    const applied = order.applyClaimUrgent(driverId, now)
    if (applied.isFailure) return Result.fail(applied.error)

    await this.events.publishAll(order.pullEvents())

    return Result.ok({
      id: order.id.value,
      status: order.status.value,
      // biome-ignore lint/style/noNonNullAssertion: set by applyClaimUrgent
      acceptedAt: order.props.acceptedAt!.toISOString(),
      driverId: cmd.driverId,
    })
  }

  private async loadRules(): Promise<AssignmentRules> {
    const stored = await this.assignmentRules.read().catch(() => null)
    return stored ?? DEFAULT_ASSIGNMENT_RULES
  }
}
