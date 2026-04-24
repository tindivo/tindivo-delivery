import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { parseJson } from '@/lib/http/validate'
import { Settlements } from '@tindivo/contracts'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/admin/settlements/[id]/mark-paid
 * Marca una liquidación como pagada. El trigger
 * trg_settlements_deduct_balance_due descuenta automáticamente
 * total_amount de restaurants.balance_due.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ['admin'])
  if (!auth.ok) return auth.response

  const { id } = await params
  const body = await parseJson(req, Settlements.MarkSettlementPaidRequest)
  if (!body.ok) return body.response

  const { data, error } = await auth.auth.supabase
    .from('settlements')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_method: body.data.paymentMethod,
      payment_note: body.data.paymentNote ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .neq('status', 'paid')
    .select('*, restaurants(name, accent_color, yape_number)')
    .maybeSingle()

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)
  if (!data) {
    return problemCode('VALIDATION_ERROR', 409, 'La liquidación ya está pagada o no existe')
  }

  const { restaurants, ...rest } = data as typeof data & {
    restaurants: { name: string; accent_color: string; yape_number: string | null } | null
  }

  return NextResponse.json({
    ...rest,
    restaurant_name: restaurants?.name ?? '',
    accent_color: restaurants?.accent_color ?? 'FF6B35',
    yape_number: restaurants?.yape_number ?? null,
  })
}
