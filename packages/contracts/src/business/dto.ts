import { z } from 'zod'

export const UpdateBusinessProfile = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z
    .string()
    .regex(/^9\d{8}$/)
    .optional(),
  address: z.string().min(5).max(220).optional(),
  description: z.string().max(500).nullable().optional(),
  accentColor: z
    .string()
    .regex(/^[0-9a-fA-F]{6}$/)
    .optional(),
  isPublished: z.boolean().optional(),
})
export type UpdateBusinessProfile = z.infer<typeof UpdateBusinessProfile>

export const CreateCategory = z.object({
  name: z.string().min(2).max(60),
  description: z.string().max(500).optional(),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  isActive: z.boolean().default(true),
})
export type CreateCategory = z.infer<typeof CreateCategory>

export const UpdateCategory = z.object({
  name: z.string().min(2).max(60).optional(),
  description: z.string().max(500).nullable().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
})
export type UpdateCategory = z.infer<typeof UpdateCategory>

export const CreateItem = z.object({
  categoryId: z.string().uuid().nullable().optional(),
  name: z.string().min(2).max(80),
  description: z.string().max(500).optional(),
  price: z.number().min(0).max(9999.99),
  imageUrl: z.string().url().nullable().optional(),
  prepMinutes: z.number().int().min(5).max(120).optional(),
  isAvailable: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(9999).default(0),
})
export type CreateItem = z.infer<typeof CreateItem>

export const UpdateItem = z.object({
  categoryId: z.string().uuid().nullable().optional(),
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(500).nullable().optional(),
  price: z.number().min(0).max(9999.99).optional(),
  imageUrl: z.string().url().nullable().optional(),
  prepMinutes: z.number().int().min(5).max(120).nullable().optional(),
  isAvailable: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
})
export type UpdateItem = z.infer<typeof UpdateItem>

export const CreateGroup = z
  .object({
    menuItemId: z.string().uuid(),
    name: z.string().min(2).max(60),
    minSelected: z.number().int().min(0).max(20).default(0),
    maxSelected: z.number().int().min(1).max(20).default(1),
    sortOrder: z.number().int().min(0).max(9999).default(0),
    isActive: z.boolean().default(true),
  })
  .refine((d) => d.maxSelected >= d.minSelected, {
    message: 'maxSelected debe ser >= minSelected',
  })
export type CreateGroup = z.infer<typeof CreateGroup>

export const CreateOption = z.object({
  groupId: z.string().uuid(),
  name: z.string().min(2).max(80),
  priceDelta: z.number().min(0).max(9999.99).default(0),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  isAvailable: z.boolean().default(true),
})
export type CreateOption = z.infer<typeof CreateOption>

export const AdminUpdateBusiness = z
  .object({
    description: z.string().max(500).nullable().optional(),
    isMarketplacePublished: z.boolean().optional(),
    isDeliveryEnabled: z.boolean().optional(),
    isVerified: z.boolean().optional(),
    isActive: z.boolean().optional(),
    commissionPerOrder: z.number().min(0).max(99.99).optional(),
  })
  .refine((data) => data.isDeliveryEnabled !== true || data.commissionPerOrder !== undefined, {
    message: 'commissionPerOrder es requerido al habilitar delivery',
    path: ['commissionPerOrder'],
  })
export type AdminUpdateBusiness = z.infer<typeof AdminUpdateBusiness>
