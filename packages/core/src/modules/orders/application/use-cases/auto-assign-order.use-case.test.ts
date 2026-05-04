import { describe, expect, it, vi } from 'vitest'
import type { DomainEvent } from '../../../../shared/kernel/domain-event'
import { Order } from '../../domain/entities/order'
import {
  type AssignmentRules,
  DEFAULT_ASSIGNMENT_RULES,
} from '../../domain/policies/assignment-rules'
import type { DriverAssignmentCandidate } from '../../domain/policies/driver-assignment.policy'
import { Money } from '../../domain/value-objects/money'
import type { OrderId } from '../../domain/value-objects/order-id'
import { PaymentIntent } from '../../domain/value-objects/payment-intent'
import { PrepTime } from '../../domain/value-objects/prep-time'
import { RestaurantId } from '../../domain/value-objects/restaurant-id'
import type { AssignmentRulesRepository } from '../ports/assignment-rules.repository'
import type { Clock } from '../ports/clock'
import type { EventPublisher } from '../ports/event-publisher'
import type { AssignmentCandidateQuery, OrderRepository } from '../ports/order.repository'
import { AutoAssignOrderUseCase } from './auto-assign-order.use-case'

const RESTAURANT_ID = '11111111-1111-1111-1111-111111111111'
const DRIVER_ID = '22222222-2222-2222-2222-222222222222'
const NOW = new Date('2026-05-03T18:00:00.000Z')

function fixedClock(date: Date): Clock {
  return { now: () => date }
}

function buildOrder(prepMinutes: number, createdAt: Date): Order {
  const result = Order.create({
    restaurantId: RestaurantId.of(RESTAURANT_ID),
    prepTime: PrepTime.of(prepMinutes),
    payment: PaymentIntent.create('prepaid', Money.pen(20)),
    deliveryFee: Money.pen(5),
    now: createdAt,
  })
  if (result.isFailure) throw new Error('Failed to create order in test fixture')
  // Limpiamos los eventos del create para que solo queden los del use-case bajo test
  result.value.pullEvents()
  return result.value
}

function buildCandidate(over: Partial<DriverAssignmentCandidate> = {}): DriverAssignmentCandidate {
  return {
    driverId: DRIVER_ID,
    deliveredToday: 0,
    activeCount: 0,
    reservedCount: 0,
    cancelledTodayCount: 0,
    sameRestaurantWindowCount: 0,
    distinctRestaurantsInBag: [],
    shiftStartedAt: null,
    operatingDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    shiftStart: '08:00',
    shiftEnd: '23:00',
    ...over,
  }
}

type RepoWithMock = OrderRepository & {
  saveAutoAssignmentMock: ReturnType<typeof vi.fn>
}

function buildRepo(opts: {
  order: Order | null
  candidates?: DriverAssignmentCandidate[]
}): RepoWithMock {
  const saveAutoAssignmentMock = vi.fn()
  return {
    saveAutoAssignmentMock,
    findById: async (_id: OrderId) => opts.order,
    save: async () => {},
    saveAutoAssignment: async (order: Order) => {
      saveAutoAssignmentMock(order)
    },
    insert: async (_o: Order) => {},
    countActiveByDriver: async () => 0,
    findAssignmentCandidates: async (_q: AssignmentCandidateQuery) => opts.candidates ?? [],
    findAvailable: async () => [],
    findByRestaurant: async () => [],
    findByDriver: async () => [],
  }
}

function buildRulesRepo(
  rules: AssignmentRules = DEFAULT_ASSIGNMENT_RULES,
): AssignmentRulesRepository {
  return {
    read: async () => rules,
    write: async () => ({ updatedAt: new Date().toISOString() }),
  }
}

function buildPublisher(): EventPublisher & { collected: DomainEvent[] } {
  const collected: DomainEvent[] = []
  return {
    collected,
    async publish(event) {
      collected.push(event)
    },
    async publishAll(events) {
      collected.push(...events)
    },
  }
}

