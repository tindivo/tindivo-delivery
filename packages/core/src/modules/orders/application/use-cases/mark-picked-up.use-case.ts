import type { DomainError } from '../../../../shared/errors/domain-error'
import { Result } from '../../../../shared/kernel/result'
import type { UseCase } from '../../../../shared/kernel/use-case'
import { OrderNotFound } from '../../domain/errors/order-errors'
import {
  type AssignmentRules,
  DEFAULT_ASSIGNMENT_RULES,
} from '../../domain/policies/assignment-rules'
import { OccupancySlots } from '../../domain/value-objects/occupancy-slots'
import { OrderId } from '../../domain/value-objects/order-id'
import type { AssignmentRulesRepository } from '../ports/assignment-rules.repository'
import type { Clock } from '../ports/clock'
import type { EventPublisher } from '../ports/event-publisher'
import type { OrderRepository } from '../ports/order.repository'

export type MarkPickedUpCommand = {
  orderId: string
  driverId: string
  occupancySlots: number
}

export type MarkPickedUpResult = {
  id: string
  status: string
  pickedUpAt: string
  deliveryMapsUrl: string | null
  trackingUrl: string
  occupancySlots: number
}

/**
 * Transición waiting_at_restaurant → picked_up. Asume que los datos del
 * cliente ya fueron persistidos via SaveCustomerDataUseCase; si faltan
 * (no hay phone, o no hay ni coords ni referencia textual), el dominio
 * retorna CustomerDataMissing y la UI debe redirigir al form.
 *
 * `deliveryMapsUrl` puede ser null cuando el driver guardó solo referencia
 * textual sin marcar coords — en ese caso la UI muestra la referencia
 * destacada en lugar del botón "Abrir en Google Maps".
 */
export class MarkPickedUpUseCase
  implements UseCase<MarkPickedUpCommand, MarkPickedUpResult, DomainError>
{
  constructor(
    private readonly orders: OrderRepository,
    private readonly events: EventPublisher,
    private readonly clock: Clock,
    private readonly publicAppUrl: string,
    private readonly assignmentRules?: AssignmentRulesRepository,
  ) {}

  async execute(cmd: MarkPickedUpCommand): Promise<Result<MarkPickedUpResult, DomainError>> {
    const order = await this.orders.findById(OrderId.of(cmd.orderId))
    if (!order) return Result.fail(new OrderNotFound(cmd.orderId))

    const rules = await this.loadRules()
    const slots = OccupancySlots.of(cmd.occupancySlots, rules.maxOccupancySlotsPerOrder)

    const previous = order.status
    const res = order.markPickedUp(slots, this.clock.now())
    if (res.isFailure) return Result.fail(res.error)

    await this.orders.save(order, previous)
    await this.events.publishAll(order.pullEvents())

    const coords = order.props.deliveryCoordinates
    const mapsUrl = coords
      ? `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}&travelmode=driving`
      : null
    const trackingUrl = `${this.publicAppUrl}/pedidos/${order.shortId.value}`

    return Result.ok({
      id: order.id.value,
      status: order.status.value,
      // biome-ignore lint/style/noNonNullAssertion: set by markPickedUp
      pickedUpAt: order.props.pickedUpAt!.toISOString(),
      deliveryMapsUrl: mapsUrl,
      trackingUrl,
      occupancySlots: order.occupancySlots.value,
    })
  }

  private async loadRules(): Promise<AssignmentRules> {
    if (!this.assignmentRules) return DEFAULT_ASSIGNMENT_RULES
    const stored = await this.assignmentRules.read().catch(() => null)
    return stored ?? DEFAULT_ASSIGNMENT_RULES
  }
}
