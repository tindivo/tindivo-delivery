/**
 * Edge Function: check-unaccepted-orders
 *
 * pg_cron invoca cada 30 segundos.
 * Detecta pedidos con status=waiting_driver cuyo appears_in_queue_at
 * ocurrió hace más de 90 segundos y aún no tienen driver. Inserta
 * una fila en admin_alerts para que el admin lo vea en su dashboard.
 */

import { createServiceRoleClient } from '../_shared/supabase.ts'

const THRESHOLD_SECONDS = 90

Deno.serve(async () => {
  const sb = createServiceRoleClient()
  const cutoff = new Date(Date.now() - THRESHOLD_SECONDS * 1000).toISOString()

  const { data: stuck } = await sb
    .from('orders')
    .select('id, short_id, restaurants(name)')
    .eq('status', 'waiting_driver')
    .lte('appears_in_queue_at', cutoff)

  if (!stuck || stuck.length === 0) {
    return new Response(JSON.stringify({ alerts: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Evitar duplicar alertas ya activas
  const { data: existingAlerts } = await sb
    .from('admin_alerts')
    .select('payload')
    .eq('type', 'order.unaccepted-90s')
    .is('resolved_at', null)

  const existingIds = new Set(
    (existingAlerts ?? []).map((a: any) => (a.payload as any)?.orderId).filter(Boolean),
  )

  const newAlerts = stuck
    .filter((o: any) => !existingIds.has(o.id))
    .map((o: any) => ({
      type: 'order.unaccepted-90s',
      payload: {
        orderId: o.id,
        shortId: o.short_id,
        restaurantName: o.restaurants?.name,
      },
    }))

  if (newAlerts.length === 0) {
    return new Response(JSON.stringify({ alerts: 0, reason: 'already-alerted' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { error } = await sb.from('admin_alerts').insert(newAlerts)
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ alerts: newAlerts.length }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
