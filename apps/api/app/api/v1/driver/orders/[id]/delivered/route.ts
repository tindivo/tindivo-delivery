import { buildMarkDeliveredUseCase } from '@/lib/core/container'
import { problem, problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { Orders } from '@tindivo/contracts'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ['driver'])
  if (!auth.ok) return auth.response
  if (!auth.auth.driverId) return problemCode('FORBIDDEN', 403)

  // Body opcional: legacy clients no mandan nada → default { kind: 'unchanged' }.
  const raw = await req.json().catch(() => null as unknown)
  const parsed = Orders.MarkDeliveredRequest.safeParse(raw ?? {})
  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        type: 'https://tindivo.pe/errors/validation-error',
        title: 'Datos inválidos',
        status: 400,
        code: 'VALIDATION_ERROR',
        errors: parsed.error.flatten().fieldErrors,
      }),
      { status: 400, headers: { 'Content-Type': 'application/problem+json' } },
    )
  }

  const { id } = await params
  const useCase = buildMarkDeliveredUseCase(auth.auth.supabase)
  const result = await useCase.execute({
    orderId: id,
    driverId: auth.auth.driverId,
    payment: parsed.data.payment,
    addressCapture: parsed.data.addressCapture,
  })

  if (result.isFailure) return problem(result.error)
  return NextResponse.json(result.value)
}
