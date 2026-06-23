import { Result } from '../../../../shared/kernel/result'
import type { UseCase } from '../../../../shared/kernel/use-case'
import { Order, type OrderSource } from '../../domain/entities/order'
import { Coordinates } from '../../domain/value-objects/coordinates'
import { Money } from '../../domain/value-objects/money'
import { PaymentIntent, type PaymentStatusValue } from '../../domain/value-objects/payment-intent'
import { PrepTime } from '../../domain/value-objects/prep-time'
import { RestaurantId } from '../../domain/value-objects/restaurant-id'
import type { Clock } from '../ports/clock'
import type { CustomerAddressRepository } from '../ports/customer-address.repository'
import type { EventPublisher } from '../ports/event-publisher'
import type { OrderRepository } from '../ports/order.repository'

export type CreateOrderCommand = {
  restaurantId: string
  prepMinutes: number
  paymentStatus: PaymentStatusValue
  orderAmount: number
  yapeAmount?: number
  cashAmount?: number
  clientPaysWith?: number
  clientName?: string
  notes?: string
  /**
   * Comisión base (`restaurants.commission_per_order`) snapshoteada al crear.
   * El endpoint la lee del restaurante y la pasa aquí. Se persiste en
   * `orders.base_commission`. delivery_fee inicial = baseCommission; el
   * pickup ajusta si la banda es 'far' sumando farSurchargeAmount.
   */
  baseCommission: number
  /**
   * Adicional configurable por restaurante (`restaurants.far_distance_surcharge`)
   * que solo se aplica cuando la banda declarada al pickup es 'far'.
   * Snapshoteado al crear en `orders.far_surcharge_amount`.
   */
  farSurchargeAmount: number
  /**
   * Origen del pedido. 'customer_pwa' nace en pending_acceptance esperando
   * que el restaurante acepte y defina prep_time real. Default 'restaurant_pwa'.
   */
  source?: OrderSource
  /**
   * Datos del cliente que el restaurante puede pre-llenar al crear el pedido.
   * El motorizado los ve pre-poblados en su form de waiting_at_restaurant y
   * puede modificarlos. Opcionales: si el restaurante no los conoce, el
   * driver los llenará después como siempre.
   */
  clientPhone?: string
  deliveryReference?: string
  customerAddressId?: string | null
}

export type CreateOrderResult = {
  id: string
  shortId: string
  status: string
  estimatedReadyAt: string
  appearsInQueueAt: string
  changeToGive: number | null
}

export class CreateOrderUseCase implements UseCase<CreateOrderCommand, CreateOrderResult, Error> {
  constructor(
    private readonly orders: OrderRepository,
    private readonly customerAddresses: CustomerAddressRepository,
    private readonly events: EventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(cmd: CreateOrderCommand): Promise<Result<CreateOrderResult, Error>> {
    try {
      const restaurantId = RestaurantId.of(cmd.restaurantId)
      const prepTime = PrepTime.of(cmd.prepMinutes)
      const payment = PaymentIntent.create(
        cmd.paymentStatus,
        Money.pen(cmd.orderAmount),
        cmd.clientPaysWith != null ? Money.pen(cmd.clientPaysWith) : null,
        cmd.yapeAmount != null ? Money.pen(cmd.yapeAmount) : null,
        cmd.cashAmount != null ? Money.pen(cmd.cashAmount) : null,
      )

      let finalReference = cmd.deliveryReference
      let addressIdToLink = cmd.customerAddressId ?? null
      let initialCoords: { lat: number; lng: number } | null = null

      if (cmd.customerAddressId) {
        const address = await this.customerAddresses.findById(cmd.customerAddressId)
        if (address) {
          let addressUpdated = false
          const fieldsFilled: string[] = []

          // 2. Si customer_name es NULL o vacío, y el nombre tipeado tiene >= 3 caracteres
          const trimmedName = cmd.clientName?.trim() ?? ''
          const isNameEmpty = !address.customerName || address.customerName.trim() === ''
          if (isNameEmpty && trimmedName.length >= 3) {
            address.customerName = trimmedName
            addressUpdated = true
            fieldsFilled.push('customer_name')
          }

          // 3. Si reference es NULL o vacío, y la referencia tipeada tiene >= 5 caracteres
          const trimmedRef = cmd.deliveryReference?.trim() ?? ''
          const isRefEmpty = !address.reference || address.reference.trim() === ''
          if (isRefEmpty && trimmedRef.length >= 5) {
            address.reference = trimmedRef
            addressUpdated = true
            fieldsFilled.push('reference')
          }

          if (addressUpdated) {
            await this.customerAddresses.update(address)
            await this.customerAddresses.logEvent({
              orderId: null,
              driverId: null,
              phone: address.phone,
              action: 'admin_edited',
              accuracyReported: null,
              distanceDraggedM: null,
              metadata: {
                source: 'cashier_first_fill',
                fields_filled: fieldsFilled,
              },
            })
          }

          if (!finalReference && address.reference) {
            finalReference = address.reference
          }
          if (address.lat !== null && address.lng !== null) {
            initialCoords = { lat: address.lat, lng: address.lng }
          }
          addressIdToLink = address.addressId
        }
      }

      const result = Order.create({
        restaurantId,
        prepTime,
        payment,
        baseCommission: Money.pen(cmd.baseCommission),
        farSurchargeAmount: Money.pen(cmd.farSurchargeAmount),
        clientName: cmd.clientName,
        notes: cmd.notes,
        source: cmd.source,
        clientPhone: cmd.clientPhone,
        deliveryReference: finalReference,
        customerAddressId: addressIdToLink,
        now: this.clock.now(),
      })

      if (result.isFailure) return Result.fail(new Error('No se pudo crear el pedido'))

      const order = result.value
      if (initialCoords) {
        order.updateDeliveryCoordinates(Coordinates.of(initialCoords.lat, initialCoords.lng))
      }

      await this.orders.insert(order)
      await this.events.publishAll(order.pullEvents())

      return Result.ok({
        id: order.id.value,
        shortId: order.shortId.value,
        status: order.status.value,
        estimatedReadyAt: order.estimatedReadyAt.toISOString(),
        appearsInQueueAt: order.appearsInQueueAt.toISOString(),
        changeToGive: order.payment.changeToGive?.amount ?? null,
      })
    } catch (err) {
      return Result.fail(err instanceof Error ? err : new Error(String(err)))
    }
  }
}
