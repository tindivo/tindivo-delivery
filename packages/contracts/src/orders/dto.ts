import { z } from 'zod'
import {
  AccentColorSchema,
  CoordinatesSchema,
  MoneyPenSchema,
  PhonePeSchema,
  ShortIdSchema,
  TimestampSchema,
  UuidSchema,
} from '../common'
import { CancellationReason, OrderStatus, PaymentStatus } from '../enums'

/* ─────────────── Request DTOs ─────────────── */

export const CreateOrderRequest = z
  .object({
    prepMinutes: z.number().int().min(5).max(120),
    paymentStatus: PaymentStatus,
    orderAmount: MoneyPenSchema,
    clientPaysWith: MoneyPenSchema.optional(),
    notes: z.string().max(300).optional(),
  })
  .refine(
    (v) =>
      v.paymentStatus !== 'pending_cash' ||
      (v.clientPaysWith !== undefined && v.clientPaysWith >= v.orderAmount),
    {
      message: 'clientPaysWith requerido y ≥ orderAmount cuando paymentStatus es pending_cash',
      path: ['clientPaysWith'],
    },
  )
export type CreateOrderRequest = z.infer<typeof CreateOrderRequest>

export const RequestExtensionRequest = z.object({
  additionalMinutes: z.union([z.literal(5), z.literal(10)]),
})
export type RequestExtensionRequest = z.infer<typeof RequestExtensionRequest>

export const CancelOrderRequest = z.object({
  reason: z.string().min(3).max(300),
  reasonCode: CancellationReason.optional(),
})
export type CancelOrderRequest = z.infer<typeof CancelOrderRequest>

export const MarkArrivedRequest = z.object({
  readyOnArrival: z.boolean().optional(),
})
export type MarkArrivedRequest = z.infer<typeof MarkArrivedRequest>

export const MarkPickedUpRequest = z.object({
  clientPhone: PhonePeSchema,
  deliveryCoordinates: CoordinatesSchema,
  deliveryAddress: z.string().max(200).optional(),
})
export type MarkPickedUpRequest = z.infer<typeof MarkPickedUpRequest>

export const EditClientPhoneRequest = z.object({
  clientPhone: PhonePeSchema,
  reason: z.string().min(3).max(300),
})
export type EditClientPhoneRequest = z.infer<typeof EditClientPhoneRequest>

export const ReassignOrderRequest = z.object({
  newDriverId: UuidSchema,
  reason: z.string().min(3).max(300),
})
export type ReassignOrderRequest = z.infer<typeof ReassignOrderRequest>

export const AdminOrderFiltersRequest = z.object({
  status: OrderStatus.optional(),
  restaurantId: UuidSchema.optional(),
  driverId: UuidSchema.optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  search: z.string().max(100).optional(),
})
export type AdminOrderFiltersRequest = z.infer<typeof AdminOrderFiltersRequest>

/* ─────────────── Response DTOs ─────────────── */

export const OrderSummaryResponse = z.object({
  id: UuidSchema,
  shortId: ShortIdSchema,
  status: OrderStatus,
  restaurantId: UuidSchema,
  restaurantName: z.string(),
  restaurantAccentColor: AccentColorSchema,
  driverId: UuidSchema.nullable(),
  driverName: z.string().nullable(),
  orderAmount: MoneyPenSchema,
  deliveryFee: MoneyPenSchema,
  paymentStatus: PaymentStatus,
  prepMinutes: z.number().int(),
  estimatedReadyAt: TimestampSchema,
  appearsInQueueAt: TimestampSchema,
  clientPhone: PhonePeSchema.nullable(),
  trackingLinkSentAt: TimestampSchema.nullable(),
  createdAt: TimestampSchema,
})
export type OrderSummaryResponse = z.infer<typeof OrderSummaryResponse>

export const OrderStatusChangeResponse = z.object({
  status: OrderStatus,
  changedAt: TimestampSchema,
  changedBy: UuidSchema.nullable(),
  notes: z.string().nullable(),
})
export type OrderStatusChangeResponse = z.infer<typeof OrderStatusChangeResponse>

export const OrderDetailResponse = OrderSummaryResponse.extend({
  clientPaysWith: MoneyPenSchema.nullable(),
  changeToGive: MoneyPenSchema.nullable(),
  deliveryCoordinates: CoordinatesSchema.nullable(),
  deliveryMapsUrl: z.string().url().nullable(),
  deliveryAddress: z.string().nullable(),
  cancelReason: z.string().nullable(),
  extensionUsed: z.boolean(),
  readyEarlyUsed: z.boolean(),
  statusHistory: z.array(OrderStatusChangeResponse),
  acceptedAt: TimestampSchema.nullable(),
  headingAt: TimestampSchema.nullable(),
  waitingAt: TimestampSchema.nullable(),
  pickedUpAt: TimestampSchema.nullable(),
  deliveredAt: TimestampSchema.nullable(),
  cancelledAt: TimestampSchema.nullable(),
})
export type OrderDetailResponse = z.infer<typeof OrderDetailResponse>

export const CreateOrderResponse = z.object({
  id: UuidSchema,
  shortId: ShortIdSchema,
  status: OrderStatus,
  estimatedReadyAt: TimestampSchema,
  appearsInQueueAt: TimestampSchema,
  changeToGive: MoneyPenSchema.nullable(),
})
export type CreateOrderResponse = z.infer<typeof CreateOrderResponse>

export const AcceptOrderResponse = z.object({
  id: UuidSchema,
  status: OrderStatus,
  acceptedAt: TimestampSchema,
})
export type AcceptOrderResponse = z.infer<typeof AcceptOrderResponse>

export const PickedUpResponse = z.object({
  id: UuidSchema,
  status: OrderStatus,
  pickedUpAt: TimestampSchema,
  deliveryMapsUrl: z.string().url(),
  trackingUrl: z.string().url(),
})
export type PickedUpResponse = z.infer<typeof PickedUpResponse>
