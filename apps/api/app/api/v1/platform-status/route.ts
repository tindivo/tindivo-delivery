import { problemCode } from '@/lib/http/problem'
import { SystemClock } from '@tindivo/core/modules/orders'
import {
  CheckPlatformScheduleUseCase,
  SupabasePlatformSettingsRepository,
} from '@tindivo/core/modules/platform'
import { createAdminClient } from '@tindivo/supabase'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/platform-status
 * Endpoint público (sin auth) que devuelve el estado del horario operativo:
 *   { isOpen, reason, nextOpenAt, schedule }
 * Lo consumen las PWAs (restaurante/driver/admin) para mostrar banners
 * y deshabilitar acciones fuera de horario.
 */
export async function GET(_req: NextRequest) {
  try {
    const sb = createAdminClient()
    const useCase = new CheckPlatformScheduleUseCase(
      new SupabasePlatformSettingsRepository(sb),
      new SystemClock(),
    )
    const result = await useCase.execute()
    if (result.isFailure) return problemCode('INTERNAL_ERROR', 500)

    const status = result.value
    return NextResponse.json(
      {
        isOpen: status.isOpen,
        reason: status.reason,
        nextOpenAt: status.nextOpenAt?.toISOString() ?? null,
        schedule: status.schedule,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    return problemCode('INTERNAL_ERROR', 500, msg)
  }
}
