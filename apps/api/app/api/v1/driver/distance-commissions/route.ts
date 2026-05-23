import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/driver/distance-commissions
 *
 * Devuelve las comisiones que Tindivo cobra al restaurante por pedido
 * entregado según la banda de distancia declarada por el motorizado al
 * pickup. El modal de pickup las muestra junto a cada botón para que el
 * driver entienda el impacto de su declaración antes de elegir.
 *
 * Fuente: `app_settings.delivery_distance_commissions` (JSON `{near, far}`).
 * Solo rol `driver`. Si la config está ausente/malformada, devuelve 500 —
 * admin debe arreglar antes de que el driver pueda hacer pickup.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['driver'])
  if (!auth.ok) return auth.response

  const { data, error } = await auth.auth.supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'delivery_distance_commissions')
    .maybeSingle()

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)
  if (!data?.value)
    return problemCode(
      'INTERNAL_ERROR',
      500,
      'Configuración de comisiones por distancia no encontrada',
    )

  let parsed: unknown
  try {
    parsed = JSON.parse(data.value)
  } catch {
    return problemCode('INTERNAL_ERROR', 500, 'Configuración de comisiones inválida')
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return problemCode('INTERNAL_ERROR', 500, 'Configuración de comisiones inválida')
  }
  const obj = parsed as Record<string, unknown>
  const near = obj.near
  const far = obj.far
  if (!isNonNegativeNumber(near) || !isNonNegativeNumber(far)) {
    return problemCode('INTERNAL_ERROR', 500, 'Configuración de comisiones inválida')
  }

  return NextResponse.json({ near, far })
}

function isNonNegativeNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0
}
