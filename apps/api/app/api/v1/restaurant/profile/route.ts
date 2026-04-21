import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['restaurant'])
  if (!auth.ok) return auth.response
  if (!auth.auth.restaurantId) return problemCode('FORBIDDEN', 403)

  const { data, error } = await auth.auth.supabase
    .from('restaurants')
    .select(
      'id, name, phone, address, yape_number, qr_url, accent_color, is_active, is_blocked, block_reason, balance_due',
    )
    .eq('id', auth.auth.restaurantId)
    .maybeSingle()

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)
  if (!data) return problemCode('NOT_FOUND', 404)

  return NextResponse.json({
    id: data.id,
    name: data.name,
    phone: data.phone,
    address: data.address,
    yapeNumber: data.yape_number,
    qrUrl: data.qr_url,
    accentColor: data.accent_color,
    isActive: data.is_active,
    isBlocked: data.is_blocked,
    blockReason: data.block_reason,
    balanceDue: Number(data.balance_due),
    email: auth.auth.email,
  })
}
