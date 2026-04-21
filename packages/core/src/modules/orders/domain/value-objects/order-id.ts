import { ValueObject } from '../../../../shared/kernel/value-object'

type Props = { value: string }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export class OrderId extends ValueObject<Props> {
  private constructor(value: string) {
    super({ value })
  }

  static of(value: string): OrderId {
    if (!UUID_RE.test(value)) throw new Error(`OrderId inválido: ${value}`)
    return new OrderId(value)
  }

  static generate(): OrderId {
    return new OrderId(crypto.randomUUID())
  }

  get value(): string {
    return this.props.value
  }

  toString(): string {
    return this.props.value
  }
}
