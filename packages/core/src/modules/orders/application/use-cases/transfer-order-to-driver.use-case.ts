import type { DomainError } from '../../../../shared/errors/domain-error'
import { Result } from '../../../../shared/kernel/result'
import type { UseCase } from '../../../../shared/kernel/use-case'
import {
  DriverCapacityExceeded,
  DriverNotAssigned,
  InvalidTransfer,
  OrderNotFound,
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

export type TransferOrderToDriverCommand = {
  orderId: string
  fromDriverId: string
  toDriverId: string
  reason: string
}

export type TransferOrderToDriverResult = {
  id: string
  status: string
  newDriverId: string
}

/**
 * El motorizado actual transfiere su pedido a otro compañero del mismo
 * restaurante (caso excepcional: accidente, moto descompuesta, emergencia).
 *
 * Reglas:
 *  - Solo el driver actual puede transferir su pedido.
 *  - El destinatario debe ser distinto, asignado al mismo restaurante,
 *    activo y disponible (`is_active` + `is_available`).
 *  - El destinatario no debe rebasar el cap R3 al recibir el pedido
 *    (`activeSlots + reservedSlots + occupancySlots <= maxOrdersPerDriver`).
 *  - Estados permitidos del pedido: heading_to_restaurant, waiting_at_restaurant,
 *    picked_up. La validación está en `Order.reassignTo()`.
 */
export class TransferOrderToDriverUseCase
  implements UseCase<TransferOrderToDriverCommand, TransferOrderToDriverResult, DomainError>
{
  constructor(
    private readonly orders: OrderRepository,
    private readonly drivers: DriverRepository,
    private readonly assignmentRules: AssignmentRulesRepository,
    private readonly events: EventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(
    cmd: TransferOrderToDriverCommand,
  ): Promise<Result<TransferOrderToDriverResult, DomainError>> {
    const order = await this.orders.findById(OrderId.of(cmd.orderId))
    if (!order) return Result.fail(new OrderNotFound(cmd.orderId))

    if (!order.driverId || order.driverId.value !== cmd.fromDriverId) {
      return Result.fail(new DriverNotAssigned())
    }
    if (cmd.fromDriverId === cmd.toDriverId) {
      return Result.fail(new InvalidTransfer('No puedes transferirte a ti mismo'))
    }

    const peer = await this.drivers.findEligiblePeer({
      driverId: cmd.toDriverId,
      restaurantId: order.restaurantId.value,
    })
    if (!peer) {
      return Result.fail(
        new InvalidTransfer('El motorizado seleccionado no está disponible'),
      )
    }

    const rules = await this.loadRules()
    const incoming = order.occupancySlots.value
    if (peer.activeSlots + peer.reservedSlots + incoming > rules.maxOrdersPerDriver) {
      return Result.fail(new DriverCapacityExceeded())
    }

    const previousStatus = order.status
    const reassigned = order.reassignTo(
      DriverId.of(cmd.toDriverId),
      cmd.reason,
      this.clock.now(),
    )
    if (reassigned.isFailure) return Result.fail(reassigned.error)

    await this.orders.save(order, previousStatus)
    await this.events.publishAll(order.pullEvents())

    return Result.ok({
      id: order.id.value,
      status: order.status.value,
      newDriverId: cmd.toDriverId,
    })
  }

  private async loadRules(): Promise<AssignmentRules> {
    const stored = await this.assignmentRules.read().catch(() => null)
    return stored ?? DEFAULT_ASSIGNMENT_RULES
  }
}
