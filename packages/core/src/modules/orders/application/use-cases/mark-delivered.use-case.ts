import type { DomainError } from '../../../../shared/errors/domain-error'
import { Result } from '../../../../shared/kernel/result'
import type { UseCase } from '../../../../shared/kernel/use-case'
import type { DeliveryPaymentInput } from '../../domain/entities/order'
import type { Order } from '../../domain/entities/order'
import { OrderNotFound } from '../../domain/errors/order-errors'
import { Coordinates } from '../../domain/value-objects/coordinates'
import { OrderId } from '../../domain/value-objects/order-id'
import { haversineDistance } from '../../../../shared/utils/maps'
import type { Clock } from '../ports/clock'
import type {
  AddressCaptureEvent,
  CustomerAddressRepository,
} from '../ports/customer-address.repository'
import type { EventPublisher } from '../ports/event-publisher'
import type { OrderRepository } from '../ports/order.repository'

export type MarkDeliveredCommand = {
  orderId: string
  driverId: string
  payment?: DeliveryPaymentInput
  addressCapture?: {
    lat: number
    lng: number
    accuracy: number
    reference?: string
    distanceDragged?: number
    omitted?: boolean
    customerName?: string
  }
}

export type MarkDeliveredResult = {
  id: string
  status: string
  deliveredAt: string
  cashOwedAtDelivery: number | null
}

