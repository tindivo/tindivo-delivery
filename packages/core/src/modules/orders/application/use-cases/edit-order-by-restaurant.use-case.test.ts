import { describe, expect, it, vi } from 'vitest'
import type { DomainEvent } from '../../../../shared/kernel/domain-event'
import { Order } from '../../domain/entities/order'
import { Money } from '../../domain/value-objects/money'
import type { OrderId } from '../../domain/value-objects/order-id'
import { PaymentIntent } from '../../domain/value-objects/payment-intent'
import { PrepTime } from '../../domain/value-objects/prep-time'
import { RestaurantId } from '../../domain/value-objects/restaurant-id'
import type { Clock } from '../ports/clock'
import type { EventPublisher } from '../ports/event-publisher'
import type {
  AssignmentCandidateQuery,
  DriverAssignmentCandidate,
  OrderRepository,
} from '../ports/order.repository'
import { EditOrderByRestaurantUseCase } from './edit-order-by-restaurant.use-case'

const RESTAURANT_ID = '11111111-1111-1111-1111-111111111111'
const OTHER_RESTAURANT = '99999999-9999-9999-9999-999999999999'
const NOW = new Date('2026-05-04T12:00:00.000Z')

function fixedClock(date: Date): Clock {
  return { now: () => date }
}

function buildOrder(opts?: { paymentStatus?: 'prepaid' | 'pending_yape' | 'pending_cash' }): Order {
  const result = Order.create({
    restaurantId: RestaurantId.of(RESTAURANT_ID),
    prepTime: PrepTime.of(15),
    payment:
      opts?.paymentStatus === 'pending_cash'
        ? PaymentIntent.create('pending_cash', Money.pen(20), Money.pen(50))
        : PaymentIntent.create(opts?.paymentStatus ?? 'pending_yape', Money.pen(20)),
    deliveryFee: Money.pen(5),
    clientName: 'Original',
    now: NOW,
  })
  if (result.isFailure) throw new Error('Failed to create order in test fixture')
  result.value.pullEvents()
  return result.value
}

type RepoWithMock = OrderRepository & { saveMock: ReturnType<typeof vi.fn> }

function buildRepo(order: Order | null): RepoWithMock {
  const saveMock = vi.fn()
  return {
    saveMock,
    findById: async (_id: OrderId) => order,
    save: async (o: Order) => {
      saveMock(o)
    },
    saveAutoAssignment: async () => {},
    insert: async (_o: Order) => {},
    countActiveByDriver: async () => 0,
    findAssignmentCandidates: async (_q: AssignmentCandidateQuery) =>
      [] as DriverAssignmentCandidate[],
    findAvailable: async () => [],
    findByRestaurant: async () => [],
    findByDriver: async () => [],
    claimUrgent: async () => false,
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

describe('EditOrderByRestaurantUseCase', () => {
  it('actualiza solo el nombre del cliente y emite evento', async () => {
    const order = buildOrder()
    const repo = buildRepo(order)
    const publisher = buildPublisher()
    const useCase = new EditOrderByRestaurantUseCase(repo, publisher, fixedClock(NOW))

    const result = await useCase.execute({
      orderId: order.id.value,
      restaurantId: RESTAURANT_ID,
      clientName: 'Nuevo Nombre',
    })

    expect(result.isSuccess).toBe(true)
    if (!result.isSuccess) return
    expect(result.value.clientName).toBe('Nuevo Nombre')
    expect(result.value.orderAmount).toBe(20)
    expect(repo.saveMock).toHaveBeenCalledOnce()
    const ev = publisher.collected.find((e) => e.eventType === 'OrderEditedByRestaurant')
    expect(ev).toBeDefined()
  })

  it('cambia método de pago + monto y recalcula vuelto', async () => {
    const order = buildOrder({ paymentStatus: 'pending_yape' })
    const repo = buildRepo(order)
    const publisher = buildPublisher()
    const useCase = new EditOrderByRestaurantUseCase(repo, publisher, fixedClock(NOW))

    const result = await useCase.execute({
      orderId: order.id.value,
      restaurantId: RESTAURANT_ID,
      paymentStatus: 'pending_cash',
      orderAmount: 35,
      clientPaysWith: 50,
    })

    expect(result.isSuccess).toBe(true)
    if (!result.isSuccess) return
    expect(result.value.paymentStatus).toBe('pending_cash')
    expect(result.value.orderAmount).toBe(35)
    expect(result.value.clientPaysWith).toBe(50)
    expect(result.value.changeToGive).toBe(15)
  })

  it('rechaza edición de un restaurante distinto al dueño del pedido', async () => {
    const order = buildOrder()
    const repo = buildRepo(order)
    const publisher = buildPublisher()
    const useCase = new EditOrderByRestaurantUseCase(repo, publisher, fixedClock(NOW))

    const result = await useCase.execute({
      orderId: order.id.value,
      restaurantId: OTHER_RESTAURANT,
      clientName: 'Hacker',
    })

    expect(result.isFailure).toBe(true)
    if (!result.isFailure) return
    expect(result.error.code).toBe('ORDER_NOT_FOUND')
  })

  it('rechaza edición si el pedido ya está entregado', async () => {
    const order = buildOrder()
    // Forzamos status delivered simulando todo el ciclo de vida.
    const driverId = (await import('../../domain/value-objects/driver-id')).DriverId.of(
      '22222222-2222-2222-2222-222222222222',
    )
    order.assignTo(driverId, 'manual', NOW)
    order.acceptBy(driverId, 0, 4, NOW)
    order.markArrived(NOW)
    // saveCustomerData requiere phone + (coords or reference)
    order.saveCustomerData('999111222', null, null, 'Av. Test 123', NOW)
    const { OccupancySlots: Slots } = await import('../../domain/value-objects/occupancy-slots')
    order.markPickedUp(Slots.default(), NOW)
    order.markDelivered(NOW)
    order.pullEvents()

    const repo = buildRepo(order)
    const publisher = buildPublisher()
    const useCase = new EditOrderByRestaurantUseCase(repo, publisher, fixedClock(NOW))

    const result = await useCase.execute({
      orderId: order.id.value,
      restaurantId: RESTAURANT_ID,
      clientName: 'Tarde',
    })

    expect(result.isFailure).toBe(true)
    if (!result.isFailure) return
    expect(result.error.code).toBe('ORDER_NOT_EDITABLE')
  })

  it('idempotente: sin cambios efectivos no emite evento', async () => {
    const order = buildOrder()
    const repo = buildRepo(order)
    const publisher = buildPublisher()
    const useCase = new EditOrderByRestaurantUseCase(repo, publisher, fixedClock(NOW))

    const result = await useCase.execute({
      orderId: order.id.value,
      restaurantId: RESTAURANT_ID,
      clientName: 'Original', // mismo valor
    })

    expect(result.isSuccess).toBe(true)
    const ev = publisher.collected.find((e) => e.eventType === 'OrderEditedByRestaurant')
    expect(ev).toBeUndefined()
  })
})
