import { describe, expect, it, vi } from 'vitest'
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
import type {
  CreatePendingInput,
  TransferRequest,
  TransferRequestsRepository,
} from '../ports/transfer-requests.repository'
import { AutoAcceptExpiredTransferRequestsUseCase } from './auto-accept-expired-transfer-requests.use-case'

const RESTAURANT_ID = '11111111-1111-1111-1111-111111111111'
const OWNER_DRIVER_ID = '22222222-2222-2222-2222-222222222222'
const REQUESTER_DRIVER_ID = '33333333-3333-3333-3333-333333333333'
const OTHER_DRIVER_ID = '44444444-4444-4444-4444-444444444444'
const NOW = new Date('2026-05-15T18:00:00Z')

function fixedClock(): Clock {
  return { now: () => NOW }
}

function buildOrder(opts?: { driverId?: string | null }): Order {
  const result = Order.create({
    restaurantId: RestaurantId.of(RESTAURANT_ID),
    prepTime: PrepTime.of(20),
    payment: PaymentIntent.create('prepaid', Money.pen(20)),
    deliveryFee: Money.pen(5),
    now: NOW,
  })
  if (result.isFailure) throw new Error('order create failed')
  result.value.pullEvents()
  const driverId = opts?.driverId === null ? null : (opts?.driverId ?? OWNER_DRIVER_ID)
  if (driverId) {
    result.value.assignTo(DriverId.of(driverId), 'manual', NOW)
    result.value.pullEvents()
  }
  return result.value
}

function buildExpiredRequest(overrides?: Partial<TransferRequest>): TransferRequest {
  return {
    id: `tr-${Math.random().toString(36).slice(2, 8)}`,
    orderId: '44444444-4444-4444-4444-444444444444',
    fromDriverId: OWNER_DRIVER_ID,
    toDriverId: REQUESTER_DRIVER_ID,
    status: 'pending',
    createdAt: new Date(NOW.getTime() - 60_000),
    expiresAt: new Date(NOW.getTime() - 30_000),
    resolvedAt: null,
    ...overrides,
  }
}

