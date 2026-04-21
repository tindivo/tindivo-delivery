import type { ValueObject } from './value-object'

/**
 * Base para entidades — identidad estable, mutabilidad controlada.
 */
export abstract class Entity<Id extends ValueObject<any>> {
  protected readonly _id: Id

  protected constructor(id: Id) {
    this._id = id
  }

  get id(): Id {
    return this._id
  }

  equals(other?: Entity<Id>): boolean {
    if (other === undefined || other === null) return false
    if (!(other instanceof this.constructor)) return false
    return this._id.equals(other._id)
  }
}
