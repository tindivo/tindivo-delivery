import type { DomainError } from '../../../../shared/errors/domain-error'
import { Result } from '../../../../shared/kernel/result'
import type { UseCase } from '../../../../shared/kernel/use-case'
import {
  type AssignmentRules,
  DEFAULT_ASSIGNMENT_RULES,
} from '../../domain/policies/assignment-rules'
import { DriverAssignmentPolicy } from '../../domain/policies/driver-assignment.policy'
import { DriverId } from '../../domain/value-objects/driver-id'
import { OrderId } from '../../domain/value-objects/order-id'
import { OrderStatus } from '../../domain/value-objects/order-status'
import type { AssignmentRulesRepository } from '../ports/assignment-rules.repository'
import type { Clock } from '../ports/clock'
import type { EventPublisher } from '../ports/event-publisher'
import type { OrderRepository } from '../ports/order.repository'
import type { RejectionsRepository } from '../ports/rejections.repository'

export type AutoAssignOrderCommand = {
  orderId: string
}

export type AutoAssignOrderResult = {
  assigned: boolean
  driverId: string | null
  activated: boolean
  reason: string | null
}

export class AutoAssignOrderUseCase
  implements UseCase<AutoAssignOrderCommand, AutoAssignOrderResult, DomainError>
{
  constructor(
    private readonly orders: OrderRepository,
    private readonly assignmentRules: AssignmentRulesRepository,
    private readonly events: EventPublisher,
    private readonly clock: Clock,
    private readonly rejections?: RejectionsRepository,
  ) {}

  async execute(cmd: AutoAssignOrderCommand): Promise<Result<AutoAssignOrderResult, DomainError>> {
    const orderId = OrderId.of(cmd.orderId)
    const order = await this.orders.findById(orderId)

    if (!order || order.status.value !== 'waiting_driver' || order.driverId) {
      return Result.ok({ assigned: false, driverId: null, activated: false, reason: null })
    }

    const now = this.clock.now()

    // Asignación diferida: si el pedido todavía no entra en la ventana de
    // bandeja (10 min antes de estar listo), no fijamos driver. El cron
    // `assign-pending-orders` reintentará cada minuto y asignará en cuanto
    // appears_in_queue_at <= now(). Esto libera capacidad de los drivers
    // para tomar pedidos que sí están entrando ahora en lugar de quedar
    // "reservados" 20-30 min mientras la comida aún no se prepara.
    if (order.appearsInQueueAt.getTime() > now.getTime()) {
      return Result.ok({
        assigned: false,
        driverId: null,
        activated: false,
        reason: 'deferred_until_queue_window',
      })
    }

    const rules = await this.loadRules()

    // Excluye drivers que ya rechazaron este pedido específico, así el cron
    // no se lo vuelve a asignar a quien dijo "no". Si el repo de rechazos
    // no fue inyectado (composición legacy), tratamos como lista vacía.
    const excludedDriverIds = this.rejections
      ? await this.rejections.findRejectedDriverIds(cmd.orderId)
      : []

    const candidates = await this.orders.findAssignmentCandidates({
      restaurantId: order.restaurantId.value,
      estimatedReadyAt: order.estimatedReadyAt,
      now,
      todayStart: startOfLimaDay(now),
      groupingWindowMinutes: rules.groupingWindowMinutes,
      excludedDriverIds,
    })

    const decision = DriverAssignmentPolicy.choose(
      { restaurantId: order.restaurantId.value },
      candidates,
      rules,
    )
    if (!decision) {
      return Result.ok({ assigned: false, driverId: null, activated: false, reason: null })
    }

    // Solo asignamos driver_id (estado 2: "Asignado a ti"). El pedido sigue
    // en `waiting_driver` con `acceptedAt=null`. El driver ve el pedido en
    // su lista "Mis pedidos" con un botón "Aceptar"; al presionarlo el
    // endpoint /driver/orders/:id/accept invoca `acceptBy` y transiciona
    // a `heading_to_restaurant` (estado 3). De este modo respetamos el
    // estado intermedio del modelo de negocio.
    const driverId = DriverId.of(decision.driverId)
    const assigned = order.assignTo(driverId, decision.reason, now)
    if (assigned.isFailure) return Result.fail(assigned.error)

    await this.orders.saveAutoAssignment(order, OrderStatus.waitingDriver())
    await this.events.publishAll(order.pullEvents())

    return Result.ok({
      assigned: true,
      driverId: decision.driverId,
      activated: false,
      reason: decision.reason,
    })
  }

  private async loadRules(): Promise<AssignmentRules> {
    const stored = await this.assignmentRules.read().catch(() => null)
    return stored ?? DEFAULT_ASSIGNMENT_RULES
  }
}

function startOfLimaDay(date: Date): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '01'
  return new Date(`${get('year')}-${get('month')}-${get('day')}T00:00:00-05:00`)
}
