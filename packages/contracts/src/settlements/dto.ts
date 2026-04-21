import { z } from 'zod'
import { MoneyPenSchema, TimestampSchema, UuidSchema } from '../common'
import { SettlementStatus } from '../enums'

export const GenerateSettlementsRequest = z.object({
  periodStart: z.string().date(),
  periodEnd: z.string().date(),
  dueDate: z.string().date(),
  excludeRestaurantIds: z.array(UuidSchema).optional(),
})
export type GenerateSettlementsRequest = z.infer<typeof GenerateSettlementsRequest>

export const MarkSettlementPaidRequest = z.object({
  paymentMethod: z.enum(['yape', 'plin', 'cash', 'bank_transfer', 'other']),
  paymentNote: z.string().max(300).optional(),
})
export type MarkSettlementPaidRequest = z.infer<typeof MarkSettlementPaidRequest>

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
