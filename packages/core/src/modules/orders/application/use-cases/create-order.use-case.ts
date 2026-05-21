import { Result } from '../../../../shared/kernel/result'
import type { UseCase } from '../../../../shared/kernel/use-case'
import { Order, type OrderSource } from '../../domain/entities/order'
import { Money } from '../../domain/value-objects/money'
import { PaymentIntent, type PaymentStatusValue } from '../../domain/value-objects/payment-intent'
import { PrepTime } from '../../domain/value-objects/prep-time'
import { RestaurantId } from '../../domain/value-objects/restaurant-id'
import type { Clock } from '../ports/clock'
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
  // Comisión Tindivo en S/ que se cobrará al restaurante por este pedido.
  // El endpoint REST la lee de restaurants.commission_per_order y la pasa
  // aquí. Se snapshotea en orders.delivery_fee al insertar.
  commissionPerOrder: number
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

      const result = Order.create({
        restaurantId,
        prepTime,
        payment,
        deliveryFee: Money.pen(cmd.commissionPerOrder),
        clientName: cmd.clientName,
        notes: cmd.notes,
        source: cmd.source,
        clientPhone: cmd.clientPhone,
        deliveryReference: cmd.deliveryReference,
        now: this.clock.now(),
      })

      if (result.isFailure) return Result.fail(new Error('No se pudo crear el pedido'))

      const order = result.value
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
