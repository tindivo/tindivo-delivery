import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { parseJson } from '@/lib/http/validate'
import {
  ALL_WEEKDAYS,
  DEFAULT_PLATFORM_SCHEDULE,
  type PlatformSchedule,
  SupabasePlatformSettingsRepository,
  type WeekdayCode,
} from '@tindivo/core/modules/platform'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

const UpdateSchema = z.object({
  startHHMM: z.string().regex(HHMM, 'Hora inicio inválida (HH:MM 24h)'),
  endHHMM: z.string().regex(HHMM, 'Hora fin inválida (HH:MM 24h)'),
  days: z
    .array(z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']))
    .min(1, 'Selecciona al menos un día'),
})

/**
 * GET /api/v1/admin/settings/platform-schedule
 * Devuelve la configuración del horario operativo. Si nunca se configuró,
 * responde el default (siempre abierto) sin crear filas.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['admin'])
  if (!auth.ok) return auth.response

  const { data, error } = await auth.auth.supabase
    .from('app_settings')
    .select('value, updated_at')
    .eq('key', 'platform_schedule')
    .maybeSingle()

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  const repo = new SupabasePlatformSettingsRepository(auth.auth.supabase)
  const stored = await repo.read().catch(() => null)
  const schedule = stored ?? DEFAULT_PLATFORM_SCHEDULE

  return NextResponse.json({
    schedule: {
      startHHMM: schedule.startHHMM,
      endHHMM: schedule.endHHMM,
      days: schedule.days,
    },
    updatedAt: data?.updated_at ?? null,
  })
}

/**
 * PATCH /api/v1/admin/settings/platform-schedule
 * Body: { startHHMM, endHHMM, days[] }. Validamos rangos y al menos un día.
 */
export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req, ['admin'])
  if (!auth.ok) return auth.response

  const body = await parseJson(req, UpdateSchema)
  if (!body.ok) return body.response

  const dedupedDays = Array.from(new Set(body.data.days)) as WeekdayCode[]
  const sortedDays = (ALL_WEEKDAYS as WeekdayCode[]).filter((d) => dedupedDays.includes(d))

  const schedule: PlatformSchedule = {
    startHHMM: body.data.startHHMM,
    endHHMM: body.data.endHHMM,
    days: sortedDays,
  }

  const repo = new SupabasePlatformSettingsRepository(auth.auth.supabase)
  try {
    const result = await repo.write(schedule, auth.auth.userId)
    return NextResponse.json({ schedule, updatedAt: result.updatedAt })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'persist_error'
    return problemCode('INTERNAL_ERROR', 500, msg)
  }
}
