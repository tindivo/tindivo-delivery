import type { DomainError } from '../../../../shared/errors/domain-error'
import { Result } from '../../../../shared/kernel/result'
import type { UseCase } from '../../../../shared/kernel/use-case'
import { OrderNotFound } from '../../domain/errors/order-errors'
import { DriverId } from '../../domain/value-objects/driver-id'
import { OrderId } from '../../domain/value-objects/order-id'
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

export class AcceptOrderUseCase implements UseCase<AcceptOrderCommand, AcceptOrderResult, DomainError> {
  private readonly maxConcurrent = 3

  constructor(
    private readonly orders: OrderRepository,
    private readonly events: EventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(cmd: AcceptOrderCommand): Promise<Result<AcceptOrderResult, DomainError>> {
    const orderId = OrderId.of(cmd.orderId)
    const driverId = DriverId.of(cmd.driverId)

    const order = await this.orders.findById(orderId)
    if (!order) return Result.fail(new OrderNotFound(cmd.orderId))

    const previousStatus = order.status
    const activeCount = await this.orders.countActiveByDriver(driverId)

    const accepted = order.acceptBy(driverId, activeCount, this.maxConcurrent, this.clock.now())
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
}
