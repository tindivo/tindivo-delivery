import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * @deprecated Reemplazado por pagos manuales en /admin/cobros.
 * POST /api/v1/admin/restaurant-payments es ahora la fuente de verdad para
 * registrar pagos del restaurante a Tindivo. Cada pago descuenta balance_due
 * directamente sin pasar por settlements.
 */
export async function POST() {
  return NextResponse.json(
    {
      type: 'https://tindivo.pe/errors/endpoint-deprecated',
      title: 'Endpoint deprecado',
      status: 410,
      code: 'ENDPOINT_DEPRECATED',
      detail:
        'El flujo de marcar settlement como pagada fue reemplazado por POST /api/v1/admin/restaurant-payments.',
    },
    { status: 410, headers: { 'Content-Type': 'application/problem+json' } },
  )
}
