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

export type EditOrderByRestaurantCommand = {
  orderId: string
  restaurantId: string
  clientName?: string | null
  paymentStatus?: PaymentStatusValue
  orderAmount?: number
  yapeAmount?: number
  cashAmount?: number
  clientPaysWith?: number
}

export type EditOrderByRestaurantResult = {
  id: string
  clientName: string | null
  paymentStatus: PaymentStatusValue
  orderAmount: number
  yapeAmount: number | null
  cashAmount: number | null
  clientPaysWith: number | null
  changeToGive: number | null
}

/**
 * Edita campos del pedido por parte del restaurante mientras el pedido aún
 * no haya sido recogido (waiting_driver, heading_to_restaurant,
 * waiting_at_restaurant). Reconstruye un PaymentIntent fresco mezclando los
 * valores actuales del pedido con los nuevos del request — campos no
 * proporcionados conservan el valor previo.
 */
export class EditOrderByRestaurantUseCase
  implements UseCase<EditOrderByRestaurantCommand, EditOrderByRestaurantResult, DomainError>
{
  constructor(
    private readonly orders: OrderRepository,
    private readonly events: EventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(
    cmd: EditOrderByRestaurantCommand,
  ): Promise<Result<EditOrderByRestaurantResult, DomainError>> {
    const order = await this.orders.findById(OrderId.of(cmd.orderId))
    if (!order) return Result.fail(new OrderNotFound(cmd.orderId))

    // Autorización: el pedido debe pertenecer al restaurante autenticado.
    // Devolvemos OrderNotFound (en vez de un error específico) para no
    // filtrar la existencia del pedido a otros restaurantes.
    if (order.restaurantId.value !== cmd.restaurantId)
      return Result.fail(new OrderNotFound(cmd.orderId))

    const previousStatus = order.status
    const currentPayment = order.payment

    // Construye el nuevo PaymentIntent: si el request trae paymentStatus,
    // lo usa; si no, mantiene el actual. Idem para amounts. El VO valida
    // cruzadamente las reglas (yape+cash=order, clientPaysWith>=cash, etc.).
    const newStatus: PaymentStatusValue = cmd.paymentStatus ?? currentPayment.status
    const newOrderAmount =
      cmd.orderAmount !== undefined ? Money.pen(cmd.orderAmount) : currentPayment.orderAmount

    // Reglas de coexistencia: yape/cash solo aplican a pending_mixed; si el
    // método final NO es mixto, ignoramos lo que venga (el VO también lo
    // validaría pero preferimos no propagar inconsistencias del cliente).
    const isMixed = newStatus === 'pending_mixed'
    const newYape = isMixed
      ? cmd.yapeAmount !== undefined
        ? Money.pen(cmd.yapeAmount)
        : currentPayment.yapeAmount
      : null
    const newCash = isMixed
      ? cmd.cashAmount !== undefined
        ? Money.pen(cmd.cashAmount)
        : currentPayment.cashAmount
      : null

    // clientPaysWith: aplica a pending_cash y pending_mixed.
    const needsClientPaysWith = newStatus === 'pending_cash' || newStatus === 'pending_mixed'
    const newClientPaysWith = needsClientPaysWith
      ? cmd.clientPaysWith !== undefined
        ? Money.pen(cmd.clientPaysWith)
        : currentPayment.clientPaysWith
      : null

    let newPayment: PaymentIntent
    try {
      newPayment = PaymentIntent.create(
        newStatus,
        newOrderAmount,
        newClientPaysWith,
        newYape,
        newCash,
      )
    } catch (err) {
      return Result.fail(new InvalidPaymentChange(err instanceof Error ? err.message : String(err)))
    }

    const newClientName = cmd.clientName === undefined ? order.clientName : cmd.clientName

    const res = order.editByRestaurant(newClientName, newPayment, this.clock.now())
    if (res.isFailure) return Result.fail(res.error)

    await this.orders.save(order, previousStatus)
    await this.events.publishAll(order.pullEvents())

    return Result.ok({
      id: order.id.value,
      clientName: order.clientName,
      paymentStatus: order.payment.status,
      orderAmount: order.payment.orderAmount.amount,
      yapeAmount: order.payment.yapeAmount?.amount ?? null,
      cashAmount: order.payment.cashAmount?.amount ?? null,
      clientPaysWith: order.payment.clientPaysWith?.amount ?? null,
      changeToGive: order.payment.changeToGive?.amount ?? null,
    })
  }
}
