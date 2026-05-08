import type { DomainError } from '../../../../shared/errors/domain-error'
import { Result } from '../../../../shared/kernel/result'
import type { UseCase } from '../../../../shared/kernel/use-case'
import { OrderAlreadyAccepted, OrderNotFound } from '../../domain/errors/order-errors'
import {
  type AssignmentRules,
  DEFAULT_ASSIGNMENT_RULES,
} from '../../domain/policies/assignment-rules'
import { DriverId } from '../../domain/value-objects/driver-id'
import { OrderId } from '../../domain/value-objects/order-id'
import type { AssignmentRulesRepository } from '../ports/assignment-rules.repository'
import type { Clock } from '../ports/clock'
import type { EventPublisher } from '../ports/event-publisher'
import type { OrderRepository } from '../ports/order.repository'

export type AcceptOrderCommand = {
  orderId: string
  driverId: string
}

export type AcceptOrderResult = {
  id: string
  status: string
  acceptedAt: string
}

export class AcceptOrderUseCase
  implements UseCase<AcceptOrderCommand, AcceptOrderResult, DomainError>
{
  constructor(
    private readonly orders: OrderRepository,
    private readonly assignmentRules: AssignmentRulesRepository,
    private readonly events: EventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(cmd: AcceptOrderCommand): Promise<Result<AcceptOrderResult, DomainError>> {
    const orderId = OrderId.of(cmd.orderId)
    const driverId = DriverId.of(cmd.driverId)

    const order = await this.orders.findById(orderId)
    if (!order) return Result.fail(new OrderNotFound(cmd.orderId))
    // Solo rechaza si el pedido ya fue asignado a OTRO driver. Si driver_id
    // coincide con quien invoca, es el caso normal post-AutoAssign: el
    // sistema le reservó el pedido y ahora él confirma con "Aceptar".
    if (order.driverId && order.driverId.value !== cmd.driverId) {
      return Result.fail(new OrderAlreadyAccepted())
    }

    const previousStatus = order.status
    const activeCount = await this.orders.countActiveByDriver(driverId)
    const rules = await this.loadRules()

    const accepted = order.acceptBy(
      driverId,
      activeCount,
      rules.maxOrdersPerDriver,
      this.clock.now(),
    )
    if (accepted.isFailure) return Result.fail(accepted.error)

    await this.orders.save(order, previousStatus)
    await this.events.publishAll(order.pullEvents())

    return Result.ok({
      id: order.id.value,
      status: order.status.value,
      // biome-ignore lint/style/noNonNullAssertion: set by acceptBy
      acceptedAt: order.props.acceptedAt!.toISOString(),
    })
  }

  private async loadRules(): Promise<AssignmentRules> {
    const stored = await this.assignmentRules.read().catch(() => null)
    return stored ?? DEFAULT_ASSIGNMENT_RULES
  }
}
