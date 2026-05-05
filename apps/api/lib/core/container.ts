import {
  AcceptOrderByRestaurantUseCase,
  AcceptOrderUseCase,
  AutoAssignOrderUseCase,
  CancelOrderUseCase,
  ChangePaymentMethodUseCase,
  CreateOrderUseCase,
  EditOrderByRestaurantUseCase,
  MarkArrivedUseCase,
  MarkDeliveredUseCase,
  MarkPickedUpUseCase,
  MarkReadyEarlyUseCase,
  MarkReceivedUseCase,
  RequestExtensionUseCase,
  SaveCustomerDataUseCase,
  SupabaseAssignmentRulesRepository,
  SupabaseEventPublisher,
  SupabaseOrderRepository,
  SystemClock,
} from '@tindivo/core/modules/orders'
import {
  CheckPlatformScheduleUseCase,
  SupabasePlatformSettingsRepository,
} from '@tindivo/core/modules/platform'
import {
  GetMyProfileUseCase,
  ListMyOrdersUseCase,
  ReorderMyOrderUseCase,
  SupabaseCustomerProfileRepository,
  UpdateMyProfileUseCase,
} from '@tindivo/core/modules/customer-account'
import type { ServerClient } from '@tindivo/supabase'

const clock = new SystemClock()

const publicAppUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3005'

function deps(sb: ServerClient) {
  return {
    orders: new SupabaseOrderRepository(sb),
    assignmentRules: new SupabaseAssignmentRulesRepository(sb),
    events: new SupabaseEventPublisher(sb),
    clock,
  }
}

export function buildCreateOrderUseCase(sb: ServerClient) {
  const { orders, events } = deps(sb)
  return new CreateOrderUseCase(orders, events, clock)
}

export function buildAcceptOrderUseCase(sb: ServerClient) {
  const { orders, assignmentRules, events } = deps(sb)
  return new AcceptOrderUseCase(orders, assignmentRules, events, clock)
}

export function buildAutoAssignOrderUseCase(sb: ServerClient) {
  const { orders, assignmentRules, events } = deps(sb)
  return new AutoAssignOrderUseCase(orders, assignmentRules, events, clock)
}

export function buildAcceptOrderByRestaurantUseCase(sb: ServerClient) {
  const { orders, events } = deps(sb)
  return new AcceptOrderByRestaurantUseCase(orders, events, clock)
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

export function buildEditOrderByRestaurantUseCase(sb: ServerClient) {
  const { orders, events } = deps(sb)
  return new EditOrderByRestaurantUseCase(orders, events, clock)
}

export function buildSaveCustomerDataUseCase(sb: ServerClient) {
  const { orders, events } = deps(sb)
  return new SaveCustomerDataUseCase(orders, events, clock)
}

export function buildCheckPlatformScheduleUseCase(sb: ServerClient) {
  return new CheckPlatformScheduleUseCase(new SupabasePlatformSettingsRepository(sb), clock)
}

function customerDeps(sb: ServerClient) {
  return { repo: new SupabaseCustomerProfileRepository(sb) }
}

export function buildGetMyProfileUseCase(sb: ServerClient) {
  return new GetMyProfileUseCase(customerDeps(sb).repo)
}
export function buildUpdateMyProfileUseCase(sb: ServerClient) {
  return new UpdateMyProfileUseCase(customerDeps(sb).repo)
}
export function buildListMyOrdersUseCase(sb: ServerClient) {
  return new ListMyOrdersUseCase(customerDeps(sb).repo)
}
export function buildReorderMyOrderUseCase(sb: ServerClient) {
  return new ReorderMyOrderUseCase(customerDeps(sb).repo)
}
