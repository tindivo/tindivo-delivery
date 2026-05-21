import { BaseDomainEvent, type EventMetadata } from '../../../../shared/kernel/domain-event'

const AGG = 'Order'

export class OrderCreated extends BaseDomainEvent {
  readonly eventType = 'OrderCreated' as const
  readonly aggregateType = AGG
  readonly aggregateId: string
  readonly payload: {
    orderId: string
    shortId: string
    restaurantId: string
    orderAmount: number
    paymentStatus: string
    prepMinutes: number
    appearsInQueueAt: string
    estimatedReadyAt: string
  }

  constructor(payload: OrderCreated['payload'], metadata?: EventMetadata) {
    super(metadata)
    this.aggregateId = payload.orderId
    this.payload = payload
  }
}

export class OrderAccepted extends BaseDomainEvent {
  readonly eventType = 'OrderAccepted' as const
  readonly aggregateType = AGG
  readonly aggregateId: string
  readonly payload: {
    orderId: string
    driverId: string
    acceptedAt: string
    acceptCountdownSeconds: number
  }

  constructor(payload: OrderAccepted['payload'], metadata?: EventMetadata) {
    super(metadata)
    this.aggregateId = payload.orderId
    this.payload = payload
  }
}

export class OrderAssigned extends BaseDomainEvent {
  readonly eventType = 'OrderAssigned' as const
  readonly aggregateType = AGG
  readonly aggregateId: string
  readonly payload: {
    orderId: string
    driverId: string
    assignedAt: string
    reason: string
  }

  constructor(payload: OrderAssigned['payload'], metadata?: EventMetadata) {
    super(metadata)
    this.aggregateId = payload.orderId
    this.payload = payload
  }
}

export class DriverArrived extends BaseDomainEvent {
  readonly eventType = 'DriverArrived' as const
  readonly aggregateType = AGG
  readonly aggregateId: string
  readonly payload: { orderId: string; driverId: string; arrivedAt: string }

  constructor(payload: DriverArrived['payload'], metadata?: EventMetadata) {
    super(metadata)
    this.aggregateId = payload.orderId
    this.payload = payload
  }
}

export class OrderReceived extends BaseDomainEvent {
  readonly eventType = 'OrderReceived' as const
  readonly aggregateType = AGG
  readonly aggregateId: string
  readonly payload: { orderId: string; driverId: string; receivedAt: string }

  constructor(payload: OrderReceived['payload'], metadata?: EventMetadata) {
    super(metadata)
    this.aggregateId = payload.orderId
    this.payload = payload
  }
}

/**
 * Emitido cuando el driver guarda los datos del cliente (phone + coords y/o
 * referencia textual) mientras espera que el restaurante tenga listo el
 * pedido. NO transiciona el status (sigue waiting_at_restaurant) — solo
 * persiste los datos para que estén listos al momento del pickup.
 * Idempotente: cada save vuelve a emitirlo (incluyendo overwrites).
 *
 * `deliveryCoordinates` y `deliveryReference` son ambos opcionales pero al
 * menos uno está presente (invariante validada en el agregado).
 */
export class CustomerDataSaved extends BaseDomainEvent {
  readonly eventType = 'CustomerDataSaved' as const
  readonly aggregateType = AGG
  readonly aggregateId: string
  readonly payload: {
    orderId: string
    driverId: string
    clientPhone: string
    deliveryCoordinates: { lat: number; lng: number } | null
    deliveryAddress: string | null
    deliveryReference: string | null
    savedAt: string
  }

  constructor(payload: CustomerDataSaved['payload'], metadata?: EventMetadata) {
    super(metadata)
    this.aggregateId = payload.orderId
    this.payload = payload
  }
}

export class OrderPickedUp extends BaseDomainEvent {
  readonly eventType = 'OrderPickedUp' as const
  readonly aggregateType = AGG
  readonly aggregateId: string
  readonly payload: {
    orderId: string
    driverId: string
    pickedUpAt: string
    clientPhone: string
    deliveryCoordinates: { lat: number; lng: number } | null
    deliveryReference: string | null
    occupancySlots: number
    deliveryDistanceBand: 'near' | 'medium' | 'far'
  }

  constructor(payload: OrderPickedUp['payload'], metadata?: EventMetadata) {
    super(metadata)
    this.aggregateId = payload.orderId
    this.payload = payload
  }
}

/**
 * Emitido cuando el driver rechaza una asignación automática del cron.
 * El pedido vuelve a `driver_id=NULL` (status sigue `waiting_driver`) y el
 * cron `assign-pending-orders` lo re-asignará excluyendo a este driver
 * vía `order_assignment_rejections`. La razón viene de una lista
 * predefinida (REJECTION_REASONS en contracts).
 */
