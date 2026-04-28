import { ValueObject } from '../../../../shared/kernel/value-object'
import type { Money } from './money'

export type PaymentStatusValue = 'prepaid' | 'pending_yape' | 'pending_cash' | 'pending_mixed'

type Props = {
  status: PaymentStatusValue
  orderAmount: Money
  yapeAmount: Money | null
  cashAmount: Money | null
  clientPaysWith: Money | null
  changeToGive: Money | null
}

/**
 * Intención/estado de pago del pedido.
 * Encapsula la relación entre método, monto, lo que paga el cliente y vuelto.
 *
 * En `pending_mixed` el pedido se cobra parte por Yape y parte en efectivo:
 * `yapeAmount + cashAmount === orderAmount`. `clientPaysWith` y `changeToGive`
 * aplican siempre sobre la parte cash (el cliente entrega un billete físico
 * por la porción efectivo, no por la porción Yape que se transfiere exacta).
 */
export class PaymentIntent extends ValueObject<Props> {
  private constructor(props: Props) {
    super(props)
  }

  static create(
    status: PaymentStatusValue,
    orderAmount: Money,
    clientPaysWith: Money | null = null,
    yapeAmount: Money | null = null,
    cashAmount: Money | null = null,
  ): PaymentIntent {
    if (status === 'pending_mixed') {
      if (!yapeAmount || !cashAmount)
        throw new Error('pending_mixed requiere yapeAmount y cashAmount')
      if (!yapeAmount.isPositive() || !cashAmount.isPositive())
        throw new Error('pending_mixed requiere yapeAmount y cashAmount > 0')
      if (!yapeAmount.add(cashAmount).equals(orderAmount))
        throw new Error('yapeAmount + cashAmount debe ser igual a orderAmount')
    } else if (yapeAmount || cashAmount) {
      throw new Error('yapeAmount/cashAmount solo aplican en pending_mixed')
    }

    let change: Money | null = null
    if (status === 'pending_cash') {
      if (!clientPaysWith) throw new Error('pending_cash requiere clientPaysWith')
      if (!clientPaysWith.isGreaterThanOrEqualTo(orderAmount))
        throw new Error('clientPaysWith debe ser ≥ orderAmount')
      change = clientPaysWith.sub(orderAmount)
    } else if (status === 'pending_mixed' && clientPaysWith) {
      // El billete del cliente cubre solo la parte cash en mixto
      if (!clientPaysWith.isGreaterThanOrEqualTo(cashAmount as Money))
        throw new Error('clientPaysWith debe ser ≥ cashAmount en pending_mixed')
      change = clientPaysWith.sub(cashAmount as Money)
    }

    const persistedClientPaysWith =
      status === 'pending_cash' || status === 'pending_mixed' ? clientPaysWith : null

    return new PaymentIntent({
      status,
      orderAmount,
      yapeAmount: status === 'pending_mixed' ? yapeAmount : null,
      cashAmount: status === 'pending_mixed' ? cashAmount : null,
      clientPaysWith: persistedClientPaysWith,
      changeToGive: change,
    })
  }

  get status(): PaymentStatusValue {
    return this.props.status
  }
  get orderAmount(): Money {
    return this.props.orderAmount
  }
  get yapeAmount(): Money | null {
    return this.props.yapeAmount
  }
  get cashAmount(): Money | null {
    return this.props.cashAmount
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
  isMixed(): boolean {
    return this.props.status === 'pending_mixed'
  }
}
