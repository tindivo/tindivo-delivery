import type { DomainError } from '../../../../shared/errors/domain-error'
import { Result } from '../../../../shared/kernel/result'
import type { UseCase } from '../../../../shared/kernel/use-case'
import { OrderNotFound } from '../../domain/errors/order-errors'
import { Coordinates } from '../../domain/value-objects/coordinates'
import { OrderId } from '../../domain/value-objects/order-id'
import type { Clock } from '../ports/clock'
import type { EventPublisher } from '../ports/event-publisher'
import type { OrderRepository } from '../ports/order.repository'

export type SaveCustomerDataCommand = {
  orderId: string
  driverId: string
  clientPhone: string
  deliveryCoordinates: { lat: number; lng: number }
  deliveryAddress?: string
}

export type SaveCustomerDataResult = {
  id: string
  status: string
  clientPhone: string
  deliveryCoordinates: { lat: number; lng: number }
  deliveryAddress: string | null
}

/**
 * Persiste los datos del cliente (phone + coords) en BD mientras el driver
 * espera que el restaurante tenga listo el pedido. NO transiciona el status
 * (sigue waiting_at_restaurant). Idempotente — cada save sobrescribe los
 * valores anteriores. La fuente de verdad es la BD: nunca localStorage.
 */
export class SaveCustomerDataUseCase
  implements UseCase<SaveCustomerDataCommand, SaveCustomerDataResult, DomainError>
{
  constructor(
    private readonly orders: OrderRepository,
    private readonly events: EventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(
    cmd: SaveCustomerDataCommand,
  ): Promise<Result<SaveCustomerDataResult, DomainError>> {
    const order = await this.orders.findById(OrderId.of(cmd.orderId))
    if (!order) return Result.fail(new OrderNotFound(cmd.orderId))

    const previous = order.status
    const coords = Coordinates.of(cmd.deliveryCoordinates.lat, cmd.deliveryCoordinates.lng)

    const res = order.saveCustomerData(
      cmd.clientPhone,
      coords,
      cmd.deliveryAddress ?? null,
      this.clock.now(),
    )
    if (res.isFailure) return Result.fail(res.error)

    await this.orders.save(order, previous)
    await this.events.publishAll(order.pullEvents())

    return Result.ok({
      id: order.id.value,
      status: order.status.value,
      clientPhone: cmd.clientPhone,
      deliveryCoordinates: { lat: coords.lat, lng: coords.lng },
      deliveryAddress: cmd.deliveryAddress ?? null,
    })
  }
}
