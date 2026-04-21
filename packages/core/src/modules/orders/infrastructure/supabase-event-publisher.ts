import type { ServerClient } from '@tindivo/supabase'
import { PersistenceError } from '../../../shared/errors/domain-error'
import type { DomainEvent } from '../../../shared/kernel/domain-event'
import type { EventPublisher } from '../application/ports/event-publisher'

/**
 * Adaptador Supabase que escribe eventos en la tabla `domain_events` (outbox).
 * El relay (trigger Postgres + Edge Function) los publica a Push/Realtime.
 */
export class SupabaseEventPublisher implements EventPublisher {
  constructor(private readonly sb: ServerClient) {}

  async publish(event: DomainEvent): Promise<void> {
    await this.publishAll([event])
  }

  async publishAll(events: readonly DomainEvent[]): Promise<void> {
    if (events.length === 0) return

    const rows = events.map((e) => ({
      id: e.eventId,
      aggregate_type: e.aggregateType,
      aggregate_id: e.aggregateId,
      event_type: e.eventType,
      payload: e.payload as never,
      metadata: (e.metadata ?? {}) as never,
      occurred_at: e.occurredAt.toISOString(),
    }))

    const { error } = await this.sb.from('domain_events').insert(rows)
    if (error) throw new PersistenceError(error.message, error)
  }
}