export class OrderAssignmentRejected extends BaseDomainEvent {
  readonly eventType = 'OrderAssignmentRejected' as const
  readonly aggregateType = AGG
  readonly aggregateId: string
  readonly payload: {
    orderId: string
    driverId: string
    reason: string
    rejectedAt: string
  }

  constructor(payload: OrderAssignmentRejected['payload'], metadata?: EventMetadata) {
    super(metadata)
    this.aggregateId = payload.orderId
    this.payload = payload
  }
}

export class OrderDelivered extends BaseDomainEvent {
  readonly eventType = 'OrderDelivered' as const
  readonly aggregateType = AGG
  readonly aggregateId: string
  readonly payload: { orderId: string; driverId: string; deliveredAt: string }

  constructor(payload: OrderDelivered['payload'], metadata?: EventMetadata) {
    super(metadata)
    this.aggregateId = payload.orderId
    this.payload = payload
  }
}

export class OrderCancelled extends BaseDomainEvent {
  readonly eventType = 'OrderCancelled' as const
  readonly aggregateType = AGG
  readonly aggregateId: string
  readonly payload: {
    orderId: string
    cancelledBy: 'restaurant' | 'admin'
    reason: string
    cancelledAt: string
  }

  constructor(payload: OrderCancelled['payload'], metadata?: EventMetadata) {
    super(metadata)
    this.aggregateId = payload.orderId
    this.payload = payload
  }
}

export class OrderReassigned extends BaseDomainEvent {
  readonly eventType = 'OrderReassigned' as const
  readonly aggregateType = AGG
  readonly aggregateId: string
  readonly payload: {
    orderId: string
    previousDriverId: string | null
    newDriverId: string
    reason: string
  }

  constructor(payload: OrderReassigned['payload'], metadata?: EventMetadata) {
    super(metadata)
    this.aggregateId = payload.orderId
    this.payload = payload
  }
}

export class OrderExtended extends BaseDomainEvent {
  readonly eventType = 'OrderExtended' as const
  readonly aggregateType = AGG
  readonly aggregateId: string
  readonly payload: { orderId: string; additionalMinutes: number; newEstimatedReadyAt: string }

  constructor(payload: OrderExtended['payload'], metadata?: EventMetadata) {
    super(metadata)
    this.aggregateId = payload.orderId
    this.payload = payload
  }
}

export class OrderReadyEarly extends BaseDomainEvent {
  readonly eventType = 'OrderReadyEarly' as const
  readonly aggregateType = AGG
  readonly aggregateId: string
  readonly payload: { orderId: string; newAppearsInQueueAt: string; newEstimatedReadyAt: string }

  constructor(payload: OrderReadyEarly['payload'], metadata?: EventMetadata) {
    super(metadata)
    this.aggregateId = payload.orderId
    this.payload = payload
  }
}

/**
 * Emitido cuando un pedido cruza su `appearsInQueueAt` y queda visible para
 * los drivers. Se dispara desde dos fuentes idempotentes entre sí:
 *  - Inmediato desde `Order.create()` cuando prepMinutes=0 (push en ≤2s).
 *  - Diferido por pg_cron `enqueue_orders_ready_for_drivers` cuando el
 *    appears_in_queue_at futuro alcanza el now (prepMinutes > 0). El cron
 *    usa NOT EXISTS para no duplicar si el agregado ya lo emitió.
 * La Edge Function send-push lo mapea a /motorizado/pedidos/{id}/preview.
 */
export class OrderReadyForDrivers extends BaseDomainEvent {
  readonly eventType = 'OrderReadyForDrivers' as const
  readonly aggregateType = AGG
  readonly aggregateId: string
  readonly payload: {
    orderId: string
    shortId: string
    restaurantId: string
    orderAmount: number
    appearsInQueueAt: string
  }

  constructor(payload: OrderReadyForDrivers['payload'], metadata?: EventMetadata) {
    super(metadata)
    this.aggregateId = payload.orderId
    this.payload = payload
  }
}

/**
 * Emitido cuando un pedido cruza su `estimatedReadyAt` sin driver asignado
 * (status=waiting_driver). Lo publica pg_cron vía la función SQL
 * `enqueue_overdue_orders()`. La Edge Function send-push lo mapea a una
 * notificación "zona roja" con vibración larga y requireInteraction=true.
 */
export class OrderOverdue extends BaseDomainEvent {
  readonly eventType = 'OrderOverdue' as const
  readonly aggregateType = AGG
  readonly aggregateId: string
  readonly payload: {
    orderId: string
    shortId: string
    restaurantId: string
    orderAmount: number
    estimatedReadyAt: string
  }

