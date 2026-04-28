import { ValueObject } from '../../../../shared/kernel/value-object'
import { addPen, subPen, toMinorUnits } from '../../../../shared/utils/money'

type Props = { amount: number; currency: 'PEN' }

export class Money extends ValueObject<Props> {
  private constructor(amount: number, currency: 'PEN') {
    super({ amount, currency })
  }

  static pen(amount: number): Money {
    if (!Number.isFinite(amount)) throw new Error('Money.amount debe ser finito')
    if (amount < 0) throw new Error('Money.amount no puede ser negativo')
    // normalizar a 2 decimales exactos
    return new Money(Math.round(amount * 100) / 100, 'PEN')
  }

  get amount(): number {
    return this.props.amount
  }

  get currency(): string {
    return this.props.currency
  }

  add(other: Money): Money {
    return Money.pen(addPen(this.amount, other.amount))
  }

  sub(other: Money): Money {
    const result = subPen(this.amount, other.amount)
    if (result < 0) throw new Error('Money: resultado negativo no permitido')
    return Money.pen(result)
  }

  isGreaterThanOrEqualTo(other: Money): boolean {
    return toMinorUnits(this.amount) >= toMinorUnits(other.amount)
  }

  override equals(other: Money): boolean {
    return toMinorUnits(this.amount) === toMinorUnits(other.amount)
  }

  isZero(): boolean {
    return toMinorUnits(this.amount) === 0
  }

  isPositive(): boolean {
    return toMinorUnits(this.amount) > 0
  }

  override toString(): string {
    return `${this.amount.toFixed(2)} ${this.currency}`
  }
}
