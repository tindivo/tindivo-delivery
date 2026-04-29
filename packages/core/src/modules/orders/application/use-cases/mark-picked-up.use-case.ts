import type { DomainError } from '../../../../shared/errors/domain-error'
import { Result } from '../../../../shared/kernel/result'
import type { UseCase } from '../../../../shared/kernel/use-case'
import { OrderNotFound } from '../../domain/errors/order-errors'
import { OrderId } from '../../domain/value-objects/order-id'
import type { Clock } from '../ports/clock'
import type { EventPublisher } from '../ports/event-publisher'
import type { OrderRepository } from '../ports/order.repository'

export type MarkPickedUpCommand = {
  orderId: string
  driverId: string
}

export type MarkPickedUpResult = {
  id: string
  status: string
  pickedUpAt: string
  deliveryMapsUrl: string
  trackingUrl: string
}

/**
 * Transición waiting_at_restaurant → picked_up. Asume que los datos del
 * cliente ya fueron persistidos via SaveCustomerDataUseCase; si faltan, el
 * dominio retorna CustomerDataMissing y la UI debe redirigir al form.
 */
export class MarkPickedUpUseCase
  implements UseCase<MarkPickedUpCommand, MarkPickedUpResult, DomainError>
{
  constructor(
    private readonly orders: OrderRepository,
    private readonly events: EventPublisher,
    private readonly clock: Clock,
    private readonly publicAppUrl: string,
  ) {}

  async execute(cmd: MarkPickedUpCommand): Promise<Result<MarkPickedUpResult, DomainError>> {
    const order = await this.orders.findById(OrderId.of(cmd.orderId))
    if (!order) return Result.fail(new OrderNotFound(cmd.orderId))

    const previous = order.status
    const res = order.markPickedUp(this.clock.now())
    if (res.isFailure) return Result.fail(res.error)

    await this.orders.save(order, previous)
    await this.events.publishAll(order.pullEvents())

    const coords = order.props.deliveryCoordinates
    // biome-ignore lint/style/noNonNullAssertion: validated by markPickedUp guard
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${coords!.lat},${coords!.lng}&travelmode=driving`
    const trackingUrl = `${this.publicAppUrl}/pedidos/${order.shortId.value}`

    return Result.ok({
      id: order.id.value,
      status: order.status.value,
      // biome-ignore lint/style/noNonNullAssertion: set by markPickedUp
      pickedUpAt: order.props.pickedUpAt!.toISOString(),
      deliveryMapsUrl: mapsUrl,
      trackingUrl,
    })
  }
}
