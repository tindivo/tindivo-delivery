import { z } from 'zod'
import { AccentColorSchema, CoordinatesSchema, ShortIdSchema, TimestampSchema } from '../common'
import { OrderStatus } from '../enums'

export const TrackingResponse = z.object({
  shortId: ShortIdSchema,
  status: OrderStatus,
  restaurantName: z.string(),
  restaurantAccentColor: AccentColorSchema,
  driverFirstName: z.string().nullable(),
  driverVehicleType: z.string().nullable(),
  estimatedReadyAt: TimestampSchema,
  pickedUpAt: TimestampSchema.nullable(),
  deliveredAt: TimestampSchema.nullable(),
  cancelledAt: TimestampSchema.nullable(),
  deliveryCoordinates: CoordinatesSchema.nullable(),
})
export type TrackingResponse = z.infer<typeof TrackingResponse>
