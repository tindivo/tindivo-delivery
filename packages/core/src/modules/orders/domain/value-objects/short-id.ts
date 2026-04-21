import { generateShortId, isValidShortId } from '../../../../shared/utils/short-id'
import { ValueObject } from '../../../../shared/kernel/value-object'

type Props = { value: string }

export class ShortId extends ValueObject<Props> {
  private constructor(value: string) {
    super({ value })
  }

  static of(value: string): ShortId {
    if (!isValidShortId(value)) throw new Error(`ShortId inválido: ${value}`)
    return new ShortId(value)
  }

  static generate(): ShortId {
    return new ShortId(generateShortId())
  }

  get value(): string {
    return this.props.value
  }

  toString(): string {
    return this.props.value
  }
}
