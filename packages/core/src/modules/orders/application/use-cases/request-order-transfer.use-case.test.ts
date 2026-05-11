import { describe, expect, it, vi } from 'vitest'
import type { DomainError } from '../../../../shared/errors/domain-error'
import type { DomainEvent } from '../../../../shared/kernel/domain-event'
import { Order } from '../../domain/entities/order'
import { DEFAULT_ASSIGNMENT_RULES } from '../../domain/policies/assignment-rules'
import { DriverId } from '../../domain/value-objects/driver-id'
import { Money } from '../../domain/value-objects/money'
import { PaymentIntent } from '../../domain/value-objects/payment-intent'
import { PrepTime } from '../../domain/value-objects/prep-time'
import { RestaurantId } from '../../domain/value-objects/restaurant-id'
import type { AssignmentRulesRepository } from '../ports/assignment-rules.repository'
import type { Clock } from '../ports/clock'
import type { DriverRepository } from '../ports/driver.repository'
import type { EventPublisher } from '../ports/event-publisher'
import type { OrderRepository } from '../ports/order.repository'
import type { TransferRequestsRepository } from '../ports/transfer-requests.repository'
import { RequestOrderTransferUseCase } from './request-order-transfer.use-case'

const RESTAURANT_ID = '11111111-1111-1111-1111-111111111111'
const OWNER_DRIVER_ID = '22222222-2222-2222-2222-222222222222'
const REQUESTER_DRIVER_ID = '33333333-3333-3333-3333-333333333333'
const NOW = new Date('2026-05-15T18:00:00Z')

function fixedClock(): Clock {
  return { now: () => NOW }
}

function buildOrder(opts?: { withDriver?: boolean; driverId?: string }): Order {
  const result = Order.create({
    restaurantId: RestaurantId.of(RESTAURANT_ID),
    prepTime: PrepTime.of(20),
    payment: PaymentIntent.create('prepaid', Money.pen(20)),
    deliveryFee: Money.pen(5),
    now: NOW,
  })
  if (result.isFailure) throw new Error('order create failed')
  result.value.pullEvents()
  const withDriver = opts?.withDriver !== false // default true
  if (withDriver) {
    result.value.assignTo(DriverId.of(opts?.driverId ?? OWNER_DRIVER_ID), 'manual', NOW)
    result.value.pullEvents()
  }
  return result.value
}

function buildOrdersRepo(opts: {
  order: Order | null
  activeCount?: number
}): OrderRepository {
  return {
    findById: async () => opts.order,
    save: async () => {},
    saveAutoAssignment: async () => {},
    insert: async () => {},
    countActiveByDriver: async () => opts.activeCount ?? 0,
    findAssignmentCandidates: async () => [],
    findAvailable: async () => [],
    findByRestaurant: async () => [],
    findByDriver: async () => [],
    claimUrgent: async () => false,
  }
}

function buildDriversRepo(canServe: boolean): DriverRepository {
  return {
    findEligiblePeers: async () => [],
    findEligiblePeer: async () => null,
    canDriverServe: async () => canServe,
  }
}

function buildTransferRepo(): TransferRequestsRepository & {
  createPendingMock: ReturnType<typeof vi.fn>
} {
  const createPendingMock = vi.fn()
  return {
    createPendingMock,
    createPending: async (input) => {
      createPendingMock(input)
      return {
        id: 'tr-1',
        orderId: input.orderId,
        fromDriverId: input.fromDriverId,
        toDriverId: input.toDriverId,
        status: 'pending',
        createdAt: NOW,
        expiresAt: new Date(NOW.getTime() + 30_000),
        resolvedAt: null,
      }
    },
    findById: async () => null,
    findPendingForOwner: async () => [],
    findPendingByRequester: async () => [],
    findExpiredPending: async () => [],
    markAccepted: async () => {},
    markRejected: async () => {},
    markExpired: async () => {},
    invalidateOtherPendingForOrder: async () => {},
  }
}

function buildRulesRepo(): AssignmentRulesRepository {
  return {
    read: async () => DEFAULT_ASSIGNMENT_RULES,
    write: async () => ({ updatedAt: NOW.toISOString() }),
  }
}

function buildPublisher(): EventPublisher & { collected: DomainEvent[] } {
  const collected: DomainEvent[] = []
  return {
    collected,
    async publish(e) {
      collected.push(e)
    },
    async publishAll(events) {
      collected.push(...events)
    },
  }
}

