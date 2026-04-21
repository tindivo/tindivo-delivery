import { z } from 'zod'
import { PhonePeSchema, TimestampSchema, UuidSchema } from '../common'
import { VehicleType } from '../enums'

export const CreateDriverRequest = z.object({
  fullName: z.string().min(3).max(80),
  phone: PhonePeSchema,
  vehicleType: VehicleType,
  licensePlate: z.string().max(20).optional(),
  operatingDays: z.array(z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])),
  shiftStart: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'HH:MM')
    .default('18:00'),
  shiftEnd: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'HH:MM')
    .default('23:00'),
  userEmail: z.string().email(),
  userPassword: z.string().min(8).max(80),
})
export type CreateDriverRequest = z.infer<typeof CreateDriverRequest>

export const UpdateDriverRequest = CreateDriverRequest.partial().omit({
  userEmail: true,
  userPassword: true,
})
export type UpdateDriverRequest = z.infer<typeof UpdateDriverRequest>

export const ToggleAvailabilityRequest = z.object({
  isAvailable: z.boolean(),
})
export type ToggleAvailabilityRequest = z.infer<typeof ToggleAvailabilityRequest>

export const DriverResponse = z.object({
  id: UuidSchema,
  userId: UuidSchema,
  fullName: z.string(),
  phone: PhonePeSchema,
  vehicleType: VehicleType,
  licensePlate: z.string().nullable(),
  operatingDays: z.array(z.string()),
  shiftStart: z.string(),
  shiftEnd: z.string(),
  isActive: z.boolean(),
  isAvailable: z.boolean(),
  activeOrdersCount: z.number().int(),
  deliveredToday: z.number().int(),
  hasPushSubscription: z.boolean(),
  createdAt: TimestampSchema,
})
export type DriverResponse = z.infer<typeof DriverResponse>
