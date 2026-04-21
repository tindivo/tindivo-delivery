import { ValueObject } from '../../../../shared/kernel/value-object'
import { Money } from './money'

export type PaymentStatusValue = 'prepaid' | 'pending_yape' | 'pending_cash'

type Props = {
  status: PaymentStatusValue
  orderAmount: Money
  clientPaysWith: Money | null
  changeToGive: Money | null
}

/**
 * Intención/estado de pago del pedido.
 * Encapsula la relación entre método, monto, lo que paga el cliente y vuelto.
 */
export class PaymentIntent extends ValueObject<Props> {
  private constructor(props: Props) {
    super(props)
  }

  static create(
    status: PaymentStatusValue,
    orderAmount: Money,
    clientPaysWith: Money | null = null,
  ): PaymentIntent {
    let change: Money | null = null
    if (status === 'pending_cash') {
      if (!clientPaysWith) throw new Error('pending_cash requiere clientPaysWith')
      if (!clientPaysWith.isGreaterThanOrEqualTo(orderAmount))
        throw new Error('clientPaysWith debe ser ≥ orderAmount')
      change = clientPaysWith.sub(orderAmount)
    }
    return new PaymentIntent({
      status,
      orderAmount,
      clientPaysWith: status === 'pending_cash' ? clientPaysWith : null,
      changeToGive: change,
    })
  }

  get status(): PaymentStatusValue {
    return this.props.status
  }
  get orderAmount(): Money {
    return this.props.orderAmount
  }
  get clientPaysWith(): Money | null {
    return this.props.clientPaysWith
  }
  get changeToGive(): Money | null {
    return this.props.changeToGive
  }

  isPendingCash(): boolean {
    return this.props.status === 'pending_cash'
  }
  isPrepaid(): boolean {
    return this.props.status === 'prepaid'
  }
}
