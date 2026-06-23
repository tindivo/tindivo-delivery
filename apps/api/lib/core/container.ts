import {
  GetMyProfileUseCase,
  ListMyOrdersUseCase,
  ReorderMyOrderUseCase,
  SupabaseCustomerProfileRepository,
  UpdateMyProfileUseCase,
} from '@tindivo/core/modules/customer-account'
import {
  AcceptOrderByRestaurantUseCase,
  AcceptOrderUseCase,
  AcceptTransferRequestUseCase,
  AutoAcceptExpiredTransferRequestsUseCase,
  AutoAssignOrderUseCase,
  CancelOrderUseCase,
  ChangePaymentMethodUseCase,
  ClaimUrgentOrderUseCase,
  CreateOrderUseCase,
  EditOrderByRestaurantUseCase,
  MarkArrivedUseCase,
  MarkDeliveredUseCase,
  MarkPickedUpUseCase,
  MarkReadyEarlyUseCase,
  MarkReceivedUseCase,
  RejectOrderAssignmentUseCase,
  RejectTransferRequestUseCase,
  RequestExtensionUseCase,
  RequestOrderTransferUseCase,
  SaveCustomerDataUseCase,
  SupabaseAssignmentRulesRepository,
  SupabaseCustomerAddressRepository,
  SupabaseDriverRepository,
  SupabaseEventPublisher,
  SupabaseOrderRepository,
  SupabaseRejectionsRepository,
  SupabaseTransferRequestsRepository,
  SystemClock,
  TransferOrderToDriverUseCase,
} from '@tindivo/core/modules/orders'
import {
  CheckPlatformScheduleUseCase,
  SupabasePlatformSettingsRepository,
} from '@tindivo/core/modules/platform'
import { type ServerClient, createAdminClient } from '@tindivo/supabase'

const clock = new SystemClock()

const publicAppUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3005'

function deps(sb: ServerClient) {
  // El DriverRepository SIEMPRE usa el admin client porque las tablas
  // `drivers`, `driver_availability` y `driver_restaurants` tienen RLS
  // habilitado sin policies — bajo el JWT del driver, los SELECTs sobre
  // esas tablas vuelven vacíos. El use case ya valida autorización via
  // requireAuth + comparación contra order.driverId.
  return {
    orders: new SupabaseOrderRepository(sb),
    assignmentRules: new SupabaseAssignmentRulesRepository(sb),
    rejections: new SupabaseRejectionsRepository(sb),
    driversRepo: new SupabaseDriverRepository(createAdminClient()),
    events: new SupabaseEventPublisher(sb),
    clock,
  }
}

export function buildCreateOrderUseCase(sb: ServerClient) {
  const { orders, events } = deps(sb)
  const customerAddresses = new SupabaseCustomerAddressRepository(sb)
  return new CreateOrderUseCase(orders, customerAddresses, events, clock)
}

export function buildAcceptOrderUseCase(sb: ServerClient) {
  const { orders, assignmentRules, events } = deps(sb)
  return new AcceptOrderUseCase(orders, assignmentRules, events, clock)
}

export function buildClaimUrgentOrderUseCase(_sb: ServerClient) {
  // Cross-driver mutation (asigna driver_id al invocador): RLS de orders
  // rechazaría el UPDATE bajo el JWT del driver. Usar admin client. Auth
  // via requireAuth + canDriverServe garantiza que solo drivers asignados
  // al restaurante pueden tomar el pedido.
  const admin = createAdminClient()
  return new ClaimUrgentOrderUseCase(
    new SupabaseOrderRepository(admin),
    new SupabaseDriverRepository(admin),
    new SupabaseAssignmentRulesRepository(admin),
    new SupabaseEventPublisher(admin),
    clock,
  )
}

