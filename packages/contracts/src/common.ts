import { z } from 'zod'

export const UuidSchema = z.string().uuid()
export type Uuid = z.infer<typeof UuidSchema>

export const ShortIdSchema = z
  .string()
  .length(8)
  .regex(/^[A-HJ-NP-Z2-9]{8}$/, 'Formato de shortId inválido')
export type ShortId = z.infer<typeof ShortIdSchema>

export const PhonePeSchema = z
  .string()
  .regex(/^(\+?51)?\s?9\d{8}$/, 'Debe ser un celular peruano (9 dígitos empezando en 9)')
export type PhonePe = z.infer<typeof PhonePeSchema>

export const AccentColorSchema = z
  .string()
  .length(6)
  .regex(/^[0-9a-fA-F]{6}$/, 'Color hex sin #')
export type AccentColor = z.infer<typeof AccentColorSchema>

export const CoordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})
export type Coordinates = z.infer<typeof CoordinatesSchema>

export const MoneyPenSchema = z.number().min(0).multipleOf(0.01)
export type MoneyPen = z.infer<typeof MoneyPenSchema>

export const TimestampSchema = z.string().datetime()
export type Timestamp = z.infer<typeof TimestampSchema>

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})
export type Pagination = z.infer<typeof PaginationSchema>

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    totalPages: z.number(),
  })
