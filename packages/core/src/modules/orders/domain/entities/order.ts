import { AggregateRoot } from '../../../../shared/kernel/aggregate-root'
import { Result } from '../../../../shared/kernel/result'
import {
  CustomerDataMissing,
  DriverCapacityExceeded,
  DriverNotAssigned,
  InvalidPaymentChange,
  InvalidStateTransition,
  NoPrepTimeToReduce,
  OrderNotCancellable,
  OrderNotEditable,
  PaymentChangeNotAllowed,
  PrepTimeExtensionLimit,
  UrgentNotAvailable,
} from '../errors/order-errors'
import {
  CustomerDataSaved,
  DriverArrived,
  OrderAccepted,
  OrderAcceptedByRestaurant,
  OrderAssigned,
  OrderAssignmentRejected,
  OrderCancelled,
  OrderCreated,
  OrderDelivered,
  OrderEditedByRestaurant,
  OrderExtended,
  OrderMarkedUrgent,
  OrderPendingAcceptance,
  OrderPickedUp,
  OrderReadyEarly,
  OrderReassigned,
  OrderReceived,
  OrderUrgencyCleared,
  PaymentMethodChanged,
  TrackingLinkSent,
} from '../events/order-events'
import { CancellationPolicy, type Role } from '../policies/cancellation.policy'
import { StateTransitionPolicy } from '../policies/state-transition.policy'
import type { Coordinates } from '../value-objects/coordinates'
import type { DriverId } from '../value-objects/driver-id'
import type { Money } from '../value-objects/money'
import { OccupancySlots } from '../value-objects/occupancy-slots'
import { OrderId } from '../value-objects/order-id'
import { OrderStatus } from '../value-objects/order-status'
import type { PaymentIntent } from '../value-objects/payment-intent'
import { PrepTime } from '../value-objects/prep-time'
import type { RestaurantId } from '../value-objects/restaurant-id'
import { ShortId } from '../value-objects/short-id'

export type OrderSource = 'restaurant_pwa' | 'customer_pwa'

