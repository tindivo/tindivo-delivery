import { describe, expect, it } from 'vitest'
import { DriverId } from '../value-objects/driver-id'
import { Money } from '../value-objects/money'
import { OccupancySlots } from '../value-objects/occupancy-slots'
import { OrderId } from '../value-objects/order-id'
import { OrderStatus } from '../value-objects/order-status'
import { PaymentIntent } from '../value-objects/payment-intent'
import { PrepTime } from '../value-objects/prep-time'
import { RestaurantId } from '../value-objects/restaurant-id'
import { ShortId } from '../value-objects/short-id'
import { Order, type OrderProps } from './order'

const RESTAURANT_ID = '11111111-1111-1111-1111-111111111111'
const DRIVER_ID = '22222222-2222-2222-2222-222222222222'
const NOW = new Date('2026-05-04T12:00:00.000Z')

function pickedUpOrder(payment: PaymentIntent): Order {
  const props: OrderProps = {
    id: OrderId.generate(),
    shortId: ShortId.generate(),
    restaurantId: RestaurantId.of(RESTAURANT_ID),
    driverId: DriverId.of(DRIVER_ID),
    status: OrderStatus.of('picked_up'),
    source: 'restaurant_pwa',
    prepTime: PrepTime.of(15),
    payment,
    deliveryFee: Money.pen(5),
    appearsInQueueAt: NOW,
    estimatedReadyAt: NOW,
    clientPhone: null,
    clientName: null,
    deliveryCoordinates: null,
    deliveryMapsUrl: null,
    deliveryAddress: null,
    deliveryReference: null,
    extensionUsed: false,
    readyEarlyUsed: false,
    notes: null,
    trackingLinkSentAt: null,
    trackingLinkSentBy: null,
    pendingAcceptanceAt: null,
    restaurantAcceptedAt: null,
    restaurantAcceptedPrepMinutes: null,
    acceptedAt: NOW,
    headingAt: NOW,
    waitingAt: NOW,
    receivedAt: NOW,
    pickedUpAt: NOW,
    deliveredAt: null,
    cancelledAt: null,
    cancelReason: null,
    acceptCountdownSeconds: 0,
    prepExtendedAt: null,
    prepExtensionMinutes: null,
    readyEarlyAt: null,
    occupancySlots: OccupancySlots.default(),
    deliveryDistanceBand: null,
    cashOwedAtDelivery: null,
    urgentSince: null,
    createdAt: NOW,
    updatedAt: NOW,
  }
  return Order.rehydrate(props)
}

