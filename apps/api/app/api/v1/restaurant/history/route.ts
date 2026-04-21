import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['restaurant'])
  if (!auth.ok) return auth.response
  if (!auth.auth.restaurantId) return problemCode('FORBIDDEN', 403)

  const url = new URL(req.url)
  const statusParam = url.searchParams.get('status')
  const statuses = statusParam ? statusParam.split(',') : ['delivered', 'cancelled']

  const since = new Date()
  since.setHours(0, 0, 0, 0)

  const { data, error } = await auth.auth.supabase
    .from('orders')
    .select('*, drivers(full_name)')
    .eq('restaurant_id', auth.auth.restaurantId)
    .in('status', statuses)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)
  return NextResponse.json({ items: data ?? [] })
}
