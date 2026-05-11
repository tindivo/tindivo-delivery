import type { DomainError } from '../../../../shared/errors/domain-error'
import { Result } from '../../../../shared/kernel/result'
import type { UseCase } from '../../../../shared/kernel/use-case'
import { OrderTransferAutoAccepted, OrderTransferExpired } from '../../domain/events/order-events'
import {
  type AssignmentRules,
  DEFAULT_ASSIGNMENT_RULES,
} from '../../domain/policies/assignment-rules'
import { DriverId } from '../../domain/value-objects/driver-id'
import { OrderId } from '../../domain/value-objects/order-id'
import type { AssignmentRulesRepository } from '../ports/assignment-rules.repository'
import type { Clock } from '../ports/clock'
import type { DriverRepository } from '../ports/driver.repository'
import type { EventPublisher } from '../ports/event-publisher'
import type { OrderRepository } from '../ports/order.repository'
import type { TransferRequest } from '../ports/transfer-requests.repository'
import type { TransferRequestsRepository } from '../ports/transfer-requests.repository'

export type AutoAcceptExpiredTransferRequestsCommand = {
  /** Tope de filas a procesar por corrida (default 50). */
  limit?: number
}

export type AutoAcceptExpiredTransferRequestsResult = {
  /** Total de solicitudes vencidas evaluadas. */
  processed: number
  /** Cuántas terminaron en transferencia exitosa (markAccepted). */
  accepted: number
  /** Cuántas cayeron al fallback markExpired (solicitante inelegible o pedido ya transferido). */
  expired: number
}

type ExpiredReason =
  | 'requester_capacity_exceeded'
  | 'requester_not_authorized'
  | 'order_already_transferred'

/**
 * Batch invocado por el cron `process-expired-transfer-requests` (cada 1 min)
 * vía endpoint interno `/api/v1/internal/transfer-requests/process-expired`.
 *
 * Por cada solicitud `pending` con `expires_at < now`, ejecuta la misma cadena
 * que `AcceptTransferRequestUseCase` (pero sin chequear `expires_at`, que ya
 * sabemos vencido):
 *   - Re-valida que el order siga con el dueño original.
 *   - Re-valida capacidad R3 del solicitante.
 *   - Re-valida autorización al restaurante.
 * Si todo OK → `order.reassignTo()` + `markAccepted` + `invalidateOthers` +
 * eventos (`OrderReassigned` del agregado + `OrderTransferAutoAccepted`).
 * Si alguna validación falla → `markExpired` + `OrderTransferExpired` con
 * `reason` para que el push al solicitante explique por qué no calificó.
 *
 * Error handling: cada solicitud va en su propio try/catch. Una falla aislada
 * no interrumpe el procesamiento de las demás (el use case devuelve counters
 * para observabilidad y nunca falla a nivel de batch salvo error de listado).
 */
export class AutoAcceptExpiredTransferRequestsUseCase
  implements
    UseCase<
      AutoAcceptExpiredTransferRequestsCommand,
      AutoAcceptExpiredTransferRequestsResult,
      DomainError
    >
{
  constructor(
    private readonly orders: OrderRepository,
    private readonly drivers: DriverRepository,
    private readonly transferRequests: TransferRequestsRepository,
    private readonly assignmentRules: AssignmentRulesRepository,
    private readonly events: EventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(
    cmd: AutoAcceptExpiredTransferRequestsCommand,
  ): Promise<Result<AutoAcceptExpiredTransferRequestsResult, DomainError>> {
    const now = this.clock.now()
    const expired = await this.transferRequests.findExpiredPending(now, cmd.limit ?? 50)

    let accepted = 0
    let expiredCount = 0

    for (const tr of expired) {
      try {
        const outcome = await this.processOne(tr, now)
        if (outcome === 'accepted') accepted++
        else expiredCount++
      } catch {
        // Un error inesperado en una sola solicitud (ej: race condition,
        // persistencia transitoria) no debe interrumpir el batch. La solicitud
        // queda en `pending` y el próximo tick del cron la recogerá. Si el
        // problema persiste, el failsafe `expire-transfer-requests-failsafe`
        // (cada 5 min) la marcará como `expired` sin transferir.
      }
    }

    return Result.ok({
      processed: expired.length,
      accepted,
      expired: expiredCount,
    })
  }

  private async processOne(tr: TransferRequest, now: Date): Promise<'accepted' | 'expired'> {
    const order = await this.orders.findById(OrderId.of(tr.orderId))
    if (!order) {
      await this.markExpired(tr, now, 'order_already_transferred')
      return 'expired'
    }

    if (!order.driverId || order.driverId.value !== tr.fromDriverId) {
      await this.markExpired(tr, now, 'order_already_transferred')
      return 'expired'
    }

    const requesterId = DriverId.of(tr.toDriverId)
    const activeCount = await this.orders.countActiveByDriver(requesterId)
    const rules = await this.loadRules()
    const incoming = order.occupancySlots.value
    if (activeCount + incoming > rules.maxOrdersPerDriver) {
      await this.markExpired(tr, now, 'requester_capacity_exceeded')
      return 'expired'
    }

    const authorized = await this.drivers.canDriverServe(tr.toDriverId, order.restaurantId.value)
    if (!authorized) {
      await this.markExpired(tr, now, 'requester_not_authorized')
      return 'expired'
    }

    const previousStatus = order.status
    const reassigned = order.reassignTo(requesterId, 'transfer_request_auto_accepted', now)
    if (reassigned.isFailure) {
      // reassignTo solo falla por estado terminal del pedido (delivered,
      // cancelled). Tratarlo como "ya no transferible" en lugar de propagar.
      await this.markExpired(tr, now, 'order_already_transferred')
      return 'expired'
    }

    await this.orders.save(order, previousStatus)
    await this.transferRequests.markAccepted(tr.id, now)
    await this.transferRequests.invalidateOtherPendingForOrder(order.id.value, tr.id, now)

    const aggregateEvents = order.pullEvents()
    await this.events.publishAll([
      ...aggregateEvents,
      new OrderTransferAutoAccepted({
        transferRequestId: tr.id,
        orderId: order.id.value,
        shortId: order.shortId.value,
        fromDriverId: tr.fromDriverId,
        toDriverId: tr.toDriverId,
        acceptedAt: now.toISOString(),
      }),
    ])
    return 'accepted'
  }

  private async markExpired(tr: TransferRequest, now: Date, reason: ExpiredReason): Promise<void> {
    await this.transferRequests.markExpired(tr.id, now)
    // Necesitamos shortId para enriquecer el push. Si la order ya no existe
    // (cascade delete improbable), usamos '' — el evento sigue siendo válido.
    const order = await this.orders.findById(OrderId.of(tr.orderId)).catch(() => null)
    await this.events.publishAll([
      new OrderTransferExpired({
        transferRequestId: tr.id,
        orderId: tr.orderId,
        shortId: order?.shortId.value ?? '',
        fromDriverId: tr.fromDriverId,
        toDriverId: tr.toDriverId,
        expiredAt: now.toISOString(),
        reason,
      }),
    ])
  }

  private async loadRules(): Promise<AssignmentRules> {
    const stored = await this.assignmentRules.read().catch(() => null)
    return stored ?? DEFAULT_ASSIGNMENT_RULES
  }
}