  constructor(payload: OrderOverdue['payload'], metadata?: EventMetadata) {
    super(metadata)
    this.aggregateId = payload.orderId
    this.payload = payload
  }
}

export class TrackingLinkSent extends BaseDomainEvent {
  readonly eventType = 'TrackingLinkSent' as const
  readonly aggregateType = AGG
  readonly aggregateId: string
  readonly payload: { orderId: string; sentBy: string; sentAt: string }

  constructor(payload: TrackingLinkSent['payload'], metadata?: EventMetadata) {
    super(metadata)
    this.aggregateId = payload.orderId
    this.payload = payload
  }
}

/**
 * Emitido cuando el motorizado cambia el método de pago de un pedido en
 * status=picked_up (caso real: cliente cambia de idea en la puerta y
 * dice "mejor te pago efectivo" en vez de Yape, o viceversa).
 *
 * El payload guarda snapshots del estado previo y nuevo para auditoría
 * y reconstrucción del historial. El monto del pedido (`orderAmount`)
 * NO cambia — solo cambia cómo se cobra.
 */
/**
 * Emitido cuando el restaurante edita campos del pedido (nombre del cliente,
 * método de pago y/o monto) antes de que el pedido sea entregado. Caso real:
 * el restaurante se equivocó al crear el pedido o el cliente cambió de
 * opinión sobre el método de pago/monto antes de que el driver lo recoja.
 *
 * Permitido en estados: waiting_driver, heading_to_restaurant,
 * waiting_at_restaurant. NO en picked_up (driver ya tiene la comida y para
 * eso existe `PaymentMethodChanged`), delivered ni cancelled.
 *
 * El payload guarda snapshots previo y nuevo de cada campo para auditoría.
 */
export class OrderEditedByRestaurant extends BaseDomainEvent {
  readonly eventType = 'OrderEditedByRestaurant' as const
  readonly aggregateType = AGG
  readonly aggregateId: string
  readonly payload: {
    orderId: string
    restaurantId: string
    previousClientName: string | null
    newClientName: string | null
    previousOrderAmount: number
    newOrderAmount: number
    previousPaymentStatus: string
    newPaymentStatus: string
    previousYapeAmount: number | null
    previousCashAmount: number | null
    previousClientPaysWith: number | null
    previousChangeToGive: number | null
    newYapeAmount: number | null
    newCashAmount: number | null
    newClientPaysWith: number | null
    newChangeToGive: number | null
    editedAt: string
  }

  constructor(payload: OrderEditedByRestaurant['payload'], metadata?: EventMetadata) {
    super(metadata)
    this.aggregateId = payload.orderId
    this.payload = payload
  }
}

export class PaymentMethodChanged extends BaseDomainEvent {
  readonly eventType = 'PaymentMethodChanged' as const
  readonly aggregateType = AGG
  readonly aggregateId: string
  readonly payload: {
    orderId: string
    driverId: string
    previousStatus: string
    newStatus: string
    previousYapeAmount: number | null
    previousCashAmount: number | null
    previousClientPaysWith: number | null
    previousChangeToGive: number | null
    newYapeAmount: number | null
    newCashAmount: number | null
    newClientPaysWith: number | null
    newChangeToGive: number | null
    changedAt: string
  }

  constructor(payload: PaymentMethodChanged['payload'], metadata?: EventMetadata) {
    super(metadata)
    this.aggregateId = payload.orderId
    this.payload = payload
  }
}

/**
 * Emitido cuando el motorizado entrega el pedido y registra que el método
 * real de pago difiere del planeado, o que el cliente pagó exacto (mantiene
 * el vuelto adelantado). Acompaña a `OrderDelivered` en estos casos.
 * Sirve para auditoría y para que el restaurante vea por qué la deuda del
 * driver cambió respecto al plan original.
 */
export class PaymentChangedAtDelivery extends BaseDomainEvent {
  readonly eventType = 'PaymentChangedAtDelivery' as const
  readonly aggregateType = AGG
  readonly aggregateId: string
  readonly payload: {
    orderId: string
    driverId: string
    restaurantId: string
    paymentStatusAtCreation: string
    previousStatus: string
    newStatus: string
    clientPaidExact: boolean
    previousYapeAmount: number | null
    previousCashAmount: number | null
    previousClientPaysWith: number | null
    previousChangeToGive: number | null
    newYapeAmount: number | null
    newCashAmount: number | null
    newClientPaysWith: number | null
    newChangeToGive: number | null
    cashOwedAtDelivery: number
    changedAt: string
  }

