import type { DomainEvent } from './domain-event'
import { Entity } from './entity'
import type { ValueObject } from './value-object'

/**
 * Aggregate Root — única entrada de consistencia para el agregado.
 * Acumula eventos de dominio que se publican al persistir.
 */
export abstract class AggregateRoot<Id extends ValueObject<any>> extends Entity<Id> {
  private _events: DomainEvent[] = []

  protected raise(event: DomainEvent): void {
    this._events.push(event)
  }

  pullEvents(): readonly DomainEvent[] {
    const events = this._events
    this._events = []
    return Object.freeze(events.slice())
  }

  get pendingEvents(): readonly DomainEvent[] {
    return Object.freeze(this._events.slice())
  }
}
