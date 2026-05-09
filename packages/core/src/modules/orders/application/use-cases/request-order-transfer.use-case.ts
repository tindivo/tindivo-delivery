import type { DomainError } from '../../../../shared/errors/domain-error'
import { Result } from '../../../../shared/kernel/result'
import type { UseCase } from '../../../../shared/kernel/use-case'
import {
  DriverCapacityExceeded,
  DriverNotAuthorizedForRestaurant,
  InvalidTransfer,
  OrderNotFound,
} from '../../domain/errors/order-errors'
import { OrderTransferRequested } from '../../domain/events/order-events'
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
import type { TransferRequestsRepository } from '../ports/transfer-requests.repository'

export type RequestOrderTransferCommand = {
  orderId: string
  /** Driver que SOLICITA el pedido (= to_driver_id en BD) */
  requesterDriverId: string
}

export type RequestOrderTransferResult = {
  transferRequestId: string
  expiresAt: string
}

/**
 * Driver B (solicitante) pide un pedido a Driver A (dueño actual). Crea una
 * solicitud pending con TTL 30s. A recibe push + ve la solicitud en su Equipo.
 *
 * Validaciones:
 *  - Order existe y tiene driver_id (no urgente — los urgentes son /claim FCFS)
 *  - Solicitante != dueño actual (no se solicita su propio pedido)
 *  - Solicitante atiende el restaurante (driver_restaurants)
 *  - Solicitante tiene capacidad R3 al sumar el slot del pedido
 *
 * Idempotente: si ya hay pending para (order, requester), devuelve la existente
 * (UNIQUE constraint del repo).
 */
export class RequestOrderTransferUseCase
  implements UseCase<RequestOrderTransferCommand, RequestOrderTransferResult, DomainError>
{
  constructor(
    private readonly orders: OrderRepository,
    private readonly drivers: DriverRepository,
    private readonly transferRequests: TransferRequestsRepository,
    private readonly assignmentRules: AssignmentRulesRepository,
    private readonly events: EventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(
    cmd: RequestOrderTransferCommand,
  ): Promise<Result<RequestOrderTransferResult, DomainError>> {
    const order = await this.orders.findById(OrderId.of(cmd.orderId))
    if (!order) return Result.fail(new OrderNotFound(cmd.orderId))

    if (!order.driverId) {
      // Pedido en cola sin driver — no aplica solicitud (usar /accept o /claim).
      return Result.fail(new InvalidTransfer('Este pedido no tiene dueño actual'))
    }
    if (order.driverId.value === cmd.requesterDriverId) {
      return Result.fail(new InvalidTransfer('No puedes solicitar tu propio pedido'))
    }

    const authorized = await this.drivers.canDriverServe(
      cmd.requesterDriverId,
      order.restaurantId.value,
    )
    if (!authorized) {
      return Result.fail(
        new DriverNotAuthorizedForRestaurant(cmd.requesterDriverId, order.restaurantId.value),
      )
    }

    // Validar capacidad R3 del solicitante. Reusa countActiveByDriver del repo
    // (cuenta pedidos en heading/waiting_at/picked_up). Más una holgura para
    // los reservados (waiting_driver con driver_id=requester) que no devuelve
    // este método. La validación final defensiva está en accept-transfer-request.
    const requesterId = DriverId.of(cmd.requesterDriverId)
    const activeCount = await this.orders.countActiveByDriver(requesterId)
    const rules = await this.loadRules()
    const incoming = order.occupancySlots.value
    if (activeCount + incoming > rules.maxOrdersPerDriver) {
      return Result.fail(new DriverCapacityExceeded())
    }

    const created = await this.transferRequests.createPending({
      orderId: cmd.orderId,
      fromDriverId: order.driverId.value,
      toDriverId: cmd.requesterDriverId,
    })

    await this.events.publishAll([
      new OrderTransferRequested({
        transferRequestId: created.id,
        orderId: order.id.value,
        shortId: order.shortId.value,
        fromDriverId: order.driverId.value,
        toDriverId: cmd.requesterDriverId,
        expiresAt: created.expiresAt.toISOString(),
      }),
    ])

    return Result.ok({
      transferRequestId: created.id,
      expiresAt: created.expiresAt.toISOString(),
    })
  }

  private async loadRules(): Promise<AssignmentRules> {
    const stored = await this.assignmentRules.read().catch(() => null)
    return stored ?? DEFAULT_ASSIGNMENT_RULES
  }
}