export class MarkDeliveredUseCase
  implements UseCase<MarkDeliveredCommand, MarkDeliveredResult, DomainError>
{
  constructor(
    private readonly orders: OrderRepository,
    private readonly customerAddresses: CustomerAddressRepository,
    private readonly events: EventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(cmd: MarkDeliveredCommand): Promise<Result<MarkDeliveredResult, DomainError>> {
    const order = await this.orders.findById(OrderId.of(cmd.orderId))
    if (!order) return Result.fail(new OrderNotFound(cmd.orderId))

    const now = this.clock.now()

    // 1. Process address capture in a non-blocking try-catch block
    if (cmd.addressCapture) {
      try {
        await this.handleAddressCapture(order, cmd.driverId, cmd.addressCapture, now)
      } catch (err) {
        console.error('Error during customer address capture/logging (non-blocking):', err)
      }
    } else if (order.customerAddressId) {
      try {
        // Caso A (o cliente antiguo sin capture explícito): actualizar uso
        // y, si el order tiene coordenadas (del saveCustomerData o de la
        // herencia del customer_address al crear), mantener actualizada la
        // dirección guardada — cada entrega es una oportunidad de mejorar
        // la precisión de los datos.
        const address = await this.customerAddresses.findById(order.customerAddressId)
        if (address) {
          // Si source no es admin_curated y el order tiene coordenadas,
          // actualizarlas en la dirección guardada (P3).
          if (
            address.source !== 'admin_curated' &&
            order.props.deliveryCoordinates
          ) {
            address.lat = order.props.deliveryCoordinates.lat
            address.lng = order.props.deliveryCoordinates.lng
            // accuracy no disponible en esta rama; mantener la existente
          }
          address.lastUsedAt = now
          address.timesUsed += 1
          if (order.props.clientName) {
            address.customerName = order.props.clientName
          }
          await this.customerAddresses.update(address)
        }
      } catch (err) {
        console.error('Error updating address usage stats (non-blocking):', err)
      }
    }

    // 2. Mark order as delivered and persist
    const previous = order.status
    const res = order.markDelivered(now, cmd.payment ?? { kind: 'unchanged' })
    if (res.isFailure) return Result.fail(res.error)

    await this.orders.save(order, previous)
    await this.events.publishAll(order.pullEvents())

    return Result.ok({
      id: order.id.value,
      status: order.status.value,
      // biome-ignore lint/style/noNonNullAssertion: set by markDelivered
      deliveredAt: order.props.deliveredAt!.toISOString(),
      cashOwedAtDelivery: order.props.cashOwedAtDelivery?.amount ?? null,
    })
  }

  private async handleAddressCapture(
    order: Order,
    driverId: string,
    capture: NonNullable<MarkDeliveredCommand['addressCapture']>,
    now: Date,
  ): Promise<void> {
    if (capture.omitted) {
      // Registrar evento de omitido
      const event: AddressCaptureEvent = {
        orderId: order.id.value,
        driverId,
        phone: order.clientPhone,
        action: 'omitted',
        accuracyReported: capture.accuracy,
        distanceDraggedM: capture.distanceDragged ?? 0,
      }
      await this.customerAddresses.logEvent(event)
      return
    }

    // Si no es omitido, actualizar o insertar la dirección
    const action = (capture.distanceDragged ?? 0) > 0 ? 'dragged' : 'confirmed'
    let referenceEdited = false
    let oldReferenceLength = 0
    let newReferenceLength = 0
    let distanceFromPreviousM: number | null = null

    // Si no está omitido, actualizamos las coordenadas finales del pedido (snapshot)
    order.updateDeliveryCoordinates(Coordinates.of(capture.lat, capture.lng))

    // El nombre editado por el driver en el modal tiene prioridad sobre
    // el que viene del pedido (clientName del restaurante).
    const effectiveName = capture.customerName?.trim() || order.props.clientName || null

    if (order.customerAddressId) {
      const address = await this.customerAddresses.findById(order.customerAddressId)
      if (address) {

        if (address.source === 'admin_curated') {
          // Jerarquía: admin_curated no se sobreescribe. Solo actualiza stats.
          address.lastUsedAt = now
          address.timesUsed += 1
          if (effectiveName) {
            address.customerName = effectiveName
          }
        } else {
          // Actualizar dirección
          // Validar outlier: si la coordenada nueva está a >500m de la
          // guardada, loguear warning pero igual persistir (el driver
          // confirmó visualmente en el mapa).
          if (address.lat != null && address.lng != null) {
            const jumpM = haversineDistance(
              { lat: address.lat, lng: address.lng },
              { lat: capture.lat, lng: capture.lng },
            )
            distanceFromPreviousM = jumpM
            if (jumpM > 500) {
              console.warn(
                `[MarkDelivered] Large coordinate jump: ${jumpM}m ` +
                `for address ${address.addressId} (phone ${address.phone})`,
              )
            }
          }
          address.lat = capture.lat
          address.lng = capture.lng
          address.accuracyM = capture.accuracy
          address.source = 'driver_verified'
          address.lastUsedAt = now
          address.timesUsed += 1
          if (effectiveName) {
            address.customerName = effectiveName
          }

          // Guardar referencia si fue editada y la precisión es aceptable (<= 500m)
          if (capture.reference !== undefined && capture.accuracy <= 500) {
            const oldRef = address.reference ?? ''
            if (capture.reference !== oldRef) {
              referenceEdited = true
              oldReferenceLength = oldRef.length
              newReferenceLength = capture.reference.length
              address.reference = capture.reference
            }
          }
        }
        await this.customerAddresses.update(address)
      }
    } else if (order.clientPhone) {
      // Solo guardar la referencia si la precisión es aceptable (<= 500m)
      const finalReference =
        capture.accuracy <= 500
          ? (capture.reference ?? order.props.deliveryReference)
          : order.props.deliveryReference

      if (
        capture.reference !== undefined &&
        capture.reference !== (order.props.deliveryReference ?? '')
      ) {
        referenceEdited = true
        oldReferenceLength = (order.props.deliveryReference ?? '').length
        newReferenceLength = capture.reference.length
      }

      // Evitar duplicados: buscar si ya existe una dirección con la misma referencia (case-insensitive)
      const existingAddresses = await this.customerAddresses.findByPhone(order.clientPhone)
      const normalizedRef = (finalReference ?? '').trim().toLowerCase()
      const matchingAddress = existingAddresses.find(
        (addr) => (addr.reference ?? '').trim().toLowerCase() === normalizedRef,
      )

      if (matchingAddress) {
        if (matchingAddress.source !== 'admin_curated') {
          matchingAddress.lat = capture.lat
          matchingAddress.lng = capture.lng
          matchingAddress.accuracyM = capture.accuracy
          matchingAddress.source = 'driver_verified'
        }
        matchingAddress.lastUsedAt = now
        matchingAddress.timesUsed += 1
        if (effectiveName) {
          matchingAddress.customerName = effectiveName
        }
        await this.customerAddresses.update(matchingAddress)
        order.setCustomerAddressId(matchingAddress.addressId)
      } else {
        const defaultAddress = await this.customerAddresses.findDefaultByPhone(order.clientPhone)
        const isDefault = !defaultAddress

        const newAddress = await this.customerAddresses.insert({
          phone: order.clientPhone,
          lat: capture.lat,
          lng: capture.lng,
          accuracyM: capture.accuracy,
          source: 'driver_verified',
          reference: finalReference,
          isDefault,
          lastUsedAt: now,
          timesUsed: 1,
          customerName: effectiveName,
        })

        // Enlazar orden con la nueva dirección creada
        order.setCustomerAddressId(newAddress.addressId)
      }
    }

    // Registrar evento de captura exitosa
    const event: AddressCaptureEvent = {
      orderId: order.id.value,
      driverId,
      phone: order.clientPhone,
      action,
      accuracyReported: capture.accuracy,
      distanceDraggedM: capture.distanceDragged ?? 0,
      metadata: {
        ...(referenceEdited
          ? { reference_edited: true, old_length: oldReferenceLength, new_length: newReferenceLength }
          : {}),
        ...(distanceFromPreviousM != null ? { distance_from_previous_m: distanceFromPreviousM } : {}),
      },
    }
    await this.customerAddresses.logEvent(event)
  }
}