function buildTransferRepo(expired: TransferRequest[]): TransferRequestsRepository & {
  markAcceptedMock: ReturnType<typeof vi.fn>
  markExpiredMock: ReturnType<typeof vi.fn>
  invalidateOthersMock: ReturnType<typeof vi.fn>
} {
  const markAcceptedMock = vi.fn()
  const markExpiredMock = vi.fn()
  const invalidateOthersMock = vi.fn()
  return {
    markAcceptedMock,
    markExpiredMock,
    invalidateOthersMock,
    findExpiredPending: async () => expired,
    findById: async (id: string) => expired.find((tr) => tr.id === id) ?? null,
    createPending: async (input: CreatePendingInput) => ({
      id: 'new-tr',
      orderId: input.orderId,
      fromDriverId: input.fromDriverId,
      toDriverId: input.toDriverId,
      status: 'pending',
      createdAt: NOW,
      expiresAt: new Date(NOW.getTime() + 30_000),
      resolvedAt: null,
    }),
    findPendingForOwner: async () => [],
    findPendingByRequester: async () => [],
    markAccepted: async (id, now) => {
      markAcceptedMock(id, now)
    },
    markRejected: async () => {},
    markExpired: async (id, now) => {
      markExpiredMock(id, now)
    },
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

function buildDeps(opts: {
  expired: TransferRequest[]
  ordersById: Map<string, Order | null>
  canServe?: boolean
  activeCount?: number
}) {
  const ordersRepo: OrderRepository = {
    findById: async (id) => opts.ordersById.get(id.value) ?? null,
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
  const driversRepo: DriverRepository = {
    findEligiblePeers: async () => [],
    findEligiblePeer: async () => null,
    canDriverServe: async () => opts.canServe ?? true,
  }
  const transferRepo = buildTransferRepo(opts.expired)
  const rulesRepo: AssignmentRulesRepository = {
    read: async () => DEFAULT_ASSIGNMENT_RULES,
    write: async () => ({ updatedAt: NOW.toISOString() }),
  }
  const publisher = buildPublisher()
  const useCase = new AutoAcceptExpiredTransferRequestsUseCase(
    ordersRepo,
    driversRepo,
    transferRepo,
    rulesRepo,
    publisher,
    fixedClock(),
  )
  return { useCase, transferRepo, publisher }
}

describe('AutoAcceptExpiredTransferRequestsUseCase', () => {
  it('happy path: transfiere y emite OrderTransferAutoAccepted', async () => {
    const order = buildOrder()
    const tr = buildExpiredRequest({ orderId: order.id.value })
    const { useCase, transferRepo, publisher } = buildDeps({
      expired: [tr],
      ordersById: new Map([[order.id.value, order]]),
    })

    const result = await useCase.execute({})
    expect(result.isSuccess).toBe(true)
    if (!result.isSuccess) return
    expect(result.value).toEqual({ processed: 1, accepted: 1, expired: 0 })

    expect(order.driverId?.value).toBe(REQUESTER_DRIVER_ID)
    expect(transferRepo.markAcceptedMock).toHaveBeenCalledWith(tr.id, NOW)
    expect(transferRepo.markExpiredMock).not.toHaveBeenCalled()
    expect(transferRepo.invalidateOthersMock).toHaveBeenCalledWith(order.id.value, tr.id, NOW)

    const types = publisher.collected.map((e) => e.eventType)
    expect(types).toContain('OrderReassigned')
    expect(types).toContain('OrderTransferAutoAccepted')
    expect(types).not.toContain('OrderTransferExpired')
  })

  it('cae a markExpired con reason=requester_capacity_exceeded si el solicitante está al límite', async () => {
    const order = buildOrder()
    const tr = buildExpiredRequest({ orderId: order.id.value })
    const { useCase, transferRepo, publisher } = buildDeps({
      expired: [tr],
      ordersById: new Map([[order.id.value, order]]),
      activeCount: 3,
    })

    const result = await useCase.execute({})
    expect(result.isSuccess).toBe(true)
    if (!result.isSuccess) return
    expect(result.value).toEqual({ processed: 1, accepted: 1 - 1, expired: 1 })

    expect(order.driverId?.value).toBe(OWNER_DRIVER_ID)
    expect(transferRepo.markExpiredMock).toHaveBeenCalledWith(tr.id, NOW)
    expect(transferRepo.markAcceptedMock).not.toHaveBeenCalled()

    const expiredEvent = publisher.collected.find((e) => e.eventType === 'OrderTransferExpired')
    expect(expiredEvent).toBeDefined()
    expect((expiredEvent as unknown as { payload: { reason: string } }).payload.reason).toBe(
      'requester_capacity_exceeded',
    )
  })

  it('cae a markExpired con reason=requester_not_authorized si admin lo desasignó', async () => {
    const order = buildOrder()
    const tr = buildExpiredRequest({ orderId: order.id.value })
    const { useCase, transferRepo, publisher } = buildDeps({
      expired: [tr],
      ordersById: new Map([[order.id.value, order]]),
      canServe: false,
    })

    const result = await useCase.execute({})
    expect(result.isSuccess).toBe(true)
    if (!result.isSuccess) return
    expect(result.value).toEqual({ processed: 1, accepted: 0, expired: 1 })
    expect(transferRepo.markExpiredMock).toHaveBeenCalledWith(tr.id, NOW)

    const expiredEvent = publisher.collected.find((e) => e.eventType === 'OrderTransferExpired')
    expect((expiredEvent as unknown as { payload: { reason: string } }).payload.reason).toBe(
      'requester_not_authorized',
    )
  })

  it('cae a markExpired con reason=order_already_transferred si el order cambió de driver', async () => {
    const order = buildOrder({ driverId: OTHER_DRIVER_ID })
    const tr = buildExpiredRequest({ orderId: order.id.value })
    const { useCase, transferRepo, publisher } = buildDeps({
      expired: [tr],
      ordersById: new Map([[order.id.value, order]]),
    })

    const result = await useCase.execute({})
    expect(result.isSuccess).toBe(true)
    if (!result.isSuccess) return
    expect(result.value).toEqual({ processed: 1, accepted: 0, expired: 1 })
    expect(transferRepo.markExpiredMock).toHaveBeenCalledWith(tr.id, NOW)

    const expiredEvent = publisher.collected.find((e) => e.eventType === 'OrderTransferExpired')
    expect((expiredEvent as unknown as { payload: { reason: string } }).payload.reason).toBe(
      'order_already_transferred',
    )
  })

  it('procesa un batch mixto sin que un fallo individual rompa los demás', async () => {
    const orderOk = buildOrder()
    const orderCapFail = buildOrder()
    const orderAuthzFail = buildOrder()

    // Para que capacity falle: aumentamos activeCount global a 3 → todos los
    // que pasen por la rama de capacidad fallarán. Pero el primero (orderOk)
    // también tendría capacidad llena. Para hacer mix real necesitamos
    // distintos activeCount por driver — el mock global no lo permite con
    // este helper. Verificamos en cambio mix por authz/order_already.
    const trOk = buildExpiredRequest({ id: 'tr-ok', orderId: orderOk.id.value })
    const trAuthz = buildExpiredRequest({
      id: 'tr-authz',
      orderId: orderAuthzFail.id.value,
      toDriverId: OTHER_DRIVER_ID,
    })
    const orderAlreadyTransferred = buildOrder({ driverId: OTHER_DRIVER_ID })
    const trOrderTaken = buildExpiredRequest({
      id: 'tr-taken',
      orderId: orderAlreadyTransferred.id.value,
    })

    // canServe controla el branch authz para TODOS; para forzar el fallo
    // de authz solo en uno, mejor cubrimos con escenarios separados.
    // Este test verifica el escenario más simple: 2 happy + 1 ya transferido.
    const order2 = buildOrder()
    const tr2 = buildExpiredRequest({ id: 'tr-ok2', orderId: order2.id.value })

    const { useCase, transferRepo, publisher } = buildDeps({
      expired: [trOk, tr2, trOrderTaken],
      ordersById: new Map<string, Order | null>([
        [orderOk.id.value, orderOk],
        [order2.id.value, order2],
        [orderAlreadyTransferred.id.value, orderAlreadyTransferred],
      ]),
    })

    const result = await useCase.execute({})
    expect(result.isSuccess).toBe(true)
    if (!result.isSuccess) return
    expect(result.value).toEqual({ processed: 3, accepted: 2, expired: 1 })

    expect(transferRepo.markAcceptedMock).toHaveBeenCalledTimes(2)
    expect(transferRepo.markExpiredMock).toHaveBeenCalledTimes(1)
    expect(transferRepo.markExpiredMock).toHaveBeenCalledWith('tr-taken', NOW)

    const autoAccepted = publisher.collected.filter(
      (e) => e.eventType === 'OrderTransferAutoAccepted',
    )
    expect(autoAccepted).toHaveLength(2)
    const expiredEvents = publisher.collected.filter((e) => e.eventType === 'OrderTransferExpired')
    expect(expiredEvents).toHaveLength(1)
  })

  it('lista vacía: no hace nada y devuelve counters en cero', async () => {
    const { useCase, transferRepo, publisher } = buildDeps({
      expired: [],
      ordersById: new Map(),
    })

    const result = await useCase.execute({})
    expect(result.isSuccess).toBe(true)
    if (!result.isSuccess) return
    expect(result.value).toEqual({ processed: 0, accepted: 0, expired: 0 })
    expect(transferRepo.markAcceptedMock).not.toHaveBeenCalled()
    expect(transferRepo.markExpiredMock).not.toHaveBeenCalled()
    expect(publisher.collected).toHaveLength(0)
  })
})
