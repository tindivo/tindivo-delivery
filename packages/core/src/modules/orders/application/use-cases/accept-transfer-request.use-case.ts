import type { DomainError } from '../../../../shared/errors/domain-error'
import { Result } from '../../../../shared/kernel/result'
import type { UseCase } from '../../../../shared/kernel/use-case'
import {
  DriverCapacityExceeded,
  OrderAlreadyTransferred,
  OrderNotFound,
  TransferRequestExpired,
  TransferRequestNotFound,
  TransferRequestNotPending,
} from '../../domain/errors/order-errors'
import { OrderTransferAccepted } from '../../domain/events/order-events'
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
import type { TransferRequestsRepository } from '../ports/transfer-requests.repository'

export type AcceptTransferRequestCommand = {
  transferRequestId: string
  /** Driver que ACEPTA (= dueño actual = from_driver_id en BD) */
  ownerDriverId: string
}

export type AcceptTransferRequestResult = {
  id: string // order id
  status: string
  newDriverId: string
  acceptedAt: string
}

/**
 * Driver A (dueño) acepta la solicitud de Driver B. Reusa Order.reassignTo()
 * para hacer la transferencia atómica + emite eventos. Las otras solicitudes
 * pending del mismo pedido se marcan como rejected (carecen de sentido tras
 * el cambio de dueño).
 *
 * Validaciones defensivas (los 30s desde el request pueden cambiar el estado):
 *  - Solicitud existe y pertenece al ownerDriverId (no leak de IDs ajenos)
 *  - Solicitud está pending (no ya accepted/rejected/expired)
 *  - Solicitud no expiró (expires_at > now)
 *  - Order sigue teniendo al ownerDriverId como driver_id (sino otro driver
 *    la transfirió a alguien más en el ínterin → ORDER_ALREADY_TRANSFERRED)
 *  - Capacidad R3 del solicitante sigue OK (puede haber tomado otros pedidos)
 */
export class AcceptTransferRequestUseCase
  implements UseCase<AcceptTransferRequestCommand, AcceptTransferRequestResult, DomainError>
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
    cmd: AcceptTransferRequestCommand,
  ): Promise<Result<AcceptTransferRequestResult, DomainError>> {
    const tr = await this.transferRequests.findById(cmd.transferRequestId)
    if (!tr || tr.fromDriverId !== cmd.ownerDriverId) {
      // Si no es del owner, no leak: retornar NotFound igual.
      return Result.fail(new TransferRequestNotFound(cmd.transferRequestId))
    }
    if (tr.status !== 'pending') return Result.fail(new TransferRequestNotPending())

    const now = this.clock.now()
    if (tr.expiresAt.getTime() <= now.getTime()) return Result.fail(new TransferRequestExpired())

    const order = await this.orders.findById(OrderId.of(tr.orderId))
    if (!order) return Result.fail(new OrderNotFound(tr.orderId))

    // El order pudo haber sido transferido a OTRO driver entre que se creó
    // la solicitud y este accept (caso raro pero posible si A ya había pasado
    // el pedido manualmente — aunque transfer manual ya no existe en PR4,
    // es defensa en profundidad).
    if (!order.driverId || order.driverId.value !== cmd.ownerDriverId)
      return Result.fail(new OrderAlreadyTransferred())

    // Re-validar capacidad del solicitante (pudo haber tomado otros pedidos
    // en los 30s desde la solicitud).
    const requesterId = DriverId.of(tr.toDriverId)
    const activeCount = await this.orders.countActiveByDriver(requesterId)
    const rules = await this.loadRules()
    const incoming = order.occupancySlots.value
    if (activeCount + incoming > rules.maxOrdersPerDriver)
      return Result.fail(new DriverCapacityExceeded())

    // Re-validar driver_restaurants del solicitante (admin podría haberlo
    // desasignado del restaurante en los 30s — improbable pero defensa).
    const authorized = await this.drivers.canDriverServe(tr.toDriverId, order.restaurantId.value)
    if (!authorized)
      // Si pasa esto, el solicitante ya no puede recibir el pedido. Marcamos
      // como rejected y devolvemos error específico (UI mostrará aviso al owner).
      return Result.fail(new OrderAlreadyTransferred())

    // Reassign atómico. reassignTo emite OrderReassigned. previousStatus
    // se necesita para el optimistic lock del save.
    const previousStatus = order.status
    const reassigned = order.reassignTo(requesterId, 'transfer_request_accepted', now)
    if (reassigned.isFailure) return Result.fail(reassigned.error)

    await this.orders.save(order, previousStatus)
    await this.transferRequests.markAccepted(tr.id, now)
    // Otras solicitudes pending del mismo pedido (ej: driver C también lo
    // pidió) se invalidan en cadena. UI de C verá la solicitud desaparecer
    // vía Realtime + push opcional (por ahora silencioso para no spammear).
    await this.transferRequests.invalidateOtherPendingForOrder(order.id.value, tr.id, now)

    // Acumulamos OrderTransferAccepted al pull de eventos del agregado para
    // que se publiquen JUNTO con OrderReassigned (mismo INSERT batch en
    // domain_events). Push notifications van solo al solicitante.
    const aggregateEvents = order.pullEvents()
    await this.events.publishAll([
      ...aggregateEvents,
      new OrderTransferAccepted({
        transferRequestId: tr.id,
        orderId: order.id.value,
        shortId: order.shortId.value,
        fromDriverId: cmd.ownerDriverId,
        toDriverId: tr.toDriverId,
        acceptedAt: now.toISOString(),
      }),
    ])

    return Result.ok({
      id: order.id.value,
      status: order.status.value,
      newDriverId: tr.toDriverId,
      acceptedAt: now.toISOString(),
    })
  }

  private async loadRules(): Promise<AssignmentRules> {
    const stored = await this.assignmentRules.read().catch(() => null)
    return stored ?? DEFAULT_ASSIGNMENT_RULES
  }
}
