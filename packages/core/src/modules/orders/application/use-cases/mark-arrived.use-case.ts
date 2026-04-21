import type { DomainError } from '../../../../shared/errors/domain-error'
import { Result } from '../../../../shared/kernel/result'
import type { UseCase } from '../../../../shared/kernel/use-case'
import { OrderNotFound } from '../../domain/errors/order-errors'
import { OrderId } from '../../domain/value-objects/order-id'
import type { Clock } from '../ports/clock'
import type { EventPublisher } from '../ports/event-publisher'
import type { OrderRepository } from '../ports/order.repository'

export type MarkArrivedCommand = { orderId: string; driverId: string }
export type MarkArrivedResult = { id: string; status: string; waitingStartedAt: string }

export class MarkArrivedUseCase
  implements UseCase<MarkArrivedCommand, MarkArrivedResult, DomainError>
{
  constructor(
    private readonly orders: OrderRepository,
    private readonly events: EventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(cmd: MarkArrivedCommand): Promise<Result<MarkArrivedResult, DomainError>> {
    const order = await this.orders.findById(OrderId.of(cmd.orderId))
    if (!order) return Result.fail(new OrderNotFound(cmd.orderId))

    const previous = order.status
    const res = order.markArrived(this.clock.now())
    if (res.isFailure) return Result.fail(res.error)

    await this.orders.save(order, previous)
    await this.events.publishAll(order.pullEvents())

    return Result.ok({
      id: order.id.value,
      status: order.status.value,
      // biome-ignore lint/style/noNonNullAssertion: set by markArrived
      waitingStartedAt: order.props.waitingAt!.toISOString(),
    })
  }
}
