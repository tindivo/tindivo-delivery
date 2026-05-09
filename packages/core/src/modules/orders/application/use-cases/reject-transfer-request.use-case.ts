import type { DomainError } from '../../../../shared/errors/domain-error'
import { Result } from '../../../../shared/kernel/result'
import type { UseCase } from '../../../../shared/kernel/use-case'
import {
  TransferRequestExpired,
  TransferRequestNotFound,
  TransferRequestNotPending,
} from '../../domain/errors/order-errors'
import { OrderTransferRejected } from '../../domain/events/order-events'
import { OrderId } from '../../domain/value-objects/order-id'
import type { Clock } from '../ports/clock'
import type { EventPublisher } from '../ports/event-publisher'
import type { OrderRepository } from '../ports/order.repository'
import type { TransferRequestsRepository } from '../ports/transfer-requests.repository'

export type RejectTransferRequestCommand = {
  transferRequestId: string
  /** Driver que RECHAZA (= dueño actual = from_driver_id en BD) */
  ownerDriverId: string
}

export type RejectTransferRequestResult = {
  id: string
  status: 'rejected'
}

/**
 * Driver A (dueño) rechaza explícitamente la solicitud de Driver B. El pedido
 * NO cambia de dueño. B recibe push para que busque otro pedido.
 *
 * Validaciones idénticas al accept (existencia, ownership, pending, no
 * expirada). El cron expire_pending_transfer_requests barre las que A nunca
 * respondió — esto es solo para rechazo manual antes del timeout.
 */
export class RejectTransferRequestUseCase
  implements UseCase<RejectTransferRequestCommand, RejectTransferRequestResult, DomainError>
{
  constructor(
    private readonly orders: OrderRepository,
    private readonly transferRequests: TransferRequestsRepository,
    private readonly events: EventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(
    cmd: RejectTransferRequestCommand,
  ): Promise<Result<RejectTransferRequestResult, DomainError>> {
    const tr = await this.transferRequests.findById(cmd.transferRequestId)
    if (!tr || tr.fromDriverId !== cmd.ownerDriverId) {
      return Result.fail(new TransferRequestNotFound(cmd.transferRequestId))
    }
    if (tr.status !== 'pending') return Result.fail(new TransferRequestNotPending())

    const now = this.clock.now()
    if (tr.expiresAt.getTime() <= now.getTime())
      return Result.fail(new TransferRequestExpired())

    await this.transferRequests.markRejected(tr.id, now)

    // El order es necesario solo para enriquecer el evento con shortId.
    // Si la order desapareció (cascade delete improbable), seguimos con shortId
    // vacío — el evento aún sirve para auditoría.
    const order = await this.orders.findById(OrderId.of(tr.orderId))

    await this.events.publishAll([
      new OrderTransferRejected({
        transferRequestId: tr.id,
        orderId: tr.orderId,
        shortId: order?.shortId.value ?? '',
        fromDriverId: cmd.ownerDriverId,
        toDriverId: tr.toDriverId,
        rejectedAt: now.toISOString(),
      }),
    ])

    return Result.ok({ id: tr.id, status: 'rejected' })
  }
}