  constructor(payload: PaymentChangedAtDelivery['payload'], metadata?: EventMetadata) {
    super(metadata)
    this.aggregateId = payload.orderId
    this.payload = payload
  }
}

/**
 * Emitido cuando un pedido `source='customer_pwa'` se crea y queda esperando
 * que el restaurante acepte y defina el prep_time real. La Edge Function
 * send-push lo mapea a un push al restaurante con requireInteraction=true
 * (el restaurante debe responder en menos de 5 min antes del auto-cancel).
 */
export class OrderPendingAcceptance extends BaseDomainEvent {
  readonly eventType = 'OrderPendingAcceptance' as const
  readonly aggregateType = AGG
  readonly aggregateId: string
  readonly payload: {
    orderId: string
    shortId: string
    restaurantId: string
    orderAmount: number
    estimatedPrepMinutes: number
    pendingAcceptanceAt: string
  }

  constructor(payload: OrderPendingAcceptance['payload'], metadata?: EventMetadata) {
    super(metadata)
    this.aggregateId = payload.orderId
    this.payload = payload
  }
}

/**
 * Emitido cuando el restaurante hace click "Aceptar pedido" en un pedido
 * pending_acceptance. El restaurante define el prep_minutes real (puede ser
 * distinto al estimado al crear, que era max(items.prep_minutes)). El
 * agregado recalcula `estimated_ready_at` y `appears_in_queue_at` con este
 * nuevo prep_minutes y transiciona a `waiting_driver`. Después el endpoint
 * dispara AutoAssignOrderUseCase para asignar driver inmediato.
 */
export class OrderAcceptedByRestaurant extends BaseDomainEvent {
  readonly eventType = 'OrderAcceptedByRestaurant' as const
  readonly aggregateType = AGG
  readonly aggregateId: string
  readonly payload: {
    orderId: string
    restaurantId: string
    acceptedPrepMinutes: number
    newEstimatedReadyAt: string
    newAppearsInQueueAt: string
    acceptedAt: string
  }

  constructor(payload: OrderAcceptedByRestaurant['payload'], metadata?: EventMetadata) {
    super(metadata)
    this.aggregateId = payload.orderId
    this.payload = payload
  }
}

/**
 * Emitido cuando un pedido pasa a la cola "Urgente" (atributo, no estado).
 * Sucede en dos casos:
 *  - `source='timeout'`: el cron `timeout_unaccepted_assignments` libera la
 *    reservación tras 5 min sin acceptBy. Mismo INSERT en
 *    `order_assignment_rejections` con reason='timeout_no_acceptance'.
 *  - `source='driver_reject'`: el driver presiona "Rechazar" desde la PWA
 *    (use case `RejectOrderAssignmentUseCase`). Acompañado de
 *    `OrderAssignmentRejected` con la razón explícita.
 *
 * El pedido queda con `driver_id=NULL` y `urgent_since=now()`. Cualquier
 * driver del restaurante puede tomarlo manualmente vía `/claim` (FCFS sin
 * reglas R1-R5). El trigger reactivo de auto-asignación tiene un guard
 * `urgent_since IS NULL` y NO dispara para urgentes.
 */
export class OrderMarkedUrgent extends BaseDomainEvent {
  readonly eventType = 'OrderMarkedUrgent' as const
  readonly aggregateType = AGG
  readonly aggregateId: string
  readonly payload: {
    orderId: string
    shortId: string
    restaurantId: string
    urgentSince: string
    source: 'timeout' | 'driver_reject'
    previousDriverId: string | null
  }

  constructor(payload: OrderMarkedUrgent['payload'], metadata?: EventMetadata) {
    super(metadata)
    this.aggregateId = payload.orderId
    this.payload = payload
  }
}

/**
 * Emitido cuando un pedido sale de la cola urgente. Sucede cuando un driver
 * exitosamente lo reclama (`/claim` → `applyClaimUrgent`) o cuando el `acceptBy`
 * normal limpia el flag (edge case: driver aceptó en el segundo 4:59
 * mientras el cron de timeout corría).
 */
export class OrderUrgencyCleared extends BaseDomainEvent {
  readonly eventType = 'OrderUrgencyCleared' as const
  readonly aggregateType = AGG
  readonly aggregateId: string
  readonly payload: {
    orderId: string
    claimedBy: string | null
    clearedAt: string
  }

  constructor(payload: OrderUrgencyCleared['payload'], metadata?: EventMetadata) {
    super(metadata)
    this.aggregateId = payload.orderId
    this.payload = payload
  }
}

