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
import { PaymentStatus } from '../enums'

export const PublicRestaurantSummary = z.object({
  id: UuidSchema,
  name: z.string(),
  phone: PhonePeSchema,
  address: z.string(),
  description: z.string().nullable().optional(),
  accentColor: AccentColorSchema,
  coordinates: CoordinatesSchema.nullable(),
  isOpen: z.boolean(),
  isBlocked: z.boolean(),
  catalogType: z.enum(['delivery', 'business']).default('delivery'),
  deliveryEnabled: z.boolean().default(true),
  categories: z.array(z.string()),
  featuredItemNames: z.array(z.string()),
})
export type PublicRestaurantSummary = z.infer<typeof PublicRestaurantSummary>

export const MenuModifierOption = z.object({
  id: UuidSchema,
  name: z.string(),
  priceDelta: MoneyPenSchema,
  isAvailable: z.boolean(),
})
export type MenuModifierOption = z.infer<typeof MenuModifierOption>

export const MenuModifierGroup = z.object({
  id: UuidSchema,
  name: z.string(),
  minSelected: z.number().int().min(0),
  maxSelected: z.number().int().min(1),
  options: z.array(MenuModifierOption),
})
export type MenuModifierGroup = z.infer<typeof MenuModifierGroup>

export const MenuItem = z.object({
  id: UuidSchema,
  categoryId: UuidSchema.nullable(),
  name: z.string(),
  description: z.string().nullable(),
  price: MoneyPenSchema,
  imageUrl: z.string().url().nullable(),
  prepMinutes: z.number().int().nullable(),
  isFeatured: z.boolean(),
  modifierGroups: z.array(MenuModifierGroup),
})
export type MenuItem = z.infer<typeof MenuItem>

export const MenuCategory = z.object({
  id: UuidSchema,
  name: z.string(),
  description: z.string().nullable(),
  items: z.array(MenuItem),
})
export type MenuCategory = z.infer<typeof MenuCategory>

export const PublicRestaurantMenu = z.object({
  restaurant: PublicRestaurantSummary,
  categories: z.array(MenuCategory),
})
export type PublicRestaurantMenu = z.infer<typeof PublicRestaurantMenu>

export const CustomerCartModifier = z.object({
  groupId: UuidSchema,
  optionId: UuidSchema,
})
export type CustomerCartModifier = z.infer<typeof CustomerCartModifier>

export const CustomerCartItem = z.object({
  menuItemId: UuidSchema,
  quantity: z.number().int().min(1).max(99),
  modifiers: z.array(CustomerCartModifier).default([]),
  notes: z.string().trim().max(300).optional(),
})
export type CustomerCartItem = z.infer<typeof CustomerCartItem>

export const CustomerPaymentStatus = PaymentStatus.refine(
  (value) => value === 'pending_yape' || value === 'pending_cash',
  'La PWA cliente solo acepta Yape o efectivo',
)

export const CreateCustomerOrderRequest = z
  .object({
    restaurantId: UuidSchema,
    customerName: z.string().trim().min(2).max(80),
    customerPhone: PhonePeSchema,
    deliveryAddress: z.string().trim().min(5).max(220),
    deliveryReference: z.string().trim().max(500).optional(),
    deliveryCoordinates: CoordinatesSchema,
    locationAccuracyM: z.number().min(0).max(5000).optional(),
    paymentStatus: CustomerPaymentStatus,
    clientPaysWith: MoneyPenSchema.optional(),
    items: z.array(CustomerCartItem).min(1).max(50),
    notes: z.string().trim().max(300).optional(),
  })
  .refine((v) => v.paymentStatus !== 'pending_cash' || v.clientPaysWith !== undefined, {
    message: 'clientPaysWith es requerido para pago en efectivo',
    path: ['clientPaysWith'],
  })
export type CreateCustomerOrderRequest = z.infer<typeof CreateCustomerOrderRequest>

export const CreateCustomerOrderResponse = z.object({
  id: UuidSchema,
  shortId: ShortIdSchema,
  status: z.string(),
  estimatedReadyAt: TimestampSchema,
  trackingUrl: z.string(),
  orderAmount: MoneyPenSchema,
  changeToGive: MoneyPenSchema.nullable(),
})
export type CreateCustomerOrderResponse = z.infer<typeof CreateCustomerOrderResponse>
