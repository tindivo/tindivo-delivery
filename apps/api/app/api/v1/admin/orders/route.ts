import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['admin'])
  if (!auth.ok) return auth.response

  const sp = req.nextUrl.searchParams
  const status = sp.get('status')
  const restaurantId = sp.get('restaurantId')
  const driverId = sp.get('driverId')

  let query = auth.auth.supabase
    .from('orders')
    .select('*, restaurants!inner(name, accent_color), drivers(full_name)')
    .order('created_at', { ascending: false })
    .limit(100)

  if (status) query = query.eq('status', status as never)
  if (restaurantId) query = query.eq('restaurant_id', restaurantId)
  if (driverId) query = query.eq('driver_id', driverId)

  const { data, error } = await query
  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  return NextResponse.json({ items: data ?? [] })
}