// Builders del flujo "Equipo" — request-based transfer entre motorizados.
// TODOS usan admin client porque:
// 1. La tabla order_transfer_requests no tiene policy de INSERT/UPDATE
//    para drivers (solo SELECT — ver migration 20260515000000).
// 2. AcceptTransferRequestUseCase muta orders.driver_id (cross-driver).
// 3. RequestOrderTransferUseCase lee driver_restaurants (RLS restrictiva).
function teamDeps() {
  const admin = createAdminClient()
  return {
    orders: new SupabaseOrderRepository(admin),
    drivers: new SupabaseDriverRepository(admin),
    transferRequests: new SupabaseTransferRequestsRepository(admin),
    assignmentRules: new SupabaseAssignmentRulesRepository(admin),
    events: new SupabaseEventPublisher(admin),
  }
}

export function buildRequestOrderTransferUseCase(_sb: ServerClient) {
  const { orders, drivers, transferRequests, assignmentRules, events } = teamDeps()
  return new RequestOrderTransferUseCase(
    orders,
    drivers,
    transferRequests,
    assignmentRules,
    events,
    clock,
  )
}

export function buildAcceptTransferRequestUseCase(_sb: ServerClient) {
  const { orders, drivers, transferRequests, assignmentRules, events } = teamDeps()
  return new AcceptTransferRequestUseCase(
    orders,
    drivers,
    transferRequests,
    assignmentRules,
    events,
    clock,
  )
}

export function buildRejectTransferRequestUseCase(_sb: ServerClient) {
  const { orders, transferRequests, events } = teamDeps()
  return new RejectTransferRequestUseCase(orders, transferRequests, events, clock)
}

export function buildAutoAcceptExpiredTransferRequestsUseCase(_sb: ServerClient) {
  // Invocado por el cron `process-expired-transfer-requests` via endpoint
  // interno. Reusa `teamDeps()` (admin client) porque muta orders.driver_id
  // cross-driver y lee `driver_restaurants` con RLS restrictiva.
  const { orders, drivers, transferRequests, assignmentRules, events } = teamDeps()
  return new AutoAcceptExpiredTransferRequestsUseCase(
    orders,
    drivers,
    transferRequests,
    assignmentRules,
    events,
    clock,
  )
}

export function buildAutoAssignOrderUseCase(sb: ServerClient) {
  const { orders, assignmentRules, rejections, events } = deps(sb)
  return new AutoAssignOrderUseCase(orders, assignmentRules, events, clock, rejections)
}

export function buildRejectOrderAssignmentUseCase(sb: ServerClient) {
  const { orders, rejections, events } = deps(sb)
  return new RejectOrderAssignmentUseCase(orders, rejections, events, clock)
}

export function buildTransferOrderToDriverUseCase(_sb: ServerClient) {
  // Como en AutoAssign, este use case ejecuta una mutación cross-driver
  // (cambia `orders.driver_id` al destinatario). Bajo el JWT del invocador,
  // la RLS de `orders` rechaza el UPDATE porque el WITH CHECK exige que el
  // driver_id sea el current driver. La autorización ya la valida
  // `requireAuth` + el guard `order.driverId === fromDriverId` en el use case.
  const admin = createAdminClient()
  return new TransferOrderToDriverUseCase(
    new SupabaseOrderRepository(admin),
    new SupabaseDriverRepository(admin),
    new SupabaseAssignmentRulesRepository(admin),
    new SupabaseEventPublisher(admin),
    clock,
  )
}

export function getDriverRepository(_sb: ServerClient) {
  // Ver nota en deps(): se ignora `_sb` y siempre se crea con admin.
  return new SupabaseDriverRepository(createAdminClient())
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
  const { orders, assignmentRules, events } = deps(sb)
  return new MarkPickedUpUseCase(orders, events, clock, publicAppUrl, assignmentRules)
}

export function buildMarkReceivedUseCase(sb: ServerClient) {
  const { orders, events } = deps(sb)
  return new MarkReceivedUseCase(orders, events, clock)
}

export function buildMarkDeliveredUseCase(sb: ServerClient) {
  const { orders, events } = deps(sb)
  const customerAddresses = new SupabaseCustomerAddressRepository(sb)
  return new MarkDeliveredUseCase(orders, customerAddresses, events, clock)
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
