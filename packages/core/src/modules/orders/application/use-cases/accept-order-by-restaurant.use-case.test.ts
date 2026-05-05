import { describe, expect, it, vi } from 'vitest'
import type { DomainEvent } from '../../../../shared/kernel/domain-event'
import { Order } from '../../domain/entities/order'
import { Money } from '../../domain/value-objects/money'
import type { OrderId } from '../../domain/value-objects/order-id'
import type { OrderStatus } from '../../domain/value-objects/order-status'
import { PaymentIntent } from '../../domain/value-objects/payment-intent'
import { PrepTime } from '../../domain/value-objects/prep-time'
import { RestaurantId } from '../../domain/value-objects/restaurant-id'
import type { Clock } from '../ports/clock'
import type { EventPublisher } from '../ports/event-publisher'
import type { OrderRepository } from '../ports/order.repository'
import { AcceptOrderByRestaurantUseCase } from './accept-order-by-restaurant.use-case'

const RESTAURANT_ID = '11111111-1111-1111-1111-111111111111'
const OTHER_RESTAURANT_ID = '99999999-9999-9999-9999-999999999999'
const NOW = new Date('2026-05-05T18:00:00.000Z')

function fixedClock(date: Date): Clock {
  return { now: () => date }
}

function buildCustomerPwaOrder(prepMinutes: number, createdAt: Date): Order {
  const result = Order.create({
    restaurantId: RestaurantId.of(RESTAURANT_ID),
    prepTime: PrepTime.of(prepMinutes),
    payment: PaymentIntent.create('pending_yape', Money.pen(50)),
    deliveryFee: Money.pen(3),
    source: 'customer_pwa',
    now: createdAt,
  })
  if (result.isFailure) throw new Error('failed to build')
  result.value.pullEvents()
  return result.value
}

function buildRestaurantPwaOrder(prepMinutes: number, createdAt: Date): Order {
  const result = Order.create({
    restaurantId: RestaurantId.of(RESTAURANT_ID),
    prepTime: PrepTime.of(prepMinutes),
    payment: PaymentIntent.create('prepaid', Money.pen(30)),
    deliveryFee: Money.pen(3),
    source: 'restaurant_pwa',
    now: createdAt,
  })
  if (result.isFailure) throw new Error('failed to build')
  result.value.pullEvents()
  return result.value
}

function buildRepo(opts: { order: Order | null }) {
  const saveMock = vi.fn()
  const repo: OrderRepository = {
    findById: async (_id: OrderId) => opts.order,
    save: async (order: Order, _expected: OrderStatus) => {
      saveMock(order)
    },
    saveAutoAssignment: async () => {},
    insert: async () => {},
    countActiveByDriver: async () => 0,
    findAssignmentCandidates: async () => [],
    findAvailable: async () => [],
    findByRestaurant: async () => [],
    findByDriver: async () => [],
  }
  return { repo, saveMock }
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

describe('AcceptOrderByRestaurantUseCase', () => {
  it('acepta pedido pending_acceptance y transiciona a waiting_driver con prep_time real', async () => {
    const order = buildCustomerPwaOrder(20, new Date(NOW.getTime() - 60_000))
    expect(order.status.value).toBe('pending_acceptance')

    const { repo, saveMock } = buildRepo({ order })
    const publisher = buildPublisher()
    const useCase = new AcceptOrderByRestaurantUseCase(repo, publisher, fixedClock(NOW))

    const result = await useCase.execute({
      orderId: order.id.value,
      restaurantId: RESTAURANT_ID,
      prepMinutes: 15,
    })

    expect(result.isSuccess).toBe(true)
    if (!result.isSuccess) return
    expect(result.value.status).toBe('waiting_driver')
    expect(result.value.prepMinutes).toBe(15)
    // estimatedReadyAt debe ser NOW + 15min
    const expected = new Date(NOW.getTime() + 15 * 60_000).toISOString()
    expect(result.value.estimatedReadyAt).toBe(expected)
    expect(saveMock).toHaveBeenCalledOnce()
    expect(publisher.collected.map((e) => e.eventType)).toContain('OrderAcceptedByRestaurant')
  })

  it('rechaza si el pedido pertenece a otro restaurante', async () => {
    const order = buildCustomerPwaOrder(20, NOW)
    const { repo } = buildRepo({ order })
    const publisher = buildPublisher()
    const useCase = new AcceptOrderByRestaurantUseCase(repo, publisher, fixedClock(NOW))

    const result = await useCase.execute({
      orderId: order.id.value,
      restaurantId: OTHER_RESTAURANT_ID,
      prepMinutes: 15,
    })

    expect(result.isFailure).toBe(true)
    if (!result.isFailure) return
    expect(result.error.code).toBe('ORDER_NOT_FOUND')
  })

  it('rechaza si el pedido es restaurant_pwa (ya nace en waiting_driver)', async () => {
    const order = buildRestaurantPwaOrder(20, NOW)
    expect(order.status.value).toBe('waiting_driver')

    const { repo } = buildRepo({ order })
    const publisher = buildPublisher()
    const useCase = new AcceptOrderByRestaurantUseCase(repo, publisher, fixedClock(NOW))

    const result = await useCase.execute({
      orderId: order.id.value,
      restaurantId: RESTAURANT_ID,
      prepMinutes: 15,
    })

    expect(result.isFailure).toBe(true)
    if (!result.isFailure) return
    expect(result.error.code).toBe('INVALID_STATE_TRANSITION')
  })

  it('Order.create con source=customer_pwa raise OrderPendingAcceptance', () => {
    const result = Order.create({
      restaurantId: RestaurantId.of(RESTAURANT_ID),
      prepTime: PrepTime.of(20),
      payment: PaymentIntent.create('pending_yape', Money.pen(50)),
      deliveryFee: Money.pen(3),
      source: 'customer_pwa',
      now: NOW,
    })
    expect(result.isSuccess).toBe(true)
    if (!result.isSuccess) return
    const events = result.value.pullEvents().map((e) => e.eventType)
    expect(events).toContain('OrderCreated')
    expect(events).toContain('OrderPendingAcceptance')
    expect(result.value.status.value).toBe('pending_acceptance')
    expect(result.value.props.pendingAcceptanceAt).toEqual(NOW)
  })

  it('Order.create con source=restaurant_pwa NO raise OrderPendingAcceptance', () => {
    const result = Order.create({
      restaurantId: RestaurantId.of(RESTAURANT_ID),
      prepTime: PrepTime.of(20),
      payment: PaymentIntent.create('prepaid', Money.pen(50)),
      deliveryFee: Money.pen(3),
      source: 'restaurant_pwa',
      now: NOW,
    })
    expect(result.isSuccess).toBe(true)
    if (!result.isSuccess) return
    const events = result.value.pullEvents().map((e) => e.eventType)
    expect(events).toContain('OrderCreated')
    expect(events).not.toContain('OrderPendingAcceptance')
    expect(result.value.status.value).toBe('waiting_driver')
    expect(result.value.props.pendingAcceptanceAt).toBeNull()
  })
})
