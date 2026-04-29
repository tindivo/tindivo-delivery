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
 * Emitido cuando el driver guarda los datos del cliente (phone + coords)
 * mientras espera que el restaurante tenga listo el pedido. NO transiciona
 * el status (sigue waiting_at_restaurant) — solo persiste los datos para
 * que estén listos al momento del pickup. Idempotente: cada save vuelve a
 * emitirlo (incluyendo overwrites).
 */
export class CustomerDataSaved extends BaseDomainEvent {
  readonly eventType = 'CustomerDataSaved' as const
  readonly aggregateType = AGG
  readonly aggregateId: string
  readonly payload: {
    orderId: string
    driverId: string
    clientPhone: string
    deliveryCoordinates: { lat: number; lng: number }
    deliveryAddress: string | null
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
    deliveryCoordinates: { lat: number; lng: number }
  }

  constructor(payload: OrderPickedUp['payload'], metadata?: EventMetadata) {
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
