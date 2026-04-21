import { ValueObject } from '../../../../shared/kernel/value-object'

type Props = { value: string }
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export class DriverId extends ValueObject<Props> {
  private constructor(value: string) {
    super({ value })
  }
  static of(value: string): DriverId {
    if (!UUID_RE.test(value)) throw new Error(`DriverId inválido: ${value}`)
    return new DriverId(value)
  }
  get value(): string {
    return this.props.value
  }
  override toString(): string {
    return this.props.value
  }
}
