import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { parseJson } from '@/lib/http/validate'
import { RestaurantPayments } from '@tindivo/contracts'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/admin/restaurant-payments
 * Lista paginada de pagos manuales con join al restaurante.
 * Query params: ?restaurantId=&from=YYYY-MM-DD&to=YYYY-MM-DD
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['admin'])
  if (!auth.ok) return auth.response

  const url = new URL(req.url)
  const restaurantId = url.searchParams.get('restaurantId')
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')

  let query = auth.auth.supabase
    .from('restaurant_payments')
    .select('*, restaurants(name, accent_color)')
    .order('paid_at', { ascending: false })
    .limit(200)

  if (restaurantId) query = query.eq('restaurant_id', restaurantId)
  if (from) query = query.gte('paid_at', `${from}T00:00:00Z`)
  if (to) query = query.lte('paid_at', `${to}T23:59:59Z`)

  const { data, error } = await query
  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  const items = (data ?? []).map((row) => {
    const r = (
      row as typeof row & {
        restaurants: { name: string; accent_color: string } | null
      }
    ).restaurants
    return {
      id: row.id,
      restaurantId: row.restaurant_id,
      restaurantName: r?.name ?? '',
      restaurantAccentColor: r?.accent_color ?? 'FF6B35',
      amount: Number(row.amount),
      paymentMethod: row.payment_method,
      paymentNote: row.payment_note,
      paidAt: row.paid_at,
      createdBy: row.created_by,
      createdAt: row.created_at,
    }
  })

  return NextResponse.json({ items })
}

/**
 * POST /api/v1/admin/restaurant-payments
 * Registra un pago manual contra la deuda del restaurante. El trigger
 * `trg_restaurant_payments_deduct_balance` descuenta el monto de balance_due
 * automáticamente. Valida que amount no exceda la deuda actual.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['admin'])
  if (!auth.ok) return auth.response

  const body = await parseJson(req, RestaurantPayments.CreateRestaurantPaymentRequest)
  if (!body.ok) return body.response

  const input = body.data

  const { data: restaurant, error: restErr } = await auth.auth.supabase
    .from('restaurants')
    .select('id, name, accent_color, balance_due')
    .eq('id', input.restaurantId)
    .maybeSingle()

  if (restErr) return problemCode('INTERNAL_ERROR', 500, restErr.message)
  if (!restaurant) return problemCode('RESTAURANT_NOT_FOUND', 404)

  const balanceDue = Number(restaurant.balance_due)
  if (input.amount > balanceDue + 0.001) {
    return problemCode(
      'VALIDATION_ERROR',
      422,
      `El monto S/ ${input.amount.toFixed(2)} excede la deuda actual S/ ${balanceDue.toFixed(2)}.`,
    )
  }

  const { data: inserted, error: insErr } = await auth.auth.supabase
    .from('restaurant_payments')
    .insert({
      restaurant_id: input.restaurantId,
      amount: input.amount,
      payment_method: input.paymentMethod,
      payment_note: input.paymentNote ?? null,
      created_by: auth.auth.userId,
    })
    .select('*')
    .single()

  if (insErr || !inserted) return problemCode('INTERNAL_ERROR', 500, insErr?.message)

  return NextResponse.json(
    {
      id: inserted.id,
      restaurantId: inserted.restaurant_id,
      restaurantName: restaurant.name,
      restaurantAccentColor: restaurant.accent_color,
      amount: Number(inserted.amount),
      paymentMethod: inserted.payment_method,
      paymentNote: inserted.payment_note,
      paidAt: inserted.paid_at,
      createdBy: inserted.created_by,
      createdAt: inserted.created_at,
    },
    { status: 201 },
  )
}
