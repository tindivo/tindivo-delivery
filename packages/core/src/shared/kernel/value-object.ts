/**
 * Base para Value Objects — inmutables y comparables por valor, no por referencia.
 */
export abstract class ValueObject<Props extends object> {
  protected readonly props: Readonly<Props>

  protected constructor(props: Props) {
    this.props = Object.freeze(props)
  }

  equals(other?: ValueObject<Props>): boolean {
    if (other === undefined || other === null) return false
    if (!(other instanceof this.constructor)) return false
    return JSON.stringify(this.props) === JSON.stringify(other.props)
  }
}
