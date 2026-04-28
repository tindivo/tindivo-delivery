import { AggregateRoot } from '../../../../shared/kernel/aggregate-root'
import { Result } from '../../../../shared/kernel/result'
import {
  DriverCapacityExceeded,
  InvalidPaymentChange,
  InvalidStateTransition,
  NoPrepTimeToReduce,
  OrderNotCancellable,
  PaymentChangeNotAllowed,
  PrepTimeExtensionLimit,
} from '../errors/order-errors'
import {
  DriverArrived,
  OrderAccepted,
  OrderCancelled,
  OrderCreated,
  OrderDelivered,
  OrderExtended,
  OrderPickedUp,
  OrderReadyEarly,
  OrderReadyForDrivers,
  OrderReassigned,
  OrderReceived,
  PaymentMethodChanged,
  TrackingLinkSent,
} from '../events/order-events'
import { CancellationPolicy, type Role } from '../policies/cancellation.policy'
import { StateTransitionPolicy } from '../policies/state-transition.policy'
import type { Coordinates } from '../value-objects/coordinates'
import type { DriverId } from '../value-objects/driver-id'
import type { Money } from '../value-objects/money'
import { OrderId } from '../value-objects/order-id'
import { OrderStatus } from '../value-objects/order-status'
import type { PaymentIntent } from '../value-objects/payment-intent'
import type { PrepTime } from '../value-objects/prep-time'
import type { RestaurantId } from '../value-objects/restaurant-id'
import { ShortId } from '../value-objects/short-id'

