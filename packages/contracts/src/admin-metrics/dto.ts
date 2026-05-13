import { z } from 'zod'

export const MetricsRangeQuery = z.object({
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
})
export type MetricsRangeQuery = z.infer<typeof MetricsRangeQuery>

export const MetricsRangeEnvelope = z.object({
  from: z.string().datetime({ offset: true }),
  to: z.string().datetime({ offset: true }),
})
export type MetricsRangeEnvelope = z.infer<typeof MetricsRangeEnvelope>

export const SalesTimeseriesPoint = z.object({
  day: z.string(),
  orders: z.number().int(),
  delivered: z.number().int(),
  cancelled: z.number().int(),
  gmv: z.number(),
  commission: z.number(),
  aov: z.number(),
  cashOrders: z.number().int(),
  yapeOrders: z.number().int(),
  mixedOrders: z.number().int(),
  prepaidOrders: z.number().int(),
  marketplaceOrders: z.number().int(),
  restaurantOrders: z.number().int(),
})
export type SalesTimeseriesPoint = z.infer<typeof SalesTimeseriesPoint>

export const SalesTimeseriesResponse = z.object({
  range: MetricsRangeEnvelope,
  totals: z.object({
    orders: z.number().int(),
    delivered: z.number().int(),
    cancelled: z.number().int(),
    gmv: z.number(),
    commission: z.number(),
    aov: z.number(),
  }),
  points: z.array(SalesTimeseriesPoint),
})
export type SalesTimeseriesResponse = z.infer<typeof SalesTimeseriesResponse>

export const DriverPerformanceRow = z.object({
  driverId: z.string().uuid(),
  fullName: z.string(),
  vehicleType: z.string(),
  isActive: z.boolean(),
  delivered: z.number().int(),
  cancelled: z.number().int(),
  totalAssigned: z.number().int(),
  gmvDelivered: z.number(),
  commissionGenerated: z.number(),
  cashCollected: z.number(),
  avgDeliveryMinutes: z.number().nullable(),
  avgPickupToDeliverMinutes: z.number().nullable(),
  rejectionsCount: z.number().int(),
})
export type DriverPerformanceRow = z.infer<typeof DriverPerformanceRow>

export const DriversPerformanceResponse = z.object({
  range: MetricsRangeEnvelope,
  rows: z.array(DriverPerformanceRow),
})
export type DriversPerformanceResponse = z.infer<typeof DriversPerformanceResponse>

export const RestaurantPerformanceRow = z.object({
  restaurantId: z.string().uuid(),
  name: z.string(),
  accentColor: z.string(),
  commissionPerOrder: z.number(),
  balanceDue: z.number(),
  delivered: z.number().int(),
  cancelled: z.number().int(),
  total: z.number().int(),
  gmv: z.number(),
  commission: z.number(),
  aov: z.number(),
  avgPrepMinutes: z.number().nullable(),
  uniquePhones: z.number().int(),
  repeatPhones: z.number().int(),
})
export type RestaurantPerformanceRow = z.infer<typeof RestaurantPerformanceRow>

export const RestaurantsPerformanceResponse = z.object({
  range: MetricsRangeEnvelope,
  rows: z.array(RestaurantPerformanceRow),
})
export type RestaurantsPerformanceResponse = z.infer<typeof RestaurantsPerformanceResponse>

export const HeatmapCell = z.object({
  dow: z.number().int().min(0).max(6),
  hour: z.number().int().min(0).max(23),
  orders: z.number().int(),
  delivered: z.number().int(),
  cancelled: z.number().int(),
})
export type HeatmapCell = z.infer<typeof HeatmapCell>

export const DemandHeatmapResponse = z.object({
  range: MetricsRangeEnvelope,
  cells: z.array(HeatmapCell),
  maxOrders: z.number().int(),
})
export type DemandHeatmapResponse = z.infer<typeof DemandHeatmapResponse>

export const OperationsFunnelResponse = z.object({
  range: MetricsRangeEnvelope,
  totalDelivered: z.number().int(),
  avgMinToAssign: z.number().nullable(),
  avgMinToAccept: z.number().nullable(),
  avgMinInRouteToRestaurant: z.number().nullable(),
  avgMinWaitAtRestaurant: z.number().nullable(),
  avgMinPickupToDeliver: z.number().nullable(),
  avgMinTotal: z.number().nullable(),
  p50MinTotal: z.number().nullable(),
  p90MinTotal: z.number().nullable(),
  p95MinTotal: z.number().nullable(),
  onTimeCount: z.number().int(),
  onTimePct: z.number().nullable(),
})
export type OperationsFunnelResponse = z.infer<typeof OperationsFunnelResponse>

export const CancellationReasonRow = z.object({
  cancelReasonCode: z.string(),
  count: z.number().int(),
  avgAmountLost: z.number(),
})
export type CancellationReasonRow = z.infer<typeof CancellationReasonRow>

export const CancellationReasonsResponse = z.object({
  range: MetricsRangeEnvelope,
  rows: z.array(CancellationReasonRow),
  total: z.number().int(),
  unspecifiedPct: z.number(),
})
export type CancellationReasonsResponse = z.infer<typeof CancellationReasonsResponse>

export const MetricsSummaryResponse = z.object({
  range: MetricsRangeEnvelope,
  orders: z.number().int(),
  delivered: z.number().int(),
  cancelled: z.number().int(),
  cancellationPct: z.number(),
  gmv: z.number(),
  commission: z.number(),
  aov: z.number(),
  uniquePhones: z.number().int(),
  repeatPhones: z.number().int(),
  repeatRatePct: z.number(),
  activeDrivers: z.number().int(),
  activeRestaurants: z.number().int(),
})
export type MetricsSummaryResponse = z.infer<typeof MetricsSummaryResponse>
