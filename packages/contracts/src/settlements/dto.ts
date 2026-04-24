import { z } from 'zod'
import {
  AccentColorSchema,
  MoneyPenSchema,
  PhonePeSchema,
  TimestampSchema,
  UuidSchema,
} from '../common'
import { SettlementStatus } from '../enums'

export const PaymentMethodSchema = z.enum(['yape', 'plin', 'cash', 'bank_transfer', 'other'])
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>

export const GenerateSettlementsRequest = z.object({
  periodStart: z.string().date(),
  periodEnd: z.string().date(),
  dueDate: z.string().date(),
  excludeRestaurantIds: z.array(UuidSchema).optional(),
})
export type GenerateSettlementsRequest = z.infer<typeof GenerateSettlementsRequest>

export const MarkSettlementPaidRequest = z.object({
  paymentMethod: PaymentMethodSchema,
  paymentNote: z.string().max(300).optional(),
})
export type MarkSettlementPaidRequest = z.infer<typeof MarkSettlementPaidRequest>

/**
 * Fila que devuelve GET /admin/settlements (join con restaurant).
 * Snake_case porque es el row crudo de Supabase; el UI consume directo.
 */
export const AdminSettlementRow = z.object({
  id: UuidSchema,
  restaurant_id: UuidSchema,
  restaurant_name: z.string(),
  accent_color: AccentColorSchema,
  yape_number: PhonePeSchema.nullable(),
  period_start: z.string(),
  period_end: z.string(),
  due_date: z.string(),
  order_count: z.number().int(),
  total_amount: MoneyPenSchema,
  status: SettlementStatus,
  paid_at: TimestampSchema.nullable(),
  payment_method: z.string().nullable(),
  payment_note: z.string().nullable(),
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
})
export type AdminSettlementRow = z.infer<typeof AdminSettlementRow>

/**
 * Fila del resumen por restaurante (RPC admin_settlements_summary).
 * camelCase porque el handler API hace el mapper snake→camel.
 */
export const RestaurantDebtSummaryRow = z.object({
  restaurantId: UuidSchema,
  restaurantName: z.string(),
  accentColor: AccentColorSchema,
  yapeNumber: PhonePeSchema.nullable(),
  qrUrl: z.string().url().nullable(),
  balanceDue: MoneyPenSchema,
  pendingCount: z.number().int(),
  pendingAmount: MoneyPenSchema,
  overdueCount: z.number().int(),
  overdueAmount: MoneyPenSchema,
  lastPaidAt: TimestampSchema.nullable(),
})
export type RestaurantDebtSummaryRow = z.infer<typeof RestaurantDebtSummaryRow>

export const SettlementResponse = z.object({
  id: UuidSchema,
  restaurantId: UuidSchema,
  restaurantName: z.string(),
  periodStart: z.string().date(),
  periodEnd: z.string().date(),
  orderCount: z.number().int(),
  totalAmount: MoneyPenSchema,
  status: SettlementStatus,
  dueDate: z.string().date(),
  paidAt: TimestampSchema.nullable(),
  paymentMethod: z.string().nullable(),
  paymentNote: z.string().nullable(),
  createdAt: TimestampSchema,
})
export type SettlementResponse = z.infer<typeof SettlementResponse>
