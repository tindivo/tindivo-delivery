import { z } from 'zod'
import {
  AccentColorSchema,
  CoordinatesSchema,
  MoneyPenSchema,
  PhonePeSchema,
  TimestampSchema,
  UuidSchema,
} from '../common'

export const CreateRestaurantRequest = z.object({
  name: z.string().min(2).max(80),
  phone: PhonePeSchema,
  address: z.string().min(5).max(200),
  yapeNumber: PhonePeSchema.optional(),
  // URL pública de Supabase Storage del QR Yape/Plin. El upload se hace
  // desde el cliente directamente a Storage; solo se persiste la URL.
  qrUrl: z.string().url().optional(),
  accentColor: AccentColorSchema,
  // Ubicación exacta seleccionada por el admin en el mapa (Leaflet).
  coordinates: CoordinatesSchema,
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
  accentColor: AccentColorSchema.optional(),
  coordinates: CoordinatesSchema.optional(),
})
export type UpdateRestaurantRequest = z.infer<typeof UpdateRestaurantRequest>

export const BlockRestaurantRequest = z.object({
  reason: z.string().min(3).max(300),
})
export type BlockRestaurantRequest = z.infer<typeof BlockRestaurantRequest>

export const RestaurantResponse = z.object({
  id: UuidSchema,
  userId: UuidSchema,
  name: z.string(),
  phone: PhonePeSchema,
  address: z.string(),
  yapeNumber: PhonePeSchema.nullable(),
  qrUrl: z.string().url().nullable(),
  accentColor: AccentColorSchema,
  coordinates: CoordinatesSchema.nullable(),
  isActive: z.boolean(),
  isBlocked: z.boolean(),
  blockReason: z.string().nullable(),
  balanceDue: MoneyPenSchema,
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
})
export type RestaurantResponse = z.infer<typeof RestaurantResponse>

export const ServiceStatusResponse = z.object({
  isOperatingNow: z.boolean(),
  isBlocked: z.boolean(),
  blockReason: z.string().nullable(),
  nextOpenAt: TimestampSchema.nullable(),
  canCreateOrder: z.boolean(),
})
export type ServiceStatusResponse = z.infer<typeof ServiceStatusResponse>
