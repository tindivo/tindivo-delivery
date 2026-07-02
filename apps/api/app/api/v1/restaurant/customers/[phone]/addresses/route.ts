import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ phone: string }> },
) {
  const { phone } = await params

  const auth = await requireAuth(req, ['restaurant'])
  if (!auth.ok) return auth.response
  if (!auth.auth.restaurantId) return problemCode('FORBIDDEN', 403)
  const supabase = auth.auth.supabase

  // Validate phone format: 9 digits starting with 9
  const PHONE_REGEX = /^9\d{8}$/
  if (!PHONE_REGEX.test(phone)) {
    return problemCode('VALIDATION_ERROR', 400, 'Número de teléfono inválido')
  }

  // Query customer_addresses table directly
  const { data: addresses, error } = await supabase
    .from('customer_addresses')
    .select('address_id, customer_name, reference, is_default, times_used, last_used_at, lat, lng')
    .eq('phone', phone)
    .order('is_default', { ascending: false })
    .order('times_used', { ascending: false })
    .order('last_used_at', { ascending: false, nullsFirst: false })

  if (error) {
    return problemCode('INTERNAL_ERROR', 500, error.message)
  }

  const items = (addresses || []).map((addr) => ({
    address_id: addr.address_id,
    customer_name: addr.customer_name,
    reference: addr.reference ?? '',
    is_default: addr.is_default,
    times_used: addr.times_used,
    last_used_at: addr.last_used_at,
    has_gps: addr.lat !== null && addr.lng !== null,
  }))

  return NextResponse.json({
    phone,
    addresses: items,
  })
}
