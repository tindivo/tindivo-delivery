import type { DomainError } from '../../../../shared/errors/domain-error'
import { Result } from '../../../../shared/kernel/result'
import type { UseCase } from '../../../../shared/kernel/use-case'
import { OrderNotFound } from '../../domain/errors/order-errors'
import { OrderId } from '../../domain/value-objects/order-id'
import type { Clock } from '../ports/clock'
import type { EventPublisher } from '../ports/event-publisher'
import type { OrderRepository } from '../ports/order.repository'

export type MarkDeliveredCommand = { orderId: string; driverId: string }
export type MarkDeliveredResult = { id: string; status: string; deliveredAt: string }

export class MarkDeliveredUseCase
  implements UseCase<MarkDeliveredCommand, MarkDeliveredResult, DomainError>
{
  constructor(
    private readonly orders: OrderRepository,
    private readonly events: EventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(cmd: MarkDeliveredCommand): Promise<Result<MarkDeliveredResult, DomainError>> {
    const order = await this.orders.findById(OrderId.of(cmd.orderId))
    if (!order) return Result.fail(new OrderNotFound(cmd.orderId))

    const previous = order.status
    const res = order.markDelivered(this.clock.now())
    if (res.isFailure) return Result.fail(res.error)

    await this.orders.save(order, previous)
    await this.events.publishAll(order.pullEvents())

    return Result.ok({
      id: order.id.value,
      status: order.status.value,
      // biome-ignore lint/style/noNonNullAssertion: set by markDelivered
      deliveredAt: order.props.deliveredAt!.toISOString(),
    })
  }
}