export type OrderProps = {
  id: OrderId
  shortId: ShortId
  restaurantId: RestaurantId
  driverId: DriverId | null
  status: OrderStatus
  prepTime: PrepTime
  payment: PaymentIntent
  deliveryFee: Money
  appearsInQueueAt: Date
  estimatedReadyAt: Date
  clientPhone: string | null
  clientName: string | null
  deliveryCoordinates: Coordinates | null
  deliveryMapsUrl: string | null
  deliveryAddress: string | null
  extensionUsed: boolean
  readyEarlyUsed: boolean
  notes: string | null
  trackingLinkSentAt: Date | null
  trackingLinkSentBy: string | null
  acceptedAt: Date | null
  headingAt: Date | null
  waitingAt: Date | null
  receivedAt: Date | null
  pickedUpAt: Date | null
  deliveredAt: Date | null
  cancelledAt: Date | null
  cancelReason: string | null
  acceptCountdownSeconds: number | null
  prepExtendedAt: Date | null
  prepExtensionMinutes: 5 | 10 | null
  readyEarlyAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export type CreateOrderInput = {
  restaurantId: RestaurantId
  prepTime: PrepTime
  payment: PaymentIntent
  deliveryFee: Money
  clientName?: string
  notes?: string
  now?: Date
}

/**
 * Agregado Order. Único punto de mutación de consistencia para un pedido.
 */
export class Order extends AggregateRoot<OrderId> {
  private _state: OrderProps

  private constructor(props: OrderProps) {
    super(props.id)
    this._state = { ...props }
  }

  /**
   * Reconstruye desde persistencia. NO emite eventos.
   */
  static rehydrate(props: OrderProps): Order {
    return new Order(props)
  }

  /**
   * Crea un pedido nuevo. Emite OrderCreated.
   */
  static create(input: CreateOrderInput): Result<Order, never> {
    const now = input.now ?? new Date()
    const id = OrderId.generate()
    const shortId = ShortId.generate()
    const estimatedReadyAt = input.prepTime.computeEstimatedReadyAt(now)
    const appearsInQueueAt = input.prepTime.computeAppearsInQueueAt(now)

    const order = new Order({
      id,
      shortId,
      restaurantId: input.restaurantId,
      driverId: null,
      status: OrderStatus.waitingDriver(),
      prepTime: input.prepTime,
      payment: input.payment,
      deliveryFee: input.deliveryFee,
      appearsInQueueAt,
      estimatedReadyAt,
      clientPhone: null,
      clientName: input.clientName?.trim() || null,
      deliveryCoordinates: null,
      deliveryMapsUrl: null,
      deliveryAddress: null,
      extensionUsed: false,
      readyEarlyUsed: false,
      notes: input.notes ?? null,
      trackingLinkSentAt: null,
      trackingLinkSentBy: null,
      acceptedAt: null,
      headingAt: null,
      waitingAt: null,
      receivedAt: null,
      pickedUpAt: null,
      deliveredAt: null,
      cancelledAt: null,
      cancelReason: null,
      acceptCountdownSeconds: null,
      prepExtendedAt: null,
      prepExtensionMinutes: null,
      readyEarlyAt: null,
      createdAt: now,
      updatedAt: now,
    })

    order.raise(
      new OrderCreated({
        orderId: id.value,
        shortId: shortId.value,
        restaurantId: input.restaurantId.value,
        orderAmount: input.payment.orderAmount.amount,
        paymentStatus: input.payment.status,
        prepMinutes: input.prepTime.minutes,
        appearsInQueueAt: appearsInQueueAt.toISOString(),
        estimatedReadyAt: estimatedReadyAt.toISOString(),
      }),
    )

    // Si el pedido entra inmediatamente en la bandeja del driver
    // (prepMinutes=0 → appearsInQueueAt = now), emitir OrderReadyForDrivers
    // ya, sin esperar al pg_cron `enqueue_orders_ready_for_drivers` de 1
    // minuto. Esto baja la latencia del push de hasta 60s a ≤2s. El cron
    // mantiene defensa en profundidad: si por algún motivo este path no
    // se ejecuta, el cron emite el evento después con su NOT EXISTS
    // idempotente (no se duplica el push).
    if (appearsInQueueAt.getTime() <= now.getTime()) {
      order.raise(
        new OrderReadyForDrivers({
          orderId: id.value,
          shortId: shortId.value,
          restaurantId: input.restaurantId.value,
          orderAmount: input.payment.orderAmount.amount,
          appearsInQueueAt: appearsInQueueAt.toISOString(),
        }),
      )
    }

    return Result.ok(order)
  }

  /* ───────────────── Getters ───────────────── */

  get shortId(): ShortId {
    return this._state.shortId
  }
  get restaurantId(): RestaurantId {
    return this._state.restaurantId
  }
  get driverId(): DriverId | null {
    return this._state.driverId
  }
  get status(): OrderStatus {
    return this._state.status
  }
  get prepTime(): PrepTime {
    return this._state.prepTime
  }
  get payment(): PaymentIntent {
    return this._state.payment
  }
  get deliveryFee(): Money {
    return this._state.deliveryFee
  }
  get appearsInQueueAt(): Date {
    return this._state.appearsInQueueAt
  }
  get estimatedReadyAt(): Date {
    return this._state.estimatedReadyAt
  }
  get clientPhone(): string | null {
    return this._state.clientPhone
  }
  get clientName(): string | null {
    return this._state.clientName
  }
  get deliveryCoordinates(): Coordinates | null {
    return this._state.deliveryCoordinates
  }
  get extensionUsed(): boolean {
    return this._state.extensionUsed
  }
  get readyEarlyUsed(): boolean {
    return this._state.readyEarlyUsed
  }
  get props(): Readonly<OrderProps> {
    return this._state
  }

  /* ───────────────── Comportamientos ───────────────── */

  acceptBy(
    driverId: DriverId,
    activeOrdersCount: number,
    maxConcurrent: number,
    now: Date,
  ): Result<void, InvalidStateTransition | DriverCapacityExceeded> {
    if (!StateTransitionPolicy.canTransition(this._state.status.value, 'heading_to_restaurant'))
      return Result.fail(
        new InvalidStateTransition(this._state.status.value, 'heading_to_restaurant'),
      )

    if (activeOrdersCount >= maxConcurrent) return Result.fail(new DriverCapacityExceeded())

    // Snapshot inmutable del countdown (segundos restantes al estimated_ready_at)
    // en el instante del accept. Negativo si el pedido ya estaba overdue.
    // Persistir el snapshot evita perder el dato si luego se extiende o
    // se marca "listo antes" — ambos mutan estimated_ready_at.
    const countdownSeconds = Math.round(
      (this._state.estimatedReadyAt.getTime() - now.getTime()) / 1000,
    )

    this._state.driverId = driverId
    this._state.status = OrderStatus.headingToRestaurant()
    this._state.acceptedAt = now
    this._state.headingAt = now
    this._state.acceptCountdownSeconds = countdownSeconds
    this._state.updatedAt = now

    this.raise(
      new OrderAccepted({
        orderId: this.id.value,
        driverId: driverId.value,
        acceptedAt: now.toISOString(),
        acceptCountdownSeconds: countdownSeconds,
      }),
    )
    return Result.okVoid()
  }

  markArrived(now: Date): Result<void, InvalidStateTransition> {
    if (!StateTransitionPolicy.canTransition(this._state.status.value, 'waiting_at_restaurant'))
      return Result.fail(
        new InvalidStateTransition(this._state.status.value, 'waiting_at_restaurant'),
      )

    this._state.status = OrderStatus.waitingAtRestaurant()
    this._state.waitingAt = now
    this._state.updatedAt = now

    this.raise(
      new DriverArrived({
        orderId: this.id.value,
        driverId: this._state.driverId?.value ?? '',
        arrivedAt: now.toISOString(),
      }),
    )
    return Result.okVoid()
  }

  /**
   * Marca el momento en que el driver presionó "Recibí el pedido".
   * No cambia el status (sigue waiting_at_restaurant) — el status pasa a
   * picked_up cuando completa el pickup form e invoca markPickedUp.
   * Idempotente: si receivedAt ya está set, no muta nada.
   */
  markReceived(now: Date): Result<void, InvalidStateTransition> {
    if (this._state.status.value !== 'waiting_at_restaurant')
      return Result.fail(
        new InvalidStateTransition(this._state.status.value, 'waiting_at_restaurant'),
      )
    if (this._state.receivedAt) return Result.okVoid()

    this._state.receivedAt = now
    this._state.updatedAt = now

    this.raise(
      new OrderReceived({
        orderId: this.id.value,
        driverId: this._state.driverId?.value ?? '',
        receivedAt: now.toISOString(),
      }),
    )
    return Result.okVoid()
  }

  markPickedUp(
    clientPhone: string,
    deliveryCoordinates: Coordinates,
    deliveryAddress: string | null,
    now: Date,
  ): Result<void, InvalidStateTransition> {
    if (!StateTransitionPolicy.canTransition(this._state.status.value, 'picked_up'))
      return Result.fail(new InvalidStateTransition(this._state.status.value, 'picked_up'))

    this._state.status = OrderStatus.pickedUp()
    this._state.clientPhone = clientPhone
    this._state.deliveryCoordinates = deliveryCoordinates
    this._state.deliveryAddress = deliveryAddress
    this._state.deliveryMapsUrl = buildMapsUrl(deliveryCoordinates)
    this._state.pickedUpAt = now
    this._state.updatedAt = now

    this.raise(
      new OrderPickedUp({
        orderId: this.id.value,
        driverId: this._state.driverId?.value ?? '',
        pickedUpAt: now.toISOString(),
        clientPhone,
        deliveryCoordinates: { lat: deliveryCoordinates.lat, lng: deliveryCoordinates.lng },
      }),
    )
    return Result.okVoid()
  }

  markDelivered(now: Date): Result<void, InvalidStateTransition> {
    if (!StateTransitionPolicy.canTransition(this._state.status.value, 'delivered'))
      return Result.fail(new InvalidStateTransition(this._state.status.value, 'delivered'))

    this._state.status = OrderStatus.delivered()
    this._state.deliveredAt = now
    this._state.updatedAt = now

    this.raise(
      new OrderDelivered({
        orderId: this.id.value,
        driverId: this._state.driverId?.value ?? '',
        deliveredAt: now.toISOString(),
      }),
    )
    return Result.okVoid()
  }

  cancel(role: Role, reason: string, now: Date): Result<void, OrderNotCancellable> {
    if (!CancellationPolicy.canCancel(role, this._state.status.value))
      return Result.fail(new OrderNotCancellable(this._state.status.value))

    this._state.status = OrderStatus.cancelled()
    this._state.cancelReason = reason
    this._state.cancelledAt = now
    this._state.updatedAt = now

    this.raise(
      new OrderCancelled({
        orderId: this.id.value,
        cancelledBy: role === 'admin' ? 'admin' : 'restaurant',
        reason,
        cancelledAt: now.toISOString(),
      }),
    )
    return Result.okVoid()
  }

  reassignTo(
    newDriverId: DriverId,
    reason: string,
    now: Date,
  ): Result<void, InvalidStateTransition> {
    if (
      this._state.status.value !== 'heading_to_restaurant' &&
      this._state.status.value !== 'waiting_at_restaurant'
    )
      return Result.fail(
        new InvalidStateTransition(this._state.status.value, 'heading_to_restaurant'),
      )

    const previous = this._state.driverId
    this._state.driverId = newDriverId
    this._state.status = OrderStatus.headingToRestaurant()
    this._state.acceptedAt = now
    this._state.headingAt = now
    this._state.waitingAt = null
    this._state.updatedAt = now

    this.raise(
      new OrderReassigned({
        orderId: this.id.value,
        previousDriverId: previous?.value ?? null,
        newDriverId: newDriverId.value,
        reason,
      }),
    )
    return Result.okVoid()
  }

  extendPrepTime(
    additionalMinutes: 5 | 10,
    now: Date,
  ): Result<void, PrepTimeExtensionLimit | InvalidStateTransition> {
    if (this._state.status.value !== 'waiting_driver')
      return Result.fail(new InvalidStateTransition(this._state.status.value, 'waiting_driver'))
    if (this._state.extensionUsed) return Result.fail(new PrepTimeExtensionLimit())

    const newEstimated = new Date(
      this._state.estimatedReadyAt.getTime() + additionalMinutes * 60_000,
    )
    const newAppearsInQueue = new Date(
      this._state.appearsInQueueAt.getTime() + additionalMinutes * 60_000,
    )

    this._state.estimatedReadyAt = newEstimated
    this._state.appearsInQueueAt = newAppearsInQueue
    this._state.extensionUsed = true
    this._state.prepExtendedAt = now
    this._state.prepExtensionMinutes = additionalMinutes
    this._state.updatedAt = now

    this.raise(
      new OrderExtended({
        orderId: this.id.value,
        additionalMinutes,
        newEstimatedReadyAt: newEstimated.toISOString(),
      }),
    )
    return Result.okVoid()
  }

  markReadyEarly(now: Date): Result<void, InvalidStateTransition | NoPrepTimeToReduce> {
    if (this._state.status.value !== 'waiting_driver')
      return Result.fail(new InvalidStateTransition(this._state.status.value, 'waiting_driver'))

    const remainingMin = (this._state.estimatedReadyAt.getTime() - now.getTime()) / 60_000
    if (remainingMin <= 10) return Result.fail(new NoPrepTimeToReduce())

    const newReadyAt = new Date(now.getTime() + 10 * 60_000)
    this._state.estimatedReadyAt = newReadyAt
    this._state.appearsInQueueAt = now
    this._state.readyEarlyUsed = true
    this._state.readyEarlyAt = now
    this._state.updatedAt = now

    this.raise(
      new OrderReadyEarly({
        orderId: this.id.value,
        newAppearsInQueueAt: now.toISOString(),
        newEstimatedReadyAt: newReadyAt.toISOString(),
      }),
    )
    return Result.okVoid()
  }

  editClientPhone(newPhone: string, now: Date): void {
    this._state.clientPhone = newPhone
    this._state.updatedAt = now
  }

  /**
   * Cambia el método de pago en el último minuto. Caso real: el cliente
   * dijo que pagaría por Yape pero al recibir cambia de opinión y paga
   * efectivo (o viceversa, o decide hacer split mixto).
   *
   * Reglas:
   *  - Solo permitido en `status=picked_up` (motorizado físicamente con
   *    el cliente). Antes no tiene sentido; después ya hay settlement.
   *  - El `orderAmount` NO puede cambiar — solo se altera cómo se cobra.
   *  - Emite `PaymentMethodChanged` con snapshot previo y nuevo.
   */
  changePaymentMethod(
    newPayment: PaymentIntent,
    now: Date,
  ): Result<void, PaymentChangeNotAllowed | InvalidPaymentChange> {
    if (this._state.status.value !== 'picked_up')
      return Result.fail(new PaymentChangeNotAllowed(this._state.status.value))

    if (!newPayment.orderAmount.equals(this._state.payment.orderAmount))
      return Result.fail(
        new InvalidPaymentChange('orderAmount no puede cambiar al modificar el método de pago'),
      )

    const previous = this._state.payment

    this._state.payment = newPayment
    this._state.updatedAt = now

    this.raise(
      new PaymentMethodChanged({
        orderId: this.id.value,
        driverId: this._state.driverId?.value ?? '',
        previousStatus: previous.status,
        newStatus: newPayment.status,
        previousYapeAmount: previous.yapeAmount?.amount ?? null,
        previousCashAmount: previous.cashAmount?.amount ?? null,
        previousClientPaysWith: previous.clientPaysWith?.amount ?? null,
        previousChangeToGive: previous.changeToGive?.amount ?? null,
        newYapeAmount: newPayment.yapeAmount?.amount ?? null,
        newCashAmount: newPayment.cashAmount?.amount ?? null,
        newClientPaysWith: newPayment.clientPaysWith?.amount ?? null,
        newChangeToGive: newPayment.changeToGive?.amount ?? null,
        changedAt: now.toISOString(),
      }),
    )
    return Result.okVoid()
  }

  logTrackingLinkSent(actorUserId: string, now: Date): void {
    this._state.trackingLinkSentAt = now
    this._state.trackingLinkSentBy = actorUserId
    this._state.updatedAt = now

    this.raise(
      new TrackingLinkSent({
        orderId: this.id.value,
        sentBy: actorUserId,
        sentAt: now.toISOString(),
      }),
    )
  }
}

function buildMapsUrl(coords: Coordinates): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}&travelmode=driving`
}
