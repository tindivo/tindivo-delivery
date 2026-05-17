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
  /**
   * Snapshot del `status` al momento de creación del pedido. Inmutable.
   * Permite saber si el restaurante le adelantó vuelto al driver (afecta
   * el cálculo de la deuda al liquidar si el método cambia al entregar).
   */
  paymentStatusAtCreation: PaymentStatusValue
  /**
   * Flag de "cliente pagó exacto al entregar". Solo se marca cuando el
   * restaurante adelantó vuelto y al final el cliente pagó exacto — el driver
   * mantiene el vuelto en mano y debe devolverlo. Sin este flag, el sistema
   * asumiría que la transacción fue como se planeó.
   */
  clientPaidExactAtDelivery: boolean
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
    paymentStatusAtCreation: PaymentStatusValue | null = null,
    clientPaidExactAtDelivery = false,
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
      paymentStatusAtCreation: paymentStatusAtCreation ?? status,
      clientPaidExactAtDelivery,
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
  get paymentStatusAtCreation(): PaymentStatusValue {
    return this.props.paymentStatusAtCreation
  }
  get clientPaidExactAtDelivery(): boolean {
    return this.props.clientPaidExactAtDelivery
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

  /**
   * Retorna una copia con `clientPaidExactAtDelivery = true`. Los demás
   * campos quedan iguales — incluido `clientPaysWith`, que sigue
   * representando el billete que el restaurante adelantó al driver para
   * vuelto (aunque el cliente al final no lo usó).
   */
  withClientPaidExact(): PaymentIntent {
    return new PaymentIntent({ ...this.props, clientPaidExactAtDelivery: true })
  }
}
