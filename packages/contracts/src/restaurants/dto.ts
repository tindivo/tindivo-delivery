import { z } from 'zod'
import {
  AccentColorSchema,
  CoordinatesSchema,
  MoneyPenSchema,
  PhonePeSchema,
  TimestampSchema,
  UuidSchema,
} from '../common'

// Comisión Tindivo por pedido entregado. Configurable por restaurante.
// Se snapshotea en orders.delivery_fee al crear el pedido.
export const CommissionPerOrderSchema = z
  .number()
  .min(0, 'La comisión no puede ser negativa')
  .max(100, 'La comisión máxima es S/ 100')
  .multipleOf(0.01, 'Máximo 2 decimales')
export type CommissionPerOrder = z.infer<typeof CommissionPerOrderSchema>

export const CreateRestaurantRequest = z.object({
  name: z.string().min(2).max(80),
  phone: PhonePeSchema,
  address: z.string().min(5).max(200),
  yapeNumber: PhonePeSchema.optional(),
  qrUrl: z.string().url().optional(),
  qrUrlSecondary: z.string().url().optional(),
  accentColor: AccentColorSchema,
  coordinates: CoordinatesSchema,
  commissionPerOrder: CommissionPerOrderSchema,
  ownerEmail: z.string().email(),
  ownerPassword: z.string().min(8).max(80),
})
export type CreateRestaurantRequest = z.infer<typeof CreateRestaurantRequest>

export const UpdateRestaurantRequest = z.object({
  name: z.string().min(2).max(80).optional(),
  phone: PhonePeSchema.optional(),
  address: z.string().min(5).max(200).optional(),
  yapeNumber: PhonePeSchema.optional(),
  qrUrl: z.string().url().nullable().optional(),
  qrUrlSecondary: z.string().url().nullable().optional(),
  accentColor: AccentColorSchema.optional(),
  coordinates: CoordinatesSchema.optional(),
  commissionPerOrder: CommissionPerOrderSchema.optional(),
})
export type UpdateRestaurantRequest = z.infer<typeof UpdateRestaurantRequest>

export const SetRestaurantActiveRequest = z.object({
  isActive: z.boolean(),
})
export type SetRestaurantActiveRequest = z.infer<typeof SetRestaurantActiveRequest>

export const RestaurantResponse = z.object({
  id: UuidSchema,
  userId: UuidSchema,
  name: z.string(),
  phone: PhonePeSchema,
  address: z.string(),
  yapeNumber: PhonePeSchema.nullable(),
  qrUrl: z.string().url().nullable(),
  qrUrlSecondary: z.string().url().nullable(),
  accentColor: AccentColorSchema,
  coordinates: CoordinatesSchema.nullable(),
  isActive: z.boolean(),
  balanceDue: MoneyPenSchema,
  commissionPerOrder: MoneyPenSchema,
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
})
export type RestaurantResponse = z.infer<typeof RestaurantResponse>

export const ServiceStatusResponse = z.object({
  isOperatingNow: z.boolean(),
  nextOpenAt: TimestampSchema.nullable(),
  canCreateOrder: z.boolean(),
})
export type ServiceStatusResponse = z.infer<typeof ServiceStatusResponse>

export const ActiveOrderRef = z.object({
  id: UuidSchema,
  shortId: z.string(),
  status: z.string(),
  customerName: z.string().nullable(),
})
export type ActiveOrderRef = z.infer<typeof ActiveOrderRef>

export const ActiveOrdersBlockerError = z.object({
  activeOrders: z.array(ActiveOrderRef),
})
export type ActiveOrdersBlockerError = z.infer<typeof ActiveOrdersBlockerError>
