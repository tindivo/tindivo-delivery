import { buildAutoAcceptExpiredTransferRequestsUseCase } from '@/lib/core/container'
import { problemCode } from '@/lib/http/problem'
import { createAdminClient } from '@tindivo/supabase'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const Body = z
  .object({
    limit: z.number().int().positive().max(500).optional(),
  })
  .optional()

/**
 * POST /api/v1/internal/transfer-requests/process-expired
 *
 * Endpoint INTERNO. Invocado por el cron `process-expired-transfer-requests`
 * (cada 1 min) vía pg_net + helper SQL `invoke_process_expired_transfer_requests()`.
 *
 * Procesa todas las `order_transfer_requests` con `status='pending' AND
 * expires_at < now`. Por cada una:
 *   - Si el solicitante sigue siendo elegible (capacidad R3 + autorización al
 *     restaurante + order todavía con el dueño original): transfiere el pedido
 *     (`Order.reassignTo`) y marca la solicitud como `accepted`.
 *   - Si NO es elegible: marca como `expired` (fallback) y publica
 *     `OrderTransferExpired` con motivo para que el solicitante reciba push.
 *
 * Auth: `Authorization: Bearer <SERVICE_ROLE_KEY>`. Sin auth válida → 401.
 * Respuesta SIEMPRE 200 (incluso si hay errores en el batch) para evitar
 * reintentos automáticos de pg_net que generarían carga inútil. El cron failsafe
 * `expire-transfer-requests-failsafe` (cada 5 min) limpia pending huérfanas si
 * este endpoint queda down persistentemente.
 */
export async function POST(req: NextRequest) {
  const expectedKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  const header = req.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null

  if (!token || !expectedKey || token !== expectedKey) {
    return problemCode('UNAUTHENTICATED', 401, 'Internal endpoint requires service role key')
  }

  const raw = await req.json().catch(() => null)
  const parsed = Body.safeParse(raw)
  const limit = parsed.success ? parsed.data?.limit : undefined

  const admin = createAdminClient()
  const useCase = buildAutoAcceptExpiredTransferRequestsUseCase(admin)
  const result = await useCase.execute({ limit })

  if (result.isFailure) {
    return NextResponse.json({ ok: false, error: result.error.code ?? 'unknown' }, { status: 200 })
  }

  return NextResponse.json({
    ok: true,
    processed: result.value.processed,
    accepted: result.value.accepted,
    expired: result.value.expired,
  })
}
