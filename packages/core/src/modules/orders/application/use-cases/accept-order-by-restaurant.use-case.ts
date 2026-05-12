import type { DomainError } from '../../../../shared/errors/domain-error'
import { Result } from '../../../../shared/kernel/result'
import type { UseCase } from '../../../../shared/kernel/use-case'
import { OrderNotFound } from '../../domain/errors/order-errors'
import { OrderId } from '../../domain/value-objects/order-id'
import type { Clock } from '../ports/clock'
import type { EventPublisher } from '../ports/event-publisher'
import type { OrderRepository } from '../ports/order.repository'

export type AcceptOrderByRestaurantCommand = {
  orderId: string
  restaurantId: string
  prepMinutes: number
}

export type AcceptOrderByRestaurantResult = {
  id: string
  status: string
  estimatedReadyAt: string
  appearsInQueueAt: string
  prepMinutes: number
}

/**
 * El restaurante acepta un pedido `customer_pwa` en estado pending_acceptance
 * y define el prep_time real. Recalcula `estimated_ready_at` y
 * `appears_in_queue_at` con el nuevo prep desde `now`, y transiciona a
 * `waiting_driver`. El cron `assign-pending-orders` (cada 1 min) o el caller
 * REST puede disparar `AutoAssignOrderUseCase` para asignar driver inmediato.
 */
export class AcceptOrderByRestaurantUseCase
  implements UseCase<AcceptOrderByRestaurantCommand, AcceptOrderByRestaurantResult, DomainError>
{
  constructor(
    private readonly orders: OrderRepository,
    private readonly events: EventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(
    cmd: AcceptOrderByRestaurantCommand,
  ): Promise<Result<AcceptOrderByRestaurantResult, DomainError>> {
    const orderId = OrderId.of(cmd.orderId)
    const order = await this.orders.findById(orderId)
    if (!order) return Result.fail(new OrderNotFound(cmd.orderId))

    if (order.restaurantId.value !== cmd.restaurantId) {
      return Result.fail(new OrderNotFound(cmd.orderId))
    }

    const previousStatus = order.status
    const result = order.acceptByRestaurant(cmd.prepMinutes, this.clock.now())
    if (result.isFailure) return Result.fail(result.error)

    await this.orders.save(order, previousStatus)
    await this.events.publishAll(order.pullEvents())

    return Result.ok({
      id: order.id.value,
      status: order.status.value,
      estimatedReadyAt: order.estimatedReadyAt.toISOString(),
      appearsInQueueAt: order.appearsInQueueAt.toISOString(),
      prepMinutes: cmd.prepMinutes,
    })
  }
}
