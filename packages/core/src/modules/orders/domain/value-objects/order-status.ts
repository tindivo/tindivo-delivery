import { ValueObject } from '../../../../shared/kernel/value-object'

export type OrderStatusValue =
  | 'waiting_driver'
  | 'heading_to_restaurant'
  | 'waiting_at_restaurant'
  | 'picked_up'
  | 'delivered'
  | 'cancelled'

type Props = { value: OrderStatusValue }

export class OrderStatus extends ValueObject<Props> {
  private constructor(value: OrderStatusValue) {
    super({ value })
  }

  static of(value: OrderStatusValue): OrderStatus {
    return new OrderStatus(value)
  }

  static waitingDriver = () => new OrderStatus('waiting_driver')
  static headingToRestaurant = () => new OrderStatus('heading_to_restaurant')
  static waitingAtRestaurant = () => new OrderStatus('waiting_at_restaurant')
  static pickedUp = () => new OrderStatus('picked_up')
  static delivered = () => new OrderStatus('delivered')
  static cancelled = () => new OrderStatus('cancelled')

  get value(): OrderStatusValue {
    return this.props.value
  }

  is(other: OrderStatusValue): boolean {
    return this.props.value === other
  }

  isFinal(): boolean {
    return this.props.value === 'delivered' || this.props.value === 'cancelled'
  }

  isActive(): boolean {
    return !this.isFinal()
  }

  toString(): string {
    return this.props.value
  }
}
