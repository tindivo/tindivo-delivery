import type { DomainError } from '../../../../shared/errors/domain-error'
import { Result } from '../../../../shared/kernel/result'
import type { UseCase } from '../../../../shared/kernel/use-case'
import { DriverAssignmentPolicy } from '../../domain/policies/driver-assignment.policy'
import { DriverId } from '../../domain/value-objects/driver-id'
import { OrderId } from '../../domain/value-objects/order-id'
import { OrderStatus } from '../../domain/value-objects/order-status'
import type { Clock } from '../ports/clock'
import type { EventPublisher } from '../ports/event-publisher'
import type { OrderRepository } from '../ports/order.repository'

export type AutoAssignOrderCommand = {
  orderId: string
}

export type AutoAssignOrderResult = {
  assigned: boolean
  driverId: string | null
  activated: boolean
  reason: string | null
}

const MAX_ASSIGNED_AND_ACTIVE = 5
const GROUP_WINDOW_MINUTES = 8

export class AutoAssignOrderUseCase
  implements UseCase<AutoAssignOrderCommand, AutoAssignOrderResult, DomainError>
{
  constructor(
    private readonly orders: OrderRepository,
    private readonly events: EventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(cmd: AutoAssignOrderCommand): Promise<Result<AutoAssignOrderResult, DomainError>> {
    const orderId = OrderId.of(cmd.orderId)
    const order = await this.orders.findById(orderId)

    if (!order || order.status.value !== 'waiting_driver' || order.driverId) {
      return Result.ok({ assigned: false, driverId: null, activated: false, reason: null })
    }

    const now = this.clock.now()
    const candidates = await this.orders.findAssignmentCandidates({
      restaurantId: order.restaurantId.value,
      estimatedReadyAt: order.estimatedReadyAt,
      now,
      todayStart: startOfLimaDay(now),
      windowMinutes: GROUP_WINDOW_MINUTES,
      maxAssignedAndActive: MAX_ASSIGNED_AND_ACTIVE,
    })

    const decision = DriverAssignmentPolicy.choose(candidates)
    if (!decision) {
      return Result.ok({ assigned: false, driverId: null, activated: false, reason: null })
    }

    const driverId = DriverId.of(decision.driverId)
    const assigned = order.assignTo(driverId, decision.reason, now)
    if (assigned.isFailure) return Result.fail(assigned.error)

    let activated = false
    if (order.appearsInQueueAt.getTime() <= now.getTime()) {
      const activeCount = candidates.find((c) => c.driverId === decision.driverId)?.activeCount ?? 0
      const accepted = order.acceptBy(driverId, activeCount, MAX_ASSIGNED_AND_ACTIVE, now)
      if (accepted.isFailure) return Result.fail(accepted.error)
      activated = true
    }

    await this.orders.saveAutoAssignment(order, OrderStatus.waitingDriver())
    await this.events.publishAll(order.pullEvents())

    return Result.ok({
      assigned: true,
      driverId: decision.driverId,
      activated,
      reason: decision.reason,
    })
  }
}

function startOfLimaDay(date: Date): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '01'
  return new Date(`${get('year')}-${get('month')}-${get('day')}T00:00:00-05:00`)
}
