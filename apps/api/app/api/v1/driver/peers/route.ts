import { getDriverRepository } from '@/lib/core/container'
import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/driver/peers?restaurantId=X
 *
 * Lista compañeros del mismo restaurante con espacio en mochila para que
 * el motorizado actual pueda transferirles un pedido (caso accidente, moto
 * descompuesta, emergencia personal). Excluye al invocador.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['driver'])
  if (!auth.ok) return auth.response
  if (!auth.auth.driverId) return problemCode('FORBIDDEN', 403)

  const restaurantId = req.nextUrl.searchParams.get('restaurantId')
  if (!restaurantId) {
    return problemCode('VALIDATION_ERROR', 400, 'restaurantId es requerido')
  }

  const repo = getDriverRepository(auth.auth.supabase)
  const peers = await repo.findEligiblePeers({
    restaurantId,
    excludeDriverId: auth.auth.driverId,
    todayStart: startOfLimaDay(new Date()),
  })

  return NextResponse.json({ items: peers })
}

function startOfLimaDay(date: Date): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '01'
  return new Date(`${get('year')}-${get('month')}-${get('day')}T00:00:00-05:00`)
}
