import { buildMarkReadyEarlyUseCase } from '@/lib/core/container'
import { problem } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/restaurant/orders/:id/ready-early
 * Reduce el tiempo de preparación a 10 min cuando el restaurante termina
 * antes. Solo rol `restaurant` (y la RLS garantiza ownership).
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(_req, ['restaurant'])
  if (!auth.ok) return auth.response

  const { id } = await params
  const useCase = buildMarkReadyEarlyUseCase(auth.auth.supabase)
  const result = await useCase.execute({ orderId: id })

  if (result.isFailure) return problem(result.error)
  return NextResponse.json(result.value)
}
