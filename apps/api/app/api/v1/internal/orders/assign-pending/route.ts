import { buildAutoAssignOrderUseCase } from '@/lib/core/container'
import { problemCode } from '@/lib/http/problem'
import { createAdminClient } from '@tindivo/supabase'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/internal/orders/assign-pending
 *
 * Endpoint INTERNO. Invocado por cron PL/pgSQL (vía pg_net) cada minuto.
 * Encuentra pedidos `waiting_driver` con `driver_id IS NULL` y
 * `appears_in_queue_at <= now()` y ejecuta auto-assign sobre cada uno.
 *
 * Auth: header `Authorization: Bearer <SERVICE_ROLE_KEY>`. Sin auth válida
 * retorna 401. NO está pensado para ser llamado desde clientes.
 */
export async function POST(req: NextRequest) {
  const expectedKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  const header = req.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null

  if (!token || !expectedKey || token !== expectedKey) {
    return problemCode('UNAUTHENTICATED', 401, 'Internal endpoint requires service role key')
  }

  const admin = createAdminClient()
  const nowIso = new Date().toISOString()

  const { data: pending, error } = await admin
    .from('orders')
    .select('id')
    .eq('status', 'waiting_driver')
    .is('driver_id', null)
    .lte('appears_in_queue_at', nowIso)
    .order('appears_in_queue_at', { ascending: true })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const useCase = buildAutoAssignOrderUseCase(admin)
  let assigned = 0
  let skipped = 0
  const results: Array<{ orderId: string; assigned: boolean; reason: string | null }> = []

  for (const order of pending ?? []) {
    const result = await useCase.execute({ orderId: order.id })
    if (result.isSuccess) {
      results.push({
        orderId: order.id,
        assigned: result.value.assigned,
        reason: result.value.reason,
      })
      if (result.value.assigned) assigned++
      else skipped++
    } else {
      skipped++
    }
  }

  return NextResponse.json({ processed: pending?.length ?? 0, assigned, skipped, results })
}
