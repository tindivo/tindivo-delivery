import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@tindivo/supabase'
import {
  AcceptOrderUseCase,
  CancelOrderUseCase,
  CreateOrderUseCase,
  MarkArrivedUseCase,
  MarkDeliveredUseCase,
  MarkPickedUpUseCase,
  RequestExtensionUseCase,
  SupabaseEventPublisher,
  SupabaseOrderRepository,
  SystemClock,
} from '@tindivo/core/modules/orders'

const clock = new SystemClock()

const publicAppUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3005'

function deps(sb: SupabaseClient<Database>) {
  return {
    orders: new SupabaseOrderRepository(sb),
    events: new SupabaseEventPublisher(sb),
    clock,
  }
}

export function buildCreateOrderUseCase(sb: SupabaseClient<Database>) {
  const { orders, events } = deps(sb)
  return new CreateOrderUseCase(orders, events, clock)
}

export function buildAcceptOrderUseCase(sb: SupabaseClient<Database>) {
  const { orders, events } = deps(sb)
  return new AcceptOrderUseCase(orders, events, clock)
}

export function buildMarkArrivedUseCase(sb: SupabaseClient<Database>) {
  const { orders, events } = deps(sb)
  return new MarkArrivedUseCase(orders, events, clock)
}

export function buildMarkPickedUpUseCase(sb: SupabaseClient<Database>) {
  const { orders, events } = deps(sb)
  return new MarkPickedUpUseCase(orders, events, clock, publicAppUrl)
}

export function buildMarkDeliveredUseCase(sb: SupabaseClient<Database>) {
  const { orders, events } = deps(sb)
  return new MarkDeliveredUseCase(orders, events, clock)
}

export function buildCancelOrderUseCase(sb: SupabaseClient<Database>) {
  const { orders, events } = deps(sb)
  return new CancelOrderUseCase(orders, events, clock)
}

export function buildRequestExtensionUseCase(sb: SupabaseClient<Database>) {
  const { orders, events } = deps(sb)
  return new RequestExtensionUseCase(orders, events, clock)
}
