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
    prepTimeOption: string
    appearsInQueueAt: string
    estimatedReadyAt: string
  }

  constructor(
    payload: OrderCreated['payload'],
    metadata?: EventMetadata,
  ) {
    super(metadata)
    this.aggregateId = payload.orderId
    this.payload = payload
  }
}

export class OrderAccepted extends BaseDomainEvent {
  readonly eventType = 'OrderAccepted' as const
  readonly aggregateType = AGG
  readonly aggregateId: string
  readonly payload: { orderId: string; driverId: string; acceptedAt: string }

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
  readonly payload: { orderId: string; newAppearsInQueueAt: string }

  constructor(payload: OrderReadyEarly['payload'], metadata?: EventMetadata) {
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
