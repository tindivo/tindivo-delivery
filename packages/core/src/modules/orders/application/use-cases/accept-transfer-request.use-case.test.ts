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
import { AcceptTransferRequestUseCase } from './accept-transfer-request.use-case'

const RESTAURANT_ID = '11111111-1111-1111-1111-111111111111'
const OWNER_DRIVER_ID = '22222222-2222-2222-2222-222222222222'
const REQUESTER_DRIVER_ID = '33333333-3333-3333-3333-333333333333'
const TRANSFER_REQUEST_ID = 'tr-1'
const ORDER_ID = '44444444-4444-4444-4444-444444444444'
const NOW = new Date('2026-05-15T18:00:00Z')

function fixedClock(): Clock {
  return { now: () => NOW }
}

function buildOrder(opts?: {
  status?: 'waiting_driver' | 'heading_to_restaurant'
  driverId?: string | null
}): Order {
  const result = Order.create({
    restaurantId: RestaurantId.of(RESTAURANT_ID),
    prepTime: PrepTime.of(20),
    payment: PaymentIntent.create('prepaid', Money.pen(20)),
    baseCommission: Money.pen(5),
    farSurchargeAmount: Money.pen(0.5),
    now: NOW,
  })
  if (result.isFailure) throw new Error('order create failed')
  result.value.pullEvents()
  const driverId = opts?.driverId === null ? null : (opts?.driverId ?? OWNER_DRIVER_ID)
  if (driverId) {
    result.value.assignTo(DriverId.of(driverId), 'manual', NOW)
    result.value.pullEvents()
  }
  if (opts?.status === 'heading_to_restaurant' && driverId) {
    result.value.acceptBy(DriverId.of(driverId), 0, 3, NOW)
    result.value.pullEvents()
  }
  return result.value
}