export type OrderProps = {
  id: OrderId
  shortId: ShortId
  restaurantId: RestaurantId
  driverId: DriverId | null
  status: OrderStatus
  source: OrderSource
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
  deliveryReference: string | null
  extensionUsed: boolean
  readyEarlyUsed: boolean
  notes: string | null
  trackingLinkSentAt: Date | null
  trackingLinkSentBy: string | null
  pendingAcceptanceAt: Date | null
  restaurantAcceptedAt: Date | null
  restaurantAcceptedPrepMinutes: number | null
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
  occupancySlots: OccupancySlots
  /**
   * Cola "Urgente": NULL = no urgente. Timestamp = momento en que entró a la
   * cola urgente (post-timeout o post-rechazo). Sirve como FIFO de la cola y
   * como flag visual "Urgente" en la PWA del motorizado. Cualquier driver
   * del restaurante puede tomarlo manualmente vía /claim (FCFS sin reglas
   * R1-R5). Los triggers reactivos de auto-asignación tienen guard
   * `urgent_since IS NULL` y NO disparan para urgentes.
   */
  urgentSince: Date | null
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
  /**
   * Origen del pedido. Default: 'restaurant_pwa' (creado por staff, prep_time
   * confirmado y va directo a waiting_driver). 'customer_pwa' = creado por
   * cliente final desde tindivo.com, nace en `pending_acceptance` esperando
   * que el restaurante acepte y defina prep_time real.
   */
  source?: OrderSource
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
   * Crea un pedido nuevo. Emite OrderCreated y, si source='customer_pwa',
   * también OrderPendingAcceptance (el restaurante debe aceptar antes de
   * que el flujo de driver-assignment dispare).
   */
  static create(input: CreateOrderInput): Result<Order, never> {
    const now = input.now ?? new Date()
    const id = OrderId.generate()
    const shortId = ShortId.generate()
    const estimatedReadyAt = input.prepTime.computeEstimatedReadyAt(now)
    const appearsInQueueAt = input.prepTime.computeAppearsInQueueAt(now)
    const source: OrderSource = input.source ?? 'restaurant_pwa'
    const initialStatus =
      source === 'customer_pwa' ? OrderStatus.pendingAcceptance() : OrderStatus.waitingDriver()
    const pendingAcceptanceAt = source === 'customer_pwa' ? now : null

    const order = new Order({
      id,
      shortId,
      restaurantId: input.restaurantId,
      driverId: null,
      status: initialStatus,
      source,
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
      deliveryReference: null,
      extensionUsed: false,
      readyEarlyUsed: false,
      notes: input.notes ?? null,
      trackingLinkSentAt: null,
      trackingLinkSentBy: null,
      pendingAcceptanceAt,
      restaurantAcceptedAt: null,
      restaurantAcceptedPrepMinutes: null,
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
      occupancySlots: OccupancySlots.default(),
      urgentSince: null,
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

    if (source === 'customer_pwa') {
      order.raise(
        new OrderPendingAcceptance({
          orderId: id.value,
          shortId: shortId.value,
          restaurantId: input.restaurantId.value,
          orderAmount: input.payment.orderAmount.amount,
          estimatedPrepMinutes: input.prepTime.minutes,
          // biome-ignore lint/style/noNonNullAssertion: pendingAcceptanceAt seteado arriba para customer_pwa
          pendingAcceptanceAt: pendingAcceptanceAt!.toISOString(),
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
  get source(): OrderSource {
    return this._state.source
  }
  get occupancySlots(): OccupancySlots {
    return this._state.occupancySlots
  }
  get urgentSince(): Date | null {
    return this._state.urgentSince
  }
  get isUrgent(): boolean {
    return this._state.urgentSince !== null
  }
  get props(): Readonly<OrderProps> {
    return this._state
  }

  /* ───────────────── Comportamientos ───────────────── */

  /**
   * El restaurante acepta un pedido pending_acceptance y define el prep_time
   * real. Recalcula `estimated_ready_at` y `appears_in_queue_at` con el nuevo
   * prep desde `now`, y transiciona a `waiting_driver`. El use-case dispara
   * `AutoAssignOrderUseCase` después de save() para que el cron de
   * asignación procese inmediatamente sin esperar al siguiente tick.
   *
   * Solo aplica a pedidos source='customer_pwa'. Pedidos restaurant_pwa
   * nacen ya en waiting_driver — esta transición rechaza por canTransition.
   */
  acceptByRestaurant(prepMinutes: number, now: Date): Result<void, InvalidStateTransition> {
    if (!StateTransitionPolicy.canTransition(this._state.status.value, 'waiting_driver'))
      return Result.fail(new InvalidStateTransition(this._state.status.value, 'waiting_driver'))
    if (this._state.status.value !== 'pending_acceptance')
      return Result.fail(new InvalidStateTransition(this._state.status.value, 'waiting_driver'))

    const newPrepTime = PrepTime.of(prepMinutes)
    const newEstimatedReadyAt = newPrepTime.computeEstimatedReadyAt(now)
    const newAppearsInQueueAt = newPrepTime.computeAppearsInQueueAt(now)

    this._state.status = OrderStatus.waitingDriver()
    this._state.prepTime = newPrepTime
    this._state.estimatedReadyAt = newEstimatedReadyAt
    this._state.appearsInQueueAt = newAppearsInQueueAt
    this._state.restaurantAcceptedAt = now
    this._state.restaurantAcceptedPrepMinutes = prepMinutes
    this._state.updatedAt = now

    this.raise(
      new OrderAcceptedByRestaurant({
        orderId: this.id.value,
        restaurantId: this._state.restaurantId.value,
        acceptedPrepMinutes: prepMinutes,
        newEstimatedReadyAt: newEstimatedReadyAt.toISOString(),
        newAppearsInQueueAt: newAppearsInQueueAt.toISOString(),
        acceptedAt: now.toISOString(),
      }),
    )
    return Result.okVoid()
  }

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

    // Edge case: el cron `timeout_unaccepted_assignments` corrió en el segundo
    // 4:59 mientras el driver estaba viendo el pedido y aceptó. En BD el
    // pedido ya tenía `urgent_since` set; al aceptar lo limpiamos para que
    // no se vea como "Urgente" en su lista de Mis pedidos. Optimistic lock
    // del repo permite el accept aún si driver_id se liberó por timeout.
    const wasUrgent = this._state.urgentSince !== null

    this._state.driverId = driverId
    this._state.status = OrderStatus.headingToRestaurant()
    this._state.acceptedAt = now
    this._state.headingAt = now
    this._state.acceptCountdownSeconds = countdownSeconds
    this._state.urgentSince = null
    this._state.updatedAt = now

    this.raise(
      new OrderAccepted({
        orderId: this.id.value,
        driverId: driverId.value,
        acceptedAt: now.toISOString(),
        acceptCountdownSeconds: countdownSeconds,
      }),
    )
    if (wasUrgent) {
      this.raise(
        new OrderUrgencyCleared({
          orderId: this.id.value,
          claimedBy: driverId.value,
          clearedAt: now.toISOString(),
        }),
      )
    }
    return Result.okVoid()
  }

  assignTo(driverId: DriverId, reason: string, now: Date): Result<void, InvalidStateTransition> {
    if (this._state.status.value !== 'waiting_driver') {
      return Result.fail(new InvalidStateTransition(this._state.status.value, 'waiting_driver'))
    }

    this._state.driverId = driverId
    this._state.updatedAt = now

    this.raise(
      new OrderAssigned({
        orderId: this.id.value,
        driverId: driverId.value,
        assignedAt: now.toISOString(),
        reason,
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

  /**
   * Persiste los datos del cliente (phone + coords/referencia + dirección
   * opcional) mientras el driver espera que el restaurante tenga listo el
   * pedido. NO transiciona el status (sigue waiting_at_restaurant); solo
   * deja los datos listos para que `markPickedUp` los promueva. Idempotente:
   * cada llamada sobrescribe los valores anteriores y vuelve a emitir el
   * evento.
   *
   * Regla de invariante: phone es obligatorio y al menos uno entre coords
   * y reference debe estar presente. La referencia textual (string libre)
   * es el fallback cuando el driver no logra ubicar la dirección exacta
   * en el mapa con el tiempo en contra.
   */
  saveCustomerData(
    clientPhone: string,
    deliveryCoordinates: Coordinates | null,
    deliveryAddress: string | null,
    deliveryReference: string | null,
    now: Date,
  ): Result<void, InvalidStateTransition | CustomerDataMissing> {
    if (this._state.status.value !== 'waiting_at_restaurant')
      return Result.fail(
        new InvalidStateTransition(this._state.status.value, 'waiting_at_restaurant'),
      )
    if (!deliveryCoordinates && !deliveryReference) return Result.fail(new CustomerDataMissing())

    this._state.clientPhone = clientPhone
    this._state.deliveryCoordinates = deliveryCoordinates
    this._state.deliveryAddress = deliveryAddress
    this._state.deliveryReference = deliveryReference
    this._state.deliveryMapsUrl = deliveryCoordinates ? buildMapsUrl(deliveryCoordinates) : null
    this._state.updatedAt = now

    this.raise(
      new CustomerDataSaved({
        orderId: this.id.value,
        driverId: this._state.driverId?.value ?? '',
        clientPhone,
        deliveryCoordinates: deliveryCoordinates
          ? { lat: deliveryCoordinates.lat, lng: deliveryCoordinates.lng }
          : null,
        deliveryAddress,
        deliveryReference,
        savedAt: now.toISOString(),
      }),
    )
    return Result.okVoid()
  }

  /**
   * Transición waiting_at_restaurant → picked_up. Los datos del cliente
   * (phone + coords O referencia) deben estar previamente persistidos via
   * `saveCustomerData`. Si faltan, retorna CustomerDataMissing — la UI
   * no debería permitir llegar aquí sin haber guardado primero.
   *
   * `occupancySlots` declara cuánto ocupa el pedido en la mochila del driver.
   * Default 1; máximo configurable por admin (validado por el use case
   * contra `assignment_rules.maxOccupancySlotsPerOrder`).
   */
  markPickedUp(
    occupancySlots: OccupancySlots,
    now: Date,
  ): Result<void, InvalidStateTransition | CustomerDataMissing> {
    if (!StateTransitionPolicy.canTransition(this._state.status.value, 'picked_up'))
      return Result.fail(new InvalidStateTransition(this._state.status.value, 'picked_up'))

    const phone = this._state.clientPhone
    const coords = this._state.deliveryCoordinates
    const reference = this._state.deliveryReference
    if (!phone || (!coords && !reference)) return Result.fail(new CustomerDataMissing())

    this._state.status = OrderStatus.pickedUp()
    this._state.pickedUpAt = now
    this._state.occupancySlots = occupancySlots
    this._state.updatedAt = now

    this.raise(
      new OrderPickedUp({
        orderId: this.id.value,
        driverId: this._state.driverId?.value ?? '',
        pickedUpAt: now.toISOString(),
        clientPhone: phone,
        deliveryCoordinates: coords ? { lat: coords.lat, lng: coords.lng } : null,
        deliveryReference: reference,
        occupancySlots: occupancySlots.value,
      }),
    )
    return Result.okVoid()
  }

  /**
   * El driver rechaza una asignación. El pedido pasa a la cola "Urgente"
   * (atributo `urgentSince` set + `driver_id=NULL`). NO se reasigna
   * automáticamente con reglas R1-R5 — queda en cola para que cualquier
   * driver del restaurante lo tome manualmente vía /claim (FCFS).
   *
   * Solo válido si:
   *  - status === 'waiting_driver'
   *  - el driver invocador es exactamente el asignado actualmente
   * Si el pedido ya pasó a `heading_to_restaurant` (ya aceptó), debe usar
   * el flujo de cancelación o transferencia admin — no este método.
   */
  rejectAssignment(
    driverId: DriverId,
    reason: string,
    now: Date,
  ): Result<void, InvalidStateTransition | DriverNotAssigned> {
    if (this._state.status.value !== 'waiting_driver')
      return Result.fail(new InvalidStateTransition(this._state.status.value, 'waiting_driver'))
    if (!this._state.driverId || this._state.driverId.value !== driverId.value)
      return Result.fail(new DriverNotAssigned())

    const previousDriverId = this._state.driverId.value
    this._state.driverId = null
    this._state.urgentSince = now
    this._state.updatedAt = now

    this.raise(
      new OrderAssignmentRejected({
        orderId: this.id.value,
        driverId: driverId.value,
        reason,
        rejectedAt: now.toISOString(),
      }),
    )
    this.raise(
      new OrderMarkedUrgent({
        orderId: this.id.value,
        shortId: this._state.shortId.value,
        restaurantId: this._state.restaurantId.value,
        urgentSince: now.toISOString(),
        source: 'driver_reject',
        previousDriverId,
      }),
    )
    return Result.okVoid()
  }

  /**
   * Un driver toma manualmente un pedido de la cola "Urgente". Combina
   * `assignTo` + `acceptBy` en una sola transición sin pasar por las reglas
   * R1-R5 (la cola urgente es FCFS pura — el primer driver del restaurante
   * que toque el botón gana). El repo usa un UPDATE atómico con WHERE
   * compuesto para resolver la race entre dos drivers tap-eando simultáneo.
   *
   * Pre: status='waiting_driver' AND urgentSince!=null
   * Post: driver_id=X, status='heading_to_restaurant', urgent_since=null,
   *       acceptedAt=now, headingAt=now
   *
   * Validaciones de driver_restaurants y capacidad (R3) se hacen en el
   * use case ANTES de llegar aquí.
   */
  applyClaimUrgent(driverId: DriverId, now: Date): Result<void, UrgentNotAvailable> {
    if (this._state.status.value !== 'waiting_driver' || this._state.urgentSince === null)
      return Result.fail(new UrgentNotAvailable())

    const countdownSeconds = Math.round(
      (this._state.estimatedReadyAt.getTime() - now.getTime()) / 1000,
    )

    this._state.driverId = driverId
    this._state.status = OrderStatus.headingToRestaurant()
    this._state.acceptedAt = now
    this._state.headingAt = now
    this._state.acceptCountdownSeconds = countdownSeconds
    this._state.urgentSince = null
    this._state.updatedAt = now

    this.raise(
      new OrderAssigned({
        orderId: this.id.value,
        driverId: driverId.value,
        assignedAt: now.toISOString(),
        reason: 'urgent_claim',
      }),
    )
    this.raise(
      new OrderAccepted({
        orderId: this.id.value,
        driverId: driverId.value,
        acceptedAt: now.toISOString(),
        acceptCountdownSeconds: countdownSeconds,
      }),
    )
    this.raise(
      new OrderUrgencyCleared({
        orderId: this.id.value,
        claimedBy: driverId.value,
        clearedAt: now.toISOString(),
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

  /**
   * Reasigna el pedido a otro driver. Permitido en:
   *  - `waiting_driver`: pre-asignado y nadie aceptó aún. El nuevo driver
   *    se vuelve el dueño pre-asignado y tendrá que aceptar/rechazar como
   *    flujo normal. Limpiamos `urgentSince` para que B reciba sus 5 min
   *    de tolerancia frescos sin que aparezca marcado como "Urgente".
   *    El trigger `trg_orders_set_assigned_at` resetea `assigned_at` solo.
   *  - `heading_to_restaurant` y `waiting_at_restaurant`: el nuevo driver
   *    "hereda" la asignación pero debe (re)ir al local. Reseteamos el
   *    status a heading y los timestamps de ruta.
   *  - `picked_up`: caso accidente/avería con la comida ya en mochila. El
   *    nuevo driver hereda el pedido tal cual; status sigue picked_up,
   *    no reseteamos timestamps de ruta porque el cliente espera la comida
   *    cuanto antes y no hay nada que "rehacer".
   */
  reassignTo(
    newDriverId: DriverId,
    reason: string,
    now: Date,
  ): Result<void, InvalidStateTransition> {
    const status = this._state.status.value
    const allowed =
      status === 'waiting_driver' ||
      status === 'heading_to_restaurant' ||
      status === 'waiting_at_restaurant' ||
      status === 'picked_up'
    if (!allowed) {
      return Result.fail(new InvalidStateTransition(status, 'heading_to_restaurant'))
    }

    const previous = this._state.driverId
    this._state.driverId = newDriverId

    if (status === 'waiting_driver') {
      // Pre-asignado sin acceptar: B reemplaza a A y aún tiene que aceptar.
      this._state.urgentSince = null
      this._state.acceptedAt = null
      this._state.headingAt = null
      this._state.waitingAt = null
      this._state.updatedAt = now
    } else if (status === 'picked_up') {
      // Solo cambia el dueño; status, pickedUpAt, occupancySlots intactos.
      this._state.updatedAt = now
    } else {
      this._state.status = OrderStatus.headingToRestaurant()
      this._state.acceptedAt = now
      this._state.headingAt = now
      this._state.waitingAt = null
      this._state.updatedAt = now
    }

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

  /**
   * Edición por el restaurante de campos del pedido (nombre cliente, método
   * de pago y/o monto) ANTES de que el driver lo recoja. Caso real: el
   * restaurante se equivocó al crear o el cliente cambió de opinión sobre
   * cuánto/cómo pagar mientras la comida aún se prepara o sale del local.
   *
   * Reglas:
   *  - Solo permitido en `waiting_driver`, `heading_to_restaurant`,
   *    `waiting_at_restaurant` (antes de pickup). En `picked_up` el driver
   *    ya tiene la comida y para esos cambios existe `changePaymentMethod`.
   *  - El nuevo `PaymentIntent` se construye desde cero con los valores
   *    proporcionados. La validación cruzada (yape+cash=order, paysWith>=
   *    cash, etc.) la hace `PaymentIntent.create`.
   *  - Solo emite el evento si hubo algún cambio efectivo (idempotencia).
   */
  editByRestaurant(
    newClientName: string | null,
    newPayment: PaymentIntent,
    now: Date,
  ): Result<void, OrderNotEditable> {
    const editableStatuses: ReadonlyArray<string> = [
      'waiting_driver',
      'heading_to_restaurant',
      'waiting_at_restaurant',
    ]
    if (!editableStatuses.includes(this._state.status.value))
      return Result.fail(new OrderNotEditable(this._state.status.value))

    const previous = this._state.payment
    const previousClientName = this._state.clientName

    const sanitizedClientName = newClientName?.trim() || null
    const clientNameChanged = sanitizedClientName !== previousClientName
    const paymentChanged =
      newPayment.status !== previous.status ||
      !newPayment.orderAmount.equals(previous.orderAmount) ||
      (newPayment.yapeAmount?.amount ?? null) !== (previous.yapeAmount?.amount ?? null) ||
      (newPayment.cashAmount?.amount ?? null) !== (previous.cashAmount?.amount ?? null) ||
      (newPayment.clientPaysWith?.amount ?? null) !== (previous.clientPaysWith?.amount ?? null)

    if (!clientNameChanged && !paymentChanged) {
      return Result.okVoid()
    }

    this._state.clientName = sanitizedClientName
    this._state.payment = newPayment
    this._state.updatedAt = now

    this.raise(
      new OrderEditedByRestaurant({
        orderId: this.id.value,
        restaurantId: this._state.restaurantId.value,
        previousClientName,
        newClientName: sanitizedClientName,
        previousOrderAmount: previous.orderAmount.amount,
        newOrderAmount: newPayment.orderAmount.amount,
        previousPaymentStatus: previous.status,
        newPaymentStatus: newPayment.status,
        previousYapeAmount: previous.yapeAmount?.amount ?? null,
        previousCashAmount: previous.cashAmount?.amount ?? null,
        previousClientPaysWith: previous.clientPaysWith?.amount ?? null,
        previousChangeToGive: previous.changeToGive?.amount ?? null,
        newYapeAmount: newPayment.yapeAmount?.amount ?? null,
        newCashAmount: newPayment.cashAmount?.amount ?? null,
        newClientPaysWith: newPayment.clientPaysWith?.amount ?? null,
        newChangeToGive: newPayment.changeToGive?.amount ?? null,
        editedAt: now.toISOString(),
      }),
    )
    return Result.okVoid()
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
