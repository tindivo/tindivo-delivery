/**
 * Evento de dominio — algo relevante que ocurrió en el agregado.
 * Se publica via outbox pattern para garantizar consistencia transaccional.
 */
export interface DomainEvent {
  readonly eventId: string
  readonly eventType: string
  readonly aggregateType: string
  readonly aggregateId: string
  readonly occurredAt: Date
  readonly payload: Record<string, unknown>
  readonly metadata?: EventMetadata
}

export interface EventMetadata {
  readonly correlationId?: string
  readonly causationId?: string
  readonly actorId?: string
  readonly actorRole?: 'admin' | 'restaurant' | 'driver' | 'system'
}

export abstract class BaseDomainEvent implements DomainEvent {
  readonly eventId: string
  readonly occurredAt: Date
  abstract readonly eventType: string
  abstract readonly aggregateType: string
  abstract readonly aggregateId: string
  abstract readonly payload: Record<string, unknown>
  readonly metadata?: EventMetadata

  protected constructor(metadata?: EventMetadata) {
    this.eventId = crypto.randomUUID()
    this.occurredAt = new Date()
    this.metadata = metadata
  }
}