function buildUseCase(overrides?: {
  order?: Order | null
  activeCount?: number
  canServe?: boolean
}) {
  const ordersRepo = buildOrdersRepo({
    order: overrides?.order === undefined ? buildOrder() : overrides.order,
    activeCount: overrides?.activeCount,
  })
  const driversRepo = buildDriversRepo(overrides?.canServe ?? true)
  const transferRepo = buildTransferRepo()
  const publisher = buildPublisher()
  const useCase = new RequestOrderTransferUseCase(
    ordersRepo,
    driversRepo,
    transferRepo,
    buildRulesRepo(),
    publisher,
    fixedClock(),
  )
  return { useCase, ordersRepo, driversRepo, transferRepo, publisher }
}

describe('RequestOrderTransferUseCase', () => {
  it('crea solicitud pending y emite OrderTransferRequested', async () => {
    const { useCase, transferRepo, publisher } = buildUseCase()
    const result = await useCase.execute({
      orderId: '44444444-4444-4444-4444-444444444444',
      requesterDriverId: REQUESTER_DRIVER_ID,
    })
    expect(result.isSuccess).toBe(true)
    if (!result.isSuccess) return
    expect(result.value.transferRequestId).toBe('tr-1')
    expect(transferRepo.createPendingMock).toHaveBeenCalledWith({
      orderId: '44444444-4444-4444-4444-444444444444',
      fromDriverId: OWNER_DRIVER_ID,
      toDriverId: REQUESTER_DRIVER_ID,
    })
    expect(publisher.collected.map((e) => e.eventType)).toContain('OrderTransferRequested')
  })

  it('falla con ORDER_NOT_FOUND si el pedido no existe', async () => {
    const { useCase } = buildUseCase({ order: null })
    const result = await useCase.execute({
      orderId: '44444444-4444-4444-4444-444444444444',
      requesterDriverId: REQUESTER_DRIVER_ID,
    })
    expect(result.isFailure).toBe(true)
    if (!result.isFailure) return
    expect((result.error as DomainError).code).toBe('ORDER_NOT_FOUND')
  })

  it('falla con INVALID_TRANSFER si el solicitante es el mismo dueño', async () => {
    const { useCase } = buildUseCase()
    const result = await useCase.execute({
      orderId: '44444444-4444-4444-4444-444444444444',
      requesterDriverId: OWNER_DRIVER_ID,
    })
    expect(result.isFailure).toBe(true)
    if (!result.isFailure) return
    expect((result.error as DomainError).code).toBe('INVALID_TRANSFER')
  })

  it('falla con INVALID_TRANSFER si el pedido no tiene driver_id (cola En espera)', async () => {
    const { useCase } = buildUseCase({ order: buildOrder({ withDriver: false }) })
    const result = await useCase.execute({
      orderId: '44444444-4444-4444-4444-444444444444',
      requesterDriverId: REQUESTER_DRIVER_ID,
    })
    expect(result.isFailure).toBe(true)
    if (!result.isFailure) return
    expect((result.error as DomainError).code).toBe('INVALID_TRANSFER')
  })

  it('falla con DRIVER_NOT_AUTHORIZED_FOR_RESTAURANT si el solicitante no atiende el restaurante', async () => {
    const { useCase } = buildUseCase({ canServe: false })
    const result = await useCase.execute({
      orderId: '44444444-4444-4444-4444-444444444444',
      requesterDriverId: REQUESTER_DRIVER_ID,
    })
    expect(result.isFailure).toBe(true)
    if (!result.isFailure) return
    expect((result.error as DomainError).code).toBe('DRIVER_NOT_AUTHORIZED_FOR_RESTAURANT')
  })

  it('falla con DRIVER_CAPACITY_EXCEEDED si el solicitante está al límite', async () => {
    const { useCase } = buildUseCase({ activeCount: 3 }) // 3 + 1 incoming > cap=3
    const result = await useCase.execute({
      orderId: '44444444-4444-4444-4444-444444444444',
      requesterDriverId: REQUESTER_DRIVER_ID,
    })
    expect(result.isFailure).toBe(true)
    if (!result.isFailure) return
    expect((result.error as DomainError).code).toBe('DRIVER_CAPACITY_EXCEEDED')
  })
})
