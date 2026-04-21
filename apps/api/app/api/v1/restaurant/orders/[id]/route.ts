import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ['restaurant'])
  if (!auth.ok) return auth.response
  if (!auth.auth.restaurantId) return problemCode('FORBIDDEN', 403)

  const { id } = await params

  const { data, error } = await auth.auth.supabase
    .from('orders')
    .select('*, order_status_history(*), drivers(full_name, phone, vehicle_type)')
    .eq('id', id)
    .eq('restaurant_id', auth.auth.restaurantId)
    .maybeSingle()

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)
  if (!data) return problemCode('ORDER_NOT_FOUND', 404)

  return NextResponse.json(data)
}
