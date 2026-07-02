import { z } from 'zod'
import {
  AccentColorSchema,
  CoordinatesSchema,
  MoneyPenSchema,
  PhonePeSchema,
  TimestampSchema,
  UuidSchema,
} from '../common'

// Comisión base Tindivo por pedido entregado. Configurable por restaurante.
// Se snapshotea en orders.base_commission al crear el pedido.
export const CommissionPerOrderSchema = z
  .number()
  .min(0, 'La comisión no puede ser negativa')
  .max(100, 'La comisión máxima es S/ 100')
  .multipleOf(0.01, 'Máximo 2 decimales')
export type CommissionPerOrder = z.infer<typeof CommissionPerOrderSchema>

// Adicional que se suma a la comisión base cuando el motorizado declara
// banda "far" al recoger. Configurable por restaurante; default 0.50.
// Snapshoteado en orders.far_surcharge_amount al crear.
export const FarDistanceSurchargeSchema = z
  .number()
  .min(0, 'El adicional no puede ser negativo')
  .max(100, 'El adicional máximo es S/ 100')
  .multipleOf(0.01, 'Máximo 2 decimales')
export type FarDistanceSurcharge = z.infer<typeof FarDistanceSurchargeSchema>

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
  farDistanceSurcharge: FarDistanceSurchargeSchema.optional(),
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
  farDistanceSurcharge: FarDistanceSurchargeSchema.optional(),
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
  farDistanceSurcharge: MoneyPenSchema,
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

/* ─────────────── Clientes Frecuentes DTOs ─────────────── */

export const FrequentCustomersSortBy = z.enum(['order_count', 'total_spent', 'last_order'])
export type FrequentCustomersSortBy = z.infer<typeof FrequentCustomersSortBy>

export const FrequentCustomersSortDir = z.enum(['asc', 'desc'])
export type FrequentCustomersSortDir = z.infer<typeof FrequentCustomersSortDir>

const PeruDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato YYYY-MM-DD')

export const FrequentCustomersQuery = z.object({
  from: PeruDateSchema.optional(),
  to: PeruDateSchema.optional(),
  min_orders: z.coerce.number().int().min(1).default(2),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(10).max(100).default(25),
  search: z.string().max(100).optional(),
  include_suspicious: z.preprocess((val) => val === 'true' || val === '1', z.boolean()).default(false),
  sort_by: FrequentCustomersSortBy.default('order_count'),
  sort_dir: FrequentCustomersSortDir.default('desc'),
})
export type FrequentCustomersQuery = z.infer<typeof FrequentCustomersQuery>

export const FrequentCustomerItem = z.object({
  client_phone: z.string(),
  client_name: z.string().nullable(),
  order_count: z.number(),
  total_spent: z.number(),
  avg_ticket: z.number(),
  first_order_in_range: z.string(),
  last_order_in_range: z.string(),
  days_since_last_order: z.number(),
  category: z.enum(['vip', 'active', 'dormant']),
})
export type FrequentCustomerItem = z.infer<typeof FrequentCustomerItem>

export const FrequentCustomersResponse = z.object({
  data: z.array(FrequentCustomerItem),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  filters_applied: z.object({
    from: z.string(),
    to: z.string(),
    min_orders: z.number(),
    include_suspicious: z.boolean(),
    search: z.string().optional(),
  }),
})
export type FrequentCustomersResponse = z.infer<typeof FrequentCustomersResponse>

export const FrequentCustomerDetailQuery = z.object({
  from: PeruDateSchema.optional(),
  to: PeruDateSchema.optional(),
})
export type FrequentCustomerDetailQuery = z.infer<typeof FrequentCustomerDetailQuery>

export const FrequentCustomerDetailResponse = z.object({
  client_phone: z.string(),
  client_name: z.string().nullable(),
  category: z.enum(['vip', 'active', 'dormant']),
  summary: z.object({
    order_count: z.number(),
    total_spent: z.number(),
    avg_ticket: z.number(),
    first_order_in_range: z.string(),
    last_order_in_range: z.string(),
    days_since_last_order: z.number(),
    avg_days_between_orders: z.number().nullable(),
  }),
  behavior: z.object({
    favorite_day_of_week: z.string(),
    favorite_day_count: z.number(),
    favorite_time_range: z.enum(['morning', 'noon', 'afternoon', 'evening', 'night']),
    favorite_time_range_count: z.number(),
    restaurant_avg_ticket: z.number(),
    ticket_vs_restaurant: z.enum(['above', 'similar', 'below']),
  }),
  recent_orders: z.array(
    z.object({
      id: z.string(),
      short_id: z.string(),
      created_at: z.string(),
      order_amount: z.number(),
    })
  ),
})
export type FrequentCustomerDetailResponse = z.infer<typeof FrequentCustomerDetailResponse>


