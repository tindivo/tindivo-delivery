/**
 * Catálogo centralizado de canales Realtime de Supabase.
 * Una sola fuente de verdad para nombres de canales.
 */

export const RealtimeChannels = {
  /* postgres_changes */
  restaurantOrders: (restaurantId: string) => `restaurant:${restaurantId}:orders`,
  restaurantCash: (restaurantId: string) => `restaurant:${restaurantId}:cash`,
  driverAvailableOrders: 'driver:available-orders',
  driverOrders: (driverId: string) => `driver:${driverId}:orders`,
  driverAvailability: (driverId: string) => `driver:${driverId}:availability`,
  adminOrders: 'admin:orders',
  adminCashDisputed: 'admin:cash-disputed',
  adminDriversAvailability: 'admin:drivers-availability',
  adminAlertsTable: 'admin:alerts-table',
  trackingByShortId: (shortId: string) => `tracking:${shortId}`,

  /* broadcast (emitido desde backend) */
  adminAlerts: 'admin:alerts',
  driverEvents: (driverId: string) => `driver:${driverId}:events`,
  restaurantEvents: (restaurantId: string) => `restaurant:${restaurantId}:events`,
} as const

export const BroadcastEvents = {
  orderUnacceptedWarning: 'order.unaccepted-90s',
  driverOfflineWithOrders: 'driver.offline-with-orders',
  restaurantBlockedAttempt: 'restaurant.blocked-attempt',
  orderCancelledByAdmin: 'order.cancelled-by-admin',
  orderCancelledByRestaurant: 'order.cancelled-by-restaurant',
  orderReassignedAway: 'order.reassigned-away',
  orderReassignedTo: 'order.reassigned-to',
  driverArrived: 'driver.arrived',
  orderAccepted: 'order.accepted',
  cashDisputeOpened: 'cash.dispute-opened',
  cashDisputeResolved: 'cash.dispute-resolved',
} as const
