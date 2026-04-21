import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ['admin'])
  if (!auth.ok) return auth.response

  const { id } = await params

  const { data, error } = await auth.auth.supabase
    .from('orders')
    .select(
      '*, restaurants!inner(name, phone, address, accent_color), drivers(full_name, phone, vehicle_type), order_status_history(*)',
    )
    .eq('id', id)
    .maybeSingle()

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)
  if (!data) return problemCode('ORDER_NOT_FOUND', 404)

  return NextResponse.json(data)
}
