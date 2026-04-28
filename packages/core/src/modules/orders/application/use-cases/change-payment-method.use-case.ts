import type { DomainError } from '../../../../shared/errors/domain-error'
import { Result } from '../../../../shared/kernel/result'
import type { UseCase } from '../../../../shared/kernel/use-case'
import { InvalidPaymentChange, OrderNotFound } from '../../domain/errors/order-errors'
import { Money } from '../../domain/value-objects/money'
import { OrderId } from '../../domain/value-objects/order-id'
import { PaymentIntent, type PaymentStatusValue } from '../../domain/value-objects/payment-intent'
import type { Clock } from '../ports/clock'
import type { EventPublisher } from '../ports/event-publisher'
import type { OrderRepository } from '../ports/order.repository'

export type ChangePaymentMethodCommand = {
  orderId: string
  driverId: string
  newPaymentStatus: PaymentStatusValue
  yapeAmount?: number
  cashAmount?: number
  clientPaysWith?: number
}

export type ChangePaymentMethodResult = {
  id: string
  paymentStatus: string
  orderAmount: number
  yapeAmount: number | null
  cashAmount: number | null
  clientPaysWith: number | null
  changeToGive: number | null
}

export class ChangePaymentMethodUseCase
  implements UseCase<ChangePaymentMethodCommand, ChangePaymentMethodResult, DomainError>
{
  constructor(
    private readonly orders: OrderRepository,
    private readonly events: EventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(
    cmd: ChangePaymentMethodCommand,
  ): Promise<Result<ChangePaymentMethodResult, DomainError>> {
    const order = await this.orders.findById(OrderId.of(cmd.orderId))
    if (!order) return Result.fail(new OrderNotFound(cmd.orderId))

    // Autorización: solo el driver asignado al pedido puede cambiar el pago.
    if (order.driverId?.value !== cmd.driverId) return Result.fail(new OrderNotFound(cmd.orderId))

    const previousStatus = order.status

    let newPayment: PaymentIntent
    try {
      newPayment = PaymentIntent.create(
        cmd.newPaymentStatus,
        order.payment.orderAmount,
        cmd.clientPaysWith != null ? Money.pen(cmd.clientPaysWith) : null,
        cmd.yapeAmount != null ? Money.pen(cmd.yapeAmount) : null,
        cmd.cashAmount != null ? Money.pen(cmd.cashAmount) : null,
      )
    } catch (err) {
      return Result.fail(new InvalidPaymentChange(err instanceof Error ? err.message : String(err)))
    }

    const res = order.changePaymentMethod(newPayment, this.clock.now())
    if (res.isFailure) return Result.fail(res.error)

    await this.orders.save(order, previousStatus)
    await this.events.publishAll(order.pullEvents())

    return Result.ok({
      id: order.id.value,
      paymentStatus: order.payment.status,
      orderAmount: order.payment.orderAmount.amount,
      yapeAmount: order.payment.yapeAmount?.amount ?? null,
      cashAmount: order.payment.cashAmount?.amount ?? null,
      clientPaysWith: order.payment.clientPaysWith?.amount ?? null,
      changeToGive: order.payment.changeToGive?.amount ?? null,
    })
  }
}
