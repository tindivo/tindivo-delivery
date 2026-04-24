import { buildCancelOrderUseCase } from '@/lib/core/container'
import { problem } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { parseJson } from '@/lib/http/validate'
import { Orders } from '@tindivo/contracts'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ['admin'])
  if (!auth.ok) return auth.response

  const { id } = await params
  const body = await parseJson(req, Orders.CancelOrderRequest)
  if (!body.ok) return body.response

  const useCase = buildCancelOrderUseCase(auth.auth.supabase)
  const result = await useCase.execute({
    orderId: id,
    role: 'admin',
    reason: body.data.reason,
  })

  if (result.isFailure) return problem(result.error)
  return NextResponse.json(result.value)
}