describe('AutoAssignOrderUseCase', () => {
  it('difiere asignación cuando appearsInQueueAt está en el futuro', async () => {
    // prep=30min con createdAt=NOW → appearsInQueueAt = NOW + 20min (futuro vs NOW)
    const order = buildOrder(30, NOW)
    const repo = buildRepo({ order, candidates: [buildCandidate()] })
    const publisher = buildPublisher()
    const useCase = new AutoAssignOrderUseCase(repo, buildRulesRepo(), publisher, fixedClock(NOW))

    const result = await useCase.execute({ orderId: order.id.value })

    expect(result.isSuccess).toBe(true)
    if (!result.isSuccess) return
    expect(result.value).toEqual({
      assigned: false,
      driverId: null,
      activated: false,
      reason: 'deferred_until_queue_window',
    })
    expect(repo.saveAutoAssignmentMock).not.toHaveBeenCalled()
    expect(publisher.collected).toHaveLength(0)
  })

  it('asigna y activa inmediatamente cuando appearsInQueueAt <= now (prep ≤ 10min)', async () => {
    // prep=10min → appearsInQueueAt = createdAt (igual al now)
    const order = buildOrder(10, NOW)
    const repo = buildRepo({ order, candidates: [buildCandidate()] })
    const publisher = buildPublisher()
    const useCase = new AutoAssignOrderUseCase(repo, buildRulesRepo(), publisher, fixedClock(NOW))

    const result = await useCase.execute({ orderId: order.id.value })

    expect(result.isSuccess).toBe(true)
    if (!result.isSuccess) return
    expect(result.value.assigned).toBe(true)
    expect(result.value.activated).toBe(true)
    expect(result.value.driverId).toBe(DRIVER_ID)
    // La razón ahora viene del policy (R1_grouping o R4_rotation).
    expect(['R1_grouping', 'R4_rotation']).toContain(result.value.reason)
    expect(repo.saveAutoAssignmentMock).toHaveBeenCalledOnce()
    // Eventos esperados: OrderAssigned + OrderAccepted
    expect(publisher.collected.map((e) => e.eventType)).toContain('OrderAssigned')
    expect(publisher.collected.map((e) => e.eventType)).toContain('OrderAccepted')
  })

  it('asigna también cuando el cron lo recoge tarde (appearsInQueueAt en el pasado)', async () => {
    // Pedido creado hace 25 min con prep=30 → appearsInQueueAt = -5min (pasado)
    const past = new Date(NOW.getTime() - 25 * 60_000)
    const order = buildOrder(30, past)
    const repo = buildRepo({ order, candidates: [buildCandidate()] })
    const publisher = buildPublisher()
    const useCase = new AutoAssignOrderUseCase(repo, buildRulesRepo(), publisher, fixedClock(NOW))

    const result = await useCase.execute({ orderId: order.id.value })

    expect(result.isSuccess).toBe(true)
    if (!result.isSuccess) return
    expect(result.value.assigned).toBe(true)
    expect(result.value.activated).toBe(true)
    expect(result.value.driverId).toBe(DRIVER_ID)
  })

  it('retorna sin asignar si no encuentra candidatos elegibles', async () => {
    const order = buildOrder(10, NOW)
    const repo = buildRepo({ order, candidates: [] })
    const publisher = buildPublisher()
    const useCase = new AutoAssignOrderUseCase(repo, buildRulesRepo(), publisher, fixedClock(NOW))

    const result = await useCase.execute({ orderId: order.id.value })

    expect(result.isSuccess).toBe(true)
    if (!result.isSuccess) return
    expect(result.value).toEqual({
      assigned: false,
      driverId: null,
      activated: false,
      reason: null,
    })
    expect(repo.saveAutoAssignmentMock).not.toHaveBeenCalled()
  })

  it('no asigna si el pedido ya tiene driver (idempotencia)', async () => {
    const order = buildOrder(10, NOW)
    // Simulamos que ya fue asignado: usamos el método público assignTo
    const assignResult = order.assignTo(
      // biome-ignore lint/style/noNonNullAssertion: test fixture
      (await import('../../domain/value-objects/driver-id')).DriverId.of(DRIVER_ID),
      'manual_test',
      NOW,
    )
    expect(assignResult.isSuccess).toBe(true)
    order.pullEvents()

    const repo = buildRepo({ order, candidates: [buildCandidate()] })
    const publisher = buildPublisher()
    const useCase = new AutoAssignOrderUseCase(repo, buildRulesRepo(), publisher, fixedClock(NOW))

    const result = await useCase.execute({ orderId: order.id.value })

    expect(result.isSuccess).toBe(true)
    if (!result.isSuccess) return
    expect(result.value.assigned).toBe(false)
    expect(result.value.reason).toBeNull()
  })

  it('aplica el cap dinámico de assignment_rules al asignar', async () => {
    // Driver con 2 activos y rules.maxOrdersPerDriver=2 → no es candidato.
    const order = buildOrder(10, NOW)
    const fullDriver = buildCandidate({ driverId: DRIVER_ID, activeCount: 2 })
    const repo = buildRepo({ order, candidates: [fullDriver] })
    const publisher = buildPublisher()
    const useCase = new AutoAssignOrderUseCase(
      repo,
      buildRulesRepo({ ...DEFAULT_ASSIGNMENT_RULES, maxOrdersPerDriver: 2 }),
      publisher,
      fixedClock(NOW),
    )

    const result = await useCase.execute({ orderId: order.id.value })

    expect(result.isSuccess).toBe(true)
    if (!result.isSuccess) return
    expect(result.value.assigned).toBe(false)
    expect(repo.saveAutoAssignmentMock).not.toHaveBeenCalled()
  })
})
