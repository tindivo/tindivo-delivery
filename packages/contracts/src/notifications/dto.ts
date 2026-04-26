import { z } from 'zod'
import { UuidSchema } from '../common'

export const SubscribePushRequest = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
  userAgent: z.string().max(300).optional(),
  deviceLabel: z.string().max(50).optional(),
})
export type SubscribePushRequest = z.infer<typeof SubscribePushRequest>

export const UnsubscribePushRequest = z.object({
  endpoint: z.string().url(),
})
export type UnsubscribePushRequest = z.infer<typeof UnsubscribePushRequest>

export const VapidKeyResponse = z.object({
  publicKey: z.string(),
})
export type VapidKeyResponse = z.infer<typeof VapidKeyResponse>

export const PushSubscriptionResponse = z.object({
  id: UuidSchema,
  endpoint: z.string().url(),
  deviceLabel: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.string().datetime(),
})
export type PushSubscriptionResponse = z.infer<typeof PushSubscriptionResponse>

export const PushOwnershipResponse = z.object({
  owned: z.boolean(),
})
export type PushOwnershipResponse = z.infer<typeof PushOwnershipResponse>
