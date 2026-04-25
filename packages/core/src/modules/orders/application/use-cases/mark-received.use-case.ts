import type { DomainError } from '../../../../shared/errors/domain-error'
import { Result } from '../../../../shared/kernel/result'
import type { UseCase } from '../../../../shared/kernel/use-case'
import { OrderNotFound } from '../../domain/errors/order-errors'
import { OrderId } from '../../domain/value-objects/order-id'
import type { Clock } from '../ports/clock'
import type { EventPublisher } from '../ports/event-publisher'
import type { OrderRepository } from '../ports/order.repository'

export type MarkReceivedCommand = { orderId: string; driverId: string }
export type MarkReceivedResult = { id: string; status: string; receivedAt: string }

/**
 * Marca el momento en que el driver presionó "Recibí el pedido". El status
 * sigue waiting_at_restaurant (no transiciona). El paso a picked_up ocurre
 * cuando el driver completa el pickup form. Idempotente.
 */
export class MarkReceivedUseCase
  implements UseCase<MarkReceivedCommand, MarkReceivedResult, DomainError>
{
  constructor(
    private readonly orders: OrderRepository,
    private readonly events: EventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(cmd: MarkReceivedCommand): Promise<Result<MarkReceivedResult, DomainError>> {
    const order = await this.orders.findById(OrderId.of(cmd.orderId))
    if (!order) return Result.fail(new OrderNotFound(cmd.orderId))

    const previous = order.status
    const res = order.markReceived(this.clock.now())
    if (res.isFailure) return Result.fail(res.error)

    await this.orders.save(order, previous)
    await this.events.publishAll(order.pullEvents())

    return Result.ok({
      id: order.id.value,
      status: order.status.value,
      // biome-ignore lint/style/noNonNullAssertion: set by markReceived (or pre-existing)
      receivedAt: order.props.receivedAt!.toISOString(),
    })
  }
}
