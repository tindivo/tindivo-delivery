import { z } from 'zod'
import { MoneyPenSchema, TimestampSchema, UuidSchema } from '../common'
import { CashSettlementStatus } from '../enums'

export const DeliverCashRequest = z.object({
  amount: MoneyPenSchema,
})
export type DeliverCashRequest = z.infer<typeof DeliverCashRequest>

export const ConfirmCashRequest = z.object({
  receivedAmount: MoneyPenSchema,
})
export type ConfirmCashRequest = z.infer<typeof ConfirmCashRequest>

export const DisputeCashRequest = z.object({
  reportedAmount: MoneyPenSchema,
  note: z.string().min(3).max(300),
})
export type DisputeCashRequest = z.infer<typeof DisputeCashRequest>

export const ResolveCashRequest = z.object({
  resolvedAmount: MoneyPenSchema,
  decision: z.enum(['accept_restaurant', 'accept_driver', 'split']),
  notes: z.string().min(3).max(300),
})
export type ResolveCashRequest = z.infer<typeof ResolveCashRequest>

export const CashSettlementResponse = z.object({
  id: UuidSchema,
  restaurantId: UuidSchema,
  restaurantName: z.string(),
  driverId: UuidSchema,
  driverName: z.string(),
  settlementDate: z.string(),
  totalCash: MoneyPenSchema,
  orderCount: z.number().int(),
  deliveredAmount: MoneyPenSchema.nullable(),
  confirmedAmount: MoneyPenSchema.nullable(),
  reportedAmount: MoneyPenSchema.nullable(),
  resolvedAmount: MoneyPenSchema.nullable(),
  disputeNote: z.string().nullable(),
  resolutionNote: z.string().nullable(),
  status: CashSettlementStatus,
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
})
export type CashSettlementResponse = z.infer<typeof CashSettlementResponse>
