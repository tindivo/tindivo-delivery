import {
  AcceptOrderUseCase,
  CancelOrderUseCase,
  ChangePaymentMethodUseCase,
  CreateOrderUseCase,
  MarkArrivedUseCase,
  MarkDeliveredUseCase,
  MarkPickedUpUseCase,
  MarkReadyEarlyUseCase,
  MarkReceivedUseCase,
  RequestExtensionUseCase,
  SupabaseEventPublisher,
  SupabaseOrderRepository,
  SystemClock,
} from '@tindivo/core/modules/orders'
import type { ServerClient } from '@tindivo/supabase'

const clock = new SystemClock()

const publicAppUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3005'

function deps(sb: ServerClient) {
  return {
    orders: new SupabaseOrderRepository(sb),
    events: new SupabaseEventPublisher(sb),
    clock,
  }
}

export function buildCreateOrderUseCase(sb: ServerClient) {
  const { orders, events } = deps(sb)
  return new CreateOrderUseCase(orders, events, clock)
}

export function buildAcceptOrderUseCase(sb: ServerClient) {
  const { orders, events } = deps(sb)
  return new AcceptOrderUseCase(orders, events, clock)
}

export function buildMarkArrivedUseCase(sb: ServerClient) {
  const { orders, events } = deps(sb)
  return new MarkArrivedUseCase(orders, events, clock)
}

export function buildMarkPickedUpUseCase(sb: ServerClient) {
  const { orders, events } = deps(sb)
  return new MarkPickedUpUseCase(orders, events, clock, publicAppUrl)
}

export function buildMarkReceivedUseCase(sb: ServerClient) {
  const { orders, events } = deps(sb)
  return new MarkReceivedUseCase(orders, events, clock)
}

export function buildMarkDeliveredUseCase(sb: ServerClient) {
  const { orders, events } = deps(sb)
  return new MarkDeliveredUseCase(orders, events, clock)
}

export function buildCancelOrderUseCase(sb: ServerClient) {
  const { orders, events } = deps(sb)
  return new CancelOrderUseCase(orders, events, clock)
}

export function buildRequestExtensionUseCase(sb: ServerClient) {
  const { orders, events } = deps(sb)
  return new RequestExtensionUseCase(orders, events, clock)
}

export function buildMarkReadyEarlyUseCase(sb: ServerClient) {
  const { orders, events } = deps(sb)
  return new MarkReadyEarlyUseCase(orders, events, clock)
}

export function buildChangePaymentMethodUseCase(sb: ServerClient) {
  const { orders, events } = deps(sb)
  return new ChangePaymentMethodUseCase(orders, events, clock)
}