/**
 * Driver B (solicitante) pidió un pedido a Driver A (dueño actual). Driver A
 * recibe push notification "Te piden tu pedido — #{shortId}" + ve la solicitud
 * en su pestaña Equipo con countdown 30s. Si no responde, la solicitud expira
 * silenciosamente (cron cada 1min, sin evento de expiración).
 *
 * El evento NO modifica la order — solo notifica. La transferencia real ocurre
 * (vía Order.reassignTo) cuando A acepta y se publica OrderTransferAccepted +
 * OrderReassigned.
 */
export class OrderTransferRequested extends BaseDomainEvent {
  readonly eventType = 'OrderTransferRequested' as const
  readonly aggregateType = AGG
  readonly aggregateId: string
  readonly payload: {
    transferRequestId: string
    orderId: string
    shortId: string
    fromDriverId: string
    toDriverId: string
    expiresAt: string
  }

  constructor(payload: OrderTransferRequested['payload'], metadata?: EventMetadata) {
    super(metadata)
    this.aggregateId = payload.orderId
    this.payload = payload
  }
}

/**
 * Driver A aceptó la solicitud de Driver B. El pedido fue transferido
 * (Order.reassignTo emite OrderReassigned aparte). Este evento dispara push
 * al solicitante "¡Tu solicitud fue aceptada!".
 */
export class OrderTransferAccepted extends BaseDomainEvent {
  readonly eventType = 'OrderTransferAccepted' as const
  readonly aggregateType = AGG
  readonly aggregateId: string
  readonly payload: {
    transferRequestId: string
    orderId: string
    shortId: string
    fromDriverId: string
    toDriverId: string
    acceptedAt: string
  }

  constructor(payload: OrderTransferAccepted['payload'], metadata?: EventMetadata) {
    super(metadata)
    this.aggregateId = payload.orderId
    this.payload = payload
  }
}

/**
 * Driver A rechazó la solicitud manualmente. Push al solicitante para que
 * busque otro pedido en Equipo. El pedido NO cambia de dueño.
 */
export class OrderTransferRejected extends BaseDomainEvent {
  readonly eventType = 'OrderTransferRejected' as const
  readonly aggregateType = AGG
  readonly aggregateId: string
  readonly payload: {
    transferRequestId: string
    orderId: string
    shortId: string
    fromDriverId: string
    toDriverId: string
    rejectedAt: string
  }

  constructor(payload: OrderTransferRejected['payload'], metadata?: EventMetadata) {
    super(metadata)
    this.aggregateId = payload.orderId
    this.payload = payload
  }
}

/**
 * Driver A NO respondió en los 30s y el cron `process-expired-transfer-requests`
 * ejecutó la transferencia automática a Driver B. Mismo efecto que
 * OrderTransferAccepted (Order.reassignTo + OrderReassigned aparte) pero el
 * trigger no fue una acción humana sino el timeout. Se emite distinto a
 * OrderTransferAccepted para que send-push pueda mandar push diferenciado al
 * dueño anterior ("tu pedido se transfirió porque no respondiste") además del
 * push al solicitante.
 */
export class OrderTransferAutoAccepted extends BaseDomainEvent {
  readonly eventType = 'OrderTransferAutoAccepted' as const
  readonly aggregateType = AGG
  readonly aggregateId: string
  readonly payload: {
    transferRequestId: string
    orderId: string
    shortId: string
    fromDriverId: string
    toDriverId: string
    acceptedAt: string
  }

  constructor(payload: OrderTransferAutoAccepted['payload'], metadata?: EventMetadata) {
    super(metadata)
    this.aggregateId = payload.orderId
    this.payload = payload
  }
}

/**
 * Una solicitud vencida no pudo auto-aceptarse porque el solicitante ya no es
 * elegible al momento del timeout (mochila llena / desasignado del restaurante
 * / pedido ya transferido). El pedido se queda con el dueño actual y se marca
 * la solicitud como `expired`. Push al solicitante con el motivo para que
 * busque otro pedido.
 */
export class OrderTransferExpired extends BaseDomainEvent {
  readonly eventType = 'OrderTransferExpired' as const
  readonly aggregateType = AGG
  readonly aggregateId: string
  readonly payload: {
    transferRequestId: string
    orderId: string
    shortId: string
    fromDriverId: string
    toDriverId: string
    expiredAt: string
    reason: 'requester_capacity_exceeded' | 'requester_not_authorized' | 'order_already_transferred'
  }

  constructor(payload: OrderTransferExpired['payload'], metadata?: EventMetadata) {
    super(metadata)
    this.aggregateId = payload.orderId
    this.payload = payload
  }
}