describe('Order.markDelivered — cashOwedAtDelivery formula', () => {
  it('caso 1: original cash, final cash igual (cliente paga con S/50, vuelto S/30)', () => {
    const payment = PaymentIntent.create(
      'pending_cash',
      Money.pen(20),
      Money.pen(50),
      null,
      null,
      'pending_cash',
      false,
    )
    const order = pickedUpOrder(payment)
    const result = order.markDelivered(NOW, { kind: 'unchanged' })
    expect(result.isSuccess).toBe(true)
    expect(order.props.cashOwedAtDelivery?.amount).toBe(50)
  })

  it('caso 1b: original cash, cliente pagó exacto (mantiene vuelto en mano)', () => {
    const payment = PaymentIntent.create(
      'pending_cash',
      Money.pen(20),
      Money.pen(50),
      null,
      null,
      'pending_cash',
      false,
    )
    const order = pickedUpOrder(payment)
    const result = order.markDelivered(NOW, { kind: 'cash_exact' })
    expect(result.isSuccess).toBe(true)
    expect(order.props.cashOwedAtDelivery?.amount).toBe(50)
    expect(order.payment.clientPaidExactAtDelivery).toBe(true)
    // payment_status_at_creation preserved
    expect(order.payment.paymentStatusAtCreation).toBe('pending_cash')
  })

  it('caso 2: original yape, final cash con vuelto (driver no tenía adelanto)', () => {
    const payment = PaymentIntent.create(
      'pending_yape',
      Money.pen(20),
      null,
      null,
      null,
      'pending_yape',
      false,
    )
    const order = pickedUpOrder(payment)
    const result = order.markDelivered(NOW, {
      kind: 'change_to',
      paymentStatus: 'pending_cash',
      clientPaysWith: 50,
    })
    expect(result.isSuccess).toBe(true)
    expect(order.props.cashOwedAtDelivery?.amount).toBe(20)
    expect(order.payment.paymentStatusAtCreation).toBe('pending_yape')
  })

  it('caso 2b: original yape, final cash exacto (cliente paga exacto sin adelanto previo)', () => {
    const payment = PaymentIntent.create(
      'pending_yape',
      Money.pen(20),
      null,
      null,
      null,
      'pending_yape',
      false,
    )
    const order = pickedUpOrder(payment)
    const result = order.markDelivered(NOW, {
      kind: 'change_to',
      paymentStatus: 'pending_cash',
      clientPaysWith: 20,
    })
    expect(result.isSuccess).toBe(true)
    expect(order.props.cashOwedAtDelivery?.amount).toBe(20)
  })

  it('caso 3: original cash con vuelto S/30, final yape (driver devuelve el adelanto)', () => {
    const payment = PaymentIntent.create(
      'pending_cash',
      Money.pen(20),
      Money.pen(50),
      null,
      null,
      'pending_cash',
      false,
    )
    const order = pickedUpOrder(payment)
    const result = order.markDelivered(NOW, {
      kind: 'change_to',
      paymentStatus: 'pending_yape',
    })
    expect(result.isSuccess).toBe(true)
    expect(order.props.cashOwedAtDelivery?.amount).toBe(30)
  })

  it('caso 3b: original cash exacto (sin adelanto), final yape (driver no liquida nada)', () => {
    const payment = PaymentIntent.create(
      'pending_cash',
      Money.pen(20),
      Money.pen(20),
      null,
      null,
      'pending_cash',
      false,
    )
    const order = pickedUpOrder(payment)
    const result = order.markDelivered(NOW, {
      kind: 'change_to',
      paymentStatus: 'pending_yape',
    })
    expect(result.isSuccess).toBe(true)
    expect(order.props.cashOwedAtDelivery?.amount).toBe(0)
  })

  it('rechaza kind:cash_exact si no había vuelto', () => {
    const payment = PaymentIntent.create(
      'pending_cash',
      Money.pen(20),
      Money.pen(20), // exacto, change_to_give=0
      null,
      null,
      'pending_cash',
      false,
    )
    const order = pickedUpOrder(payment)
    const result = order.markDelivered(NOW, { kind: 'cash_exact' })
    expect(result.isFailure).toBe(true)
  })

  it('rechaza kind:change_to con prepaid como destino', () => {
    const payment = PaymentIntent.create('pending_yape', Money.pen(20), null)
    const order = pickedUpOrder(payment)
    const result = order.markDelivered(NOW, {
      kind: 'change_to',
      paymentStatus: 'prepaid',
    })
    expect(result.isFailure).toBe(true)
  })

  it('emite PaymentChangedAtDelivery solo cuando hay cambio efectivo', () => {
    const payment = PaymentIntent.create('pending_yape', Money.pen(20), null)
    const order = pickedUpOrder(payment)
    order.markDelivered(NOW, { kind: 'unchanged' })
    const events = order.pullEvents().map((e) => e.eventType)
    expect(events).toContain('OrderDelivered')
    expect(events).not.toContain('PaymentChangedAtDelivery')
  })

  it('emite PaymentChangedAtDelivery cuando cliente paga exacto', () => {
    const payment = PaymentIntent.create('pending_cash', Money.pen(20), Money.pen(50))
    const order = pickedUpOrder(payment)
    order.markDelivered(NOW, { kind: 'cash_exact' })
    const events = order.pullEvents().map((e) => e.eventType)
    expect(events).toContain('OrderDelivered')
    expect(events).toContain('PaymentChangedAtDelivery')
  })

  it('caso pending_mixed: cashOwed = parte cash + advance', () => {
    // Mixto: yape 7 + cash 8 = 15. Cliente paga con S/10 sobre la parte cash.
    // change_to_give = 10 - 8 = 2 (advance).
    // unchanged: cashOwed = 2 + 10 - 2 = 10.
    const payment = PaymentIntent.create(
      'pending_mixed',
      Money.pen(15),
      Money.pen(10),
      Money.pen(7),
      Money.pen(8),
      'pending_mixed',
      false,
    )
    const order = pickedUpOrder(payment)
    const result = order.markDelivered(NOW, { kind: 'unchanged' })
    expect(result.isSuccess).toBe(true)
    expect(order.props.cashOwedAtDelivery?.amount).toBe(10)
  })

  it('prepaid permanece en 0', () => {
    const payment = PaymentIntent.create('prepaid', Money.pen(20))
    const order = pickedUpOrder(payment)
    const result = order.markDelivered(NOW, { kind: 'unchanged' })
    expect(result.isSuccess).toBe(true)
    expect(order.props.cashOwedAtDelivery?.amount).toBe(0)
  })
})
