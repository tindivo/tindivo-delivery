import type { DomainError } from '../../../../shared/errors/domain-error'
import { Result } from '../../../../shared/kernel/result'
import type { UseCase } from '../../../../shared/kernel/use-case'
import { OrderNotFound } from '../../domain/errors/order-errors'
import { DriverId } from '../../domain/value-objects/driver-id'
import { OrderId } from '../../domain/value-objects/order-id'
import { OrderStatus } from '../../domain/value-objects/order-status'
import type { Clock } from '../ports/clock'
import type { EventPublisher } from '../ports/event-publisher'
import type { OrderRepository } from '../ports/order.repository'
import type { RejectionsRepository } from '../ports/rejections.repository'

export type RejectOrderAssignmentCommand = {
  orderId: string
  driverId: string
  reason: string
}

export type RejectOrderAssignmentResult = {
  id: string
  status: string
  rejectedAt: string
}

/**
 * El driver rechaza una asignación que le hizo el cron AutoAssign. El pedido
 * vuelve a `driver_id=NULL` y se registra el rechazo para que el cron lo
 * excluya en próximas rondas (vía RejectionsRepository).
 *
 * Orden de operaciones:
 *  1. Mutar agregado y persistir con optimistic concurrency (status=waiting_driver).
 *  2. Insertar fila en order_assignment_rejections.
 *  3. Publicar evento OrderAssignmentRejected.
 *
 * Si el paso 2 falla después del 1, el pedido queda con driver_id=NULL pero
 * sin rechazo registrado. El cron podría re-asignarle al mismo driver — el
 * driver podría volver a rechazar (idempotente). Aceptable como degraded mode.
 */
export class RejectOrderAssignmentUseCase
  implements UseCase<RejectOrderAssignmentCommand, RejectOrderAssignmentResult, DomainError>
{
  constructor(
    private readonly orders: OrderRepository,
    private readonly rejections: RejectionsRepository,
    private readonly events: EventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(
    cmd: RejectOrderAssignmentCommand,
  ): Promise<Result<RejectOrderAssignmentResult, DomainError>> {
    const order = await this.orders.findById(OrderId.of(cmd.orderId))
    if (!order) return Result.fail(new OrderNotFound(cmd.orderId))

    const now = this.clock.now()
    const driverId = DriverId.of(cmd.driverId)

    const result = order.rejectAssignment(driverId, cmd.reason, now)
    if (result.isFailure) return Result.fail(result.error)

    await this.orders.save(order, OrderStatus.waitingDriver())
    await this.rejections.recordRejection(cmd.orderId, cmd.driverId, cmd.reason, now)
    await this.events.publishAll(order.pullEvents())

    return Result.ok({
      id: order.id.value,
      status: order.status.value,
      rejectedAt: now.toISOString(),
    })
  }
}
