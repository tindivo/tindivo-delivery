import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const Body = z.object({ isAvailable: z.boolean() })

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req, ['driver'])
  if (!auth.ok) return auth.response
  if (!auth.auth.driverId) return problemCode('FORBIDDEN', 403)

  const parsed = Body.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return problemCode('INVALID_REQUEST', 400, parsed.error.message)

  const { error } = await auth.auth.supabase.from('driver_availability').upsert(
    {
      driver_id: auth.auth.driverId,
      is_available: parsed.data.isAvailable,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'driver_id' },
  )

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)
  return new NextResponse(null, { status: 204 })
}
