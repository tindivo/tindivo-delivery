import { z } from 'zod'
import { AccentColorSchema, MoneyPenSchema, TimestampSchema, UuidSchema } from '../common'
import { PaymentMethodSchema } from '../settlements/dto'

export const CreateRestaurantPaymentRequest = z.object({
  restaurantId: UuidSchema,
  amount: MoneyPenSchema.refine((v) => v > 0, 'El monto debe ser mayor a 0'),
  paymentMethod: PaymentMethodSchema,
  paymentNote: z.string().max(300).optional(),
})
export type CreateRestaurantPaymentRequest = z.infer<typeof CreateRestaurantPaymentRequest>

export const RestaurantPaymentResponse = z.object({
  id: UuidSchema,
  restaurantId: UuidSchema,
  restaurantName: z.string(),
  restaurantAccentColor: AccentColorSchema,
  amount: MoneyPenSchema,
  paymentMethod: PaymentMethodSchema,
  paymentNote: z.string().nullable(),
  paidAt: TimestampSchema,
  createdBy: UuidSchema.nullable(),
  createdAt: TimestampSchema,
})
export type RestaurantPaymentResponse = z.infer<typeof RestaurantPaymentResponse>

export const RestaurantDebtRow = z.object({
  restaurantId: UuidSchema,
  restaurantName: z.string(),
  accentColor: AccentColorSchema,
  balanceDue: MoneyPenSchema,
  isActive: z.boolean(),
  yapeNumber: z.string().nullable(),
})
export type RestaurantDebtRow = z.infer<typeof RestaurantDebtRow>
