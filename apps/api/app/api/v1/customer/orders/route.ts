import { buildListMyOrdersUseCase } from '@/lib/core/container'
import { problem } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/customer/orders
 * Lista los últimos pedidos del cliente autenticado (rol=customer).
 * Query: ?limit=20 (default 20, max 50).
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['customer'])
  if (!auth.ok) return auth.response

  const limitRaw = req.nextUrl.searchParams.get('limit')
  const limit = limitRaw ? Number(limitRaw) : 20

  const useCase = buildListMyOrdersUseCase(auth.auth.supabase)
  const result = await useCase.execute({ userId: auth.auth.userId, limit })
  if (result.isFailure) return problem(result.error)

  return NextResponse.json({ items: result.value })
}
