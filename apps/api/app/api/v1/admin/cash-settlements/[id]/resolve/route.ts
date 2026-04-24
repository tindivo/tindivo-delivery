import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { parseJson } from '@/lib/http/validate'
import { CashSettlements } from '@tindivo/contracts'
import { createAdminClient } from '@tindivo/supabase'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/admin/cash-settlements/[id]/resolve
 *
 * Admin resuelve una disputa (HU-A-037). Solo desde estado `disputed`.
 * El admin registra:
 *  - `resolvedAmount`: el monto que se considera correcto
 *  - `decision`: accept_driver | accept_restaurant | split
 *  - `notes`: justificación obligatoria (mínimo 3 caracteres)
 *
 * Marca el settlement como `resolved`, resuelve las admin_alerts asociadas
 * y emite domain event con push tanto al driver como al restaurante.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ['admin'])
  if (!auth.ok) return auth.response

  const { id } = await params
  const body = await parseJson(req, CashSettlements.ResolveCashRequest)
  if (!body.ok) return body.response

  const { data: current } = await auth.auth.supabase
    .from('cash_settlements')
    .select('id, status, restaurant_id, driver_id, delivered_amount, reported_amount')
    .eq('id', id)
    .maybeSingle()

  if (!current) return problemCode('SETTLEMENT_NOT_FOUND', 404)
  if (current.status !== 'disputed') {
    return problemCode(
      'INVALID_STATE_TRANSITION',
      409,
      `Solo se puede resolver desde estado "disputed" (actual: "${current.status}").`,
    )
  }

  const now = new Date().toISOString()
  const admin = createAdminClient()

  // Update settlement → resolved
  const { data, error } = await admin
    .from('cash_settlements')
    .update({
      status: 'resolved',
      resolved_amount: body.data.resolvedAmount,
      resolution_note: body.data.notes,
      resolved_at: now,
      resolved_by: auth.auth.userId,
      updated_at: now,
    })
    .eq('id', id)
    .select('id, status')
    .maybeSingle()

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  // Cierra alertas admin asociadas a este settlement (match por payload)
  await admin
    .from('admin_alerts')
    .update({
      resolved_at: now,
      resolved_by: auth.auth.userId,
    })
    .eq('type', 'cash_settlement.disputed')
    .is('resolved_at', null)
    .filter('payload->>settlement_id', 'eq', id)

  // Push a ambas partes
  await admin.from('domain_events').insert({
    aggregate_type: 'CashSettlement',
    aggregate_id: id,
    event_type: 'CashSettlementResolved',
    payload: {
      driver_id: current.driver_id,
      restaurant_id: current.restaurant_id,
      delivered_amount: current.delivered_amount,
      reported_amount: current.reported_amount,
      resolved_amount: body.data.resolvedAmount,
      decision: body.data.decision,
      notes: body.data.notes,
    },
  })

  return NextResponse.json({ settlementId: data?.id, status: data?.status })
}