function buildTransferRepo(opts?: {
  request?: Awaited<ReturnType<TransferRequestsRepository['findById']>>
}): TransferRequestsRepository & {
  markAcceptedMock: ReturnType<typeof vi.fn>
  invalidateOthersMock: ReturnType<typeof vi.fn>
} {
  const markAcceptedMock = vi.fn()
  const invalidateOthersMock = vi.fn()
  const defaultRequest = {
    id: TRANSFER_REQUEST_ID,
    orderId: ORDER_ID,
    fromDriverId: OWNER_DRIVER_ID,
    toDriverId: REQUESTER_DRIVER_ID,
    status: 'pending' as const,
    createdAt: NOW,
    expiresAt: new Date(NOW.getTime() + 30_000),
    resolvedAt: null,
  }
  return {
    markAcceptedMock,
    invalidateOthersMock,
    findById: async () => (opts?.request === undefined ? defaultRequest : opts.request),
    createPending: async () => defaultRequest,
    findPendingForOwner: async () => [],
    findPendingByRequester: async () => [],
    findExpiredPending: async () => [],
    markAccepted: async (id, now) => {
      markAcceptedMock(id, now)
    },
    markRejected: async () => {},
    markExpired: async () => {},
    invalidateOtherPendingForOrder: async (orderId, exceptId, now) => {
      invalidateOthersMock(orderId, exceptId, now)
    },
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

function buildDeps(overrides?: {
  order?: Order | null
  request?: Awaited<ReturnType<TransferRequestsRepository['findById']>>
  canServe?: boolean
  activeCount?: number
}) {
  const order = overrides?.order === undefined ? buildOrder() : overrides.order
  const ordersRepo: OrderRepository = {
    findById: async () => order,
    save: async () => {},
    saveAutoAssignment: async () => {},
    insert: async () => {},
    countActiveByDriver: async () => overrides?.activeCount ?? 0,
    findAssignmentCandidates: async () => [],
    findAvailable: async () => [],
    findByRestaurant: async () => [],
    findByDriver: async () => [],
    claimUrgent: async () => false,
  }
  const driversRepo: DriverRepository = {
    findEligiblePeers: async () => [],
    findEligiblePeer: async () => null,
    canDriverServe: async () => overrides?.canServe ?? true,
  }
  const transferRepo = buildTransferRepo({ request: overrides?.request })
  const rulesRepo: AssignmentRulesRepository = {
    read: async () => DEFAULT_ASSIGNMENT_RULES,
    write: async () => ({ updatedAt: NOW.toISOString() }),
  }
  const publisher = buildPublisher()
  const useCase = new AcceptTransferRequestUseCase(
    ordersRepo,
    driversRepo,
    transferRepo,
    rulesRepo,
    publisher,
    fixedClock(),
  )
  return { useCase, order, transferRepo, publisher }
}

describe('AcceptTransferRequestUseCase', () => {
  it('acepta transferencia sobre pedido pre-asignado (waiting_driver)', async () => {
    // Caso del bug encontrado en E2E: order en waiting_driver con driver A.
    // Antes del fix de Order.reassignTo, fallaba con INVALID_STATE_TRANSITION.
    const { useCase, order, transferRepo, publisher } = buildDeps()
    if (!order) throw new Error('order required')
    const result = await useCase.execute({
      transferRequestId: TRANSFER_REQUEST_ID,
      ownerDriverId: OWNER_DRIVER_ID,
    })
    expect(result.isSuccess).toBe(true)
    if (!result.isSuccess) return
    expect(order.driverId?.value).toBe(REQUESTER_DRIVER_ID)
    expect(order.status.value).toBe('waiting_driver')
    expect(transferRepo.markAcceptedMock).toHaveBeenCalledWith(TRANSFER_REQUEST_ID, NOW)
    expect(transferRepo.invalidateOthersMock).toHaveBeenCalledWith(
      order.id.value,
      TRANSFER_REQUEST_ID,
      NOW,
    )
    const types = publisher.collected.map((e) => e.eventType)
    expect(types).toContain('OrderReassigned')
    expect(types).toContain('OrderTransferAccepted')
  })

  it('acepta transferencia sobre pedido en heading_to_restaurant', async () => {
    const order = buildOrder({ status: 'heading_to_restaurant' })
    const { useCase, publisher } = buildDeps({ order })
    const result = await useCase.execute({
      transferRequestId: TRANSFER_REQUEST_ID,
      ownerDriverId: OWNER_DRIVER_ID,
    })
    expect(result.isSuccess).toBe(true)
    if (!result.isSuccess) return
    expect(order.driverId?.value).toBe(REQUESTER_DRIVER_ID)
    expect(order.status.value).toBe('heading_to_restaurant')
    expect(publisher.collected.map((e) => e.eventType)).toContain('OrderTransferAccepted')
  })

  it('falla TRANSFER_REQUEST_NOT_FOUND si la solicitud no existe', async () => {
    const { useCase } = buildDeps({ request: null })
    const result = await useCase.execute({
      transferRequestId: TRANSFER_REQUEST_ID,
      ownerDriverId: OWNER_DRIVER_ID,
    })
    expect(result.isFailure).toBe(true)
    if (!result.isFailure) return
    expect((result.error as DomainError).code).toBe('TRANSFER_REQUEST_NOT_FOUND')
  })

  it('falla TRANSFER_REQUEST_NOT_FOUND si el ownerDriverId no coincide (anti-leak)', async () => {
    const { useCase } = buildDeps()
    const result = await useCase.execute({
      transferRequestId: TRANSFER_REQUEST_ID,
      ownerDriverId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    })
    expect(result.isFailure).toBe(true)
    if (!result.isFailure) return
    expect((result.error as DomainError).code).toBe('TRANSFER_REQUEST_NOT_FOUND')
  })

  it('falla TRANSFER_REQUEST_EXPIRED si expires_at <= now', async () => {
    const expired = {
      id: TRANSFER_REQUEST_ID,
      orderId: ORDER_ID,
      fromDriverId: OWNER_DRIVER_ID,
      toDriverId: REQUESTER_DRIVER_ID,
      status: 'pending' as const,
      createdAt: new Date(NOW.getTime() - 60_000),
      expiresAt: new Date(NOW.getTime() - 1_000),
      resolvedAt: null,
    }
    const { useCase } = buildDeps({ request: expired })
    const result = await useCase.execute({
      transferRequestId: TRANSFER_REQUEST_ID,
      ownerDriverId: OWNER_DRIVER_ID,
    })
    expect(result.isFailure).toBe(true)
    if (!result.isFailure) return
    expect((result.error as DomainError).code).toBe('TRANSFER_REQUEST_EXPIRED')
  })

  it('falla ORDER_ALREADY_TRANSFERRED si el order cambió de driver entre request y accept', async () => {
    const order = buildOrder({ driverId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' })
    const { useCase } = buildDeps({ order })
    const result = await useCase.execute({
      transferRequestId: TRANSFER_REQUEST_ID,
      ownerDriverId: OWNER_DRIVER_ID,
    })
    expect(result.isFailure).toBe(true)
    if (!result.isFailure) return
    expect((result.error as DomainError).code).toBe('ORDER_ALREADY_TRANSFERRED')
  })

  it('falla DRIVER_CAPACITY_EXCEEDED si el solicitante ya está al límite', async () => {
    const { useCase } = buildDeps({ activeCount: 3 })
    const result = await useCase.execute({
      transferRequestId: TRANSFER_REQUEST_ID,
      ownerDriverId: OWNER_DRIVER_ID,
    })
    expect(result.isFailure).toBe(true)
    if (!result.isFailure) return
    expect((result.error as DomainError).code).toBe('DRIVER_CAPACITY_EXCEEDED')
  })
})
