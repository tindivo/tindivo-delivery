/**
 * Edge Function: send-push
 *
 * Procesa los eventos pendientes en la tabla `domain_events` (outbox) y
 * envía Web Push a los usuarios correspondientes mediante VAPID.
 *
 * Invocación: por pg_cron cada minuto o por trigger pg_net tras INSERT
 * en domain_events.
 *
 * URLs por rol:
 *  - driver     → /motorizado/...
 *  - restaurant → /restaurante/...
 *
 * Retry/purge:
 *  - 410/404         → DELETE subscription (endpoint muerto).
 *  - 5xx/throw       → consecutive_failures++, si >=3 DELETE.
 *  - 2xx             → last_success_at=now(), consecutive_failures=0.
 */

// @ts-expect-error: Deno remote import
import webpush from 'https://esm.sh/web-push@3.6.7'
import { createServiceRoleClient } from '../_shared/supabase.ts'

// @ts-expect-error: Deno.env
const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
// @ts-expect-error: Deno.env
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
// @ts-expect-error: Deno.env
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:soporte@tindivo.pe'

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

type Role = 'driver' | 'restaurant' | 'admin'

type EventRow = {
  id: string
  event_type: string
  aggregate_type: string
  aggregate_id: string
  payload: Record<string, unknown>
}

type Notification = {
  title: string
  body: string
  url: string
  tag?: string
  requireInteraction?: boolean
  vibrate?: number[]
}

type Recipient = { userId: string; role: Role }

function fmtPEN(n: number | string | null | undefined): string {
  const v = Number(n ?? 0)
  return `S/ ${v.toFixed(2)}`
}

/**
 * Mapea un evento + rol del recipient a una notificación (o null si no debe
 * generar push para ese rol). Las URLs por rol previenen 404s: el driver
 * navega bajo /motorizado y el restaurante bajo /restaurante.
 */
function notificationFor(event: EventRow, context: any, role: Role): Notification | null {
  if (event.aggregate_type === 'Order') {
    const restaurantName = context?.restaurants?.name ?? 'Tindivo'
    const shortId = context?.short_id ?? ''
    const amount = context?.order_amount ? fmtPEN(context.order_amount) : ''
    const tag = `order-${shortId || event.aggregate_id}`

    switch (event.event_type) {
      case 'OrderCreated':
        // Ya no notifica a drivers en OrderCreated. El push al driver se dispara
        // con OrderReadyForDrivers cuando el pedido entra en su bandeja.
        return null

      case 'OrderReadyForDrivers':
        if (role !== 'driver') return null
        return {
          title: `Nuevo pedido — ${restaurantName}`,
          body: `${amount} · listo pronto`,
          url: `/motorizado/pedidos/${event.aggregate_id}/preview`,
          tag,
        }

      case 'OrderOverdue':
        if (role !== 'driver') return null
        return {
          title: `Zona roja — ${restaurantName}`,
          body: `El pedido se enfría. ${amount} · acéptalo ya`,
          url: `/motorizado/pedidos/${event.aggregate_id}/preview`,
          tag: `overdue-${shortId || event.aggregate_id}`,
          requireInteraction: true,
          vibrate: [400, 150, 400, 150, 400],
        }

      case 'OrderAccepted':
        if (role !== 'restaurant') return null
        return {
          title: `Motorizado en camino`,
          body: `Tu pedido #${shortId} fue aceptado`,
          url: `/restaurante/pedidos/${event.aggregate_id}`,
          tag,
        }

      case 'DriverArrived':
        if (role !== 'restaurant') return null
        return {
          title: `Motorizado en el local`,
          body: `Recogiendo pedido #${shortId}`,
          url: `/restaurante/pedidos/${event.aggregate_id}`,
          tag,
        }

      case 'OrderDelivered':
        if (role !== 'restaurant') return null
        return {
          title: `Pedido entregado`,
          body: `#${shortId} completado`,
          url: `/restaurante/pedidos/${event.aggregate_id}`,
          tag,
        }

      case 'OrderCancelled': {
        const base = `#${shortId} ha sido cancelado`
        if (role === 'driver') {
          return {
            title: `Pedido cancelado`,
            body: base,
            url: `/motorizado/pedidos/${event.aggregate_id}`,
            tag,
          }
        }
        if (role === 'restaurant') {
          return {
            title: `Pedido cancelado`,
            body: base,
            url: `/restaurante/pedidos/${event.aggregate_id}`,
            tag,
          }
        }
        return null
      }

      default:
        return null
    }
  }

  if (event.aggregate_type === 'CashSettlement') {
    const payload = event.payload ?? {}
    const driverName = context?.drivers?.full_name ?? 'El motorizado'
    const restaurantName = context?.restaurants?.name ?? 'el restaurante'
    const tag = `cash-${event.aggregate_id}`

    switch (event.event_type) {
      case 'CashSettlementDelivered':
        if (role !== 'restaurant') return null
        return {
          title: `Efectivo por confirmar — ${driverName}`,
          body: `Declara haber entregado ${fmtPEN(payload.delivered_amount as number)} de ${payload.order_count ?? 0} pedido(s). Tócalo para validar.`,
          url: `/restaurante/efectivo`,
          tag,
        }

      case 'CashSettlementConfirmed':
        if (role !== 'driver') return null
        return {
          title: `Recepción confirmada`,
          body: `${restaurantName} confirmó ${fmtPEN(payload.confirmed_amount as number)} de efectivo.`,
          url: `/motorizado/efectivo`,
          tag,
        }

      case 'CashSettlementDisputed':
        if (role !== 'driver') return null
        return {
          title: `Diferencia reportada`,
          body: `${restaurantName} reportó una diferencia. Tindivo está revisando — no discutas en el local.`,
          url: `/motorizado/efectivo`,
          tag,
        }

      case 'CashSettlementResolved': {
        const body = `Monto final: ${fmtPEN(payload.resolved_amount as number)}.`
        if (role === 'driver') {
          return {
            title: `Caso resuelto por Tindivo`,
            body,
            url: `/motorizado/efectivo`,
            tag,
          }
        }
        if (role === 'restaurant') {
          return {
            title: `Caso resuelto por Tindivo`,
            body,
            url: `/restaurante/efectivo`,
            tag,
          }
        }
        return null
      }

      default:
        return null
    }
  }

  return null
}

/**
 * Determina los recipients (userId + rol) de un evento.
 */
async function resolveRecipients(
  sb: ReturnType<typeof createServiceRoleClient>,
  event: EventRow,
): Promise<Recipient[]> {
  if (event.aggregate_type === 'Order') {
    const { data: order } = await sb
      .from('orders')
      .select('restaurant_id, driver_id, restaurants(user_id), drivers(user_id)')
      .eq('id', event.aggregate_id)
      .maybeSingle()

    if (!order) return []

    const out: Recipient[] = []

    switch (event.event_type) {
      case 'OrderReadyForDrivers':
      case 'OrderOverdue': {
        const { data: drivers } = await sb
          .from('drivers')
          .select('user_id, driver_availability(is_available)')
          .eq('is_active', true)
        for (const d of drivers ?? []) {
          if (d.driver_availability?.is_available && d.user_id) {
            out.push({ userId: d.user_id, role: 'driver' })
          }
        }
        break
      }

      case 'OrderAccepted':
      case 'DriverArrived':
      case 'OrderDelivered':
        if (order.restaurants?.user_id) {
          out.push({ userId: order.restaurants.user_id, role: 'restaurant' })
        }
        break

      case 'OrderCancelled':
        if (order.drivers?.user_id) {
          out.push({ userId: order.drivers.user_id, role: 'driver' })
        }
        if (order.restaurants?.user_id) {
          out.push({ userId: order.restaurants.user_id, role: 'restaurant' })
        }
        break
    }

    // Dedupe por userId + role
    const seen = new Set<string>()
    return out.filter((r) => {
      const key = `${r.userId}:${r.role}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  if (event.aggregate_type === 'CashSettlement') {
    const { data: settlement } = await sb
      .from('cash_settlements')
      .select('restaurant_id, driver_id, restaurants(user_id), drivers(user_id)')
      .eq('id', event.aggregate_id)
      .maybeSingle()

    if (!settlement) return []

    const out: Recipient[] = []
    switch (event.event_type) {
      case 'CashSettlementDelivered':
        if (settlement.restaurants?.user_id) {
          out.push({ userId: settlement.restaurants.user_id, role: 'restaurant' })
        }
        break
      case 'CashSettlementConfirmed':
      case 'CashSettlementDisputed':
        if (settlement.drivers?.user_id) {
          out.push({ userId: settlement.drivers.user_id, role: 'driver' })
        }
        break
      case 'CashSettlementResolved':
        if (settlement.drivers?.user_id) {
          out.push({ userId: settlement.drivers.user_id, role: 'driver' })
        }
        if (settlement.restaurants?.user_id) {
          out.push({ userId: settlement.restaurants.user_id, role: 'restaurant' })
        }
        break
    }
    return out
  }

  return []
}

/**
 * Envía la notificación a una lista de suscripciones con manejo de errores
 * que mantiene saneada la tabla push_subscriptions.
 */
async function sendToSubscriptions(
  sb: ReturnType<typeof createServiceRoleClient>,
  subs: Array<{
    id: string
    endpoint: string
    p256dh: string
    auth: string
    consecutive_failures?: number
  }>,
  notification: Notification,
  tag: string,
): Promise<number> {
  let pushed = 0
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(notification),
        { TTL: 60, urgency: 'high', topic: tag },
      )
      pushed++
      await sb
        .from('push_subscriptions')
        .update({ last_success_at: new Date().toISOString(), consecutive_failures: 0 })
        .eq('id', sub.id)
    } catch (err: any) {
      const code = err?.statusCode
      if (code === 410 || code === 404) {
        // Endpoint muerto — limpiar
        await sb.from('push_subscriptions').delete().eq('id', sub.id)
      } else {
        // Error transitorio: incrementar contador. Purgar al 3er fallo.
        const next = (sub.consecutive_failures ?? 0) + 1
        if (next >= 3) {
          await sb.from('push_subscriptions').delete().eq('id', sub.id)
        } else {
          await sb
            .from('push_subscriptions')
            .update({ consecutive_failures: next })
            .eq('id', sub.id)
        }
      }
    }
  }
  return pushed
}

Deno.serve(async () => {
  const sb = createServiceRoleClient()

  const { data: events, error } = await sb
    .from('domain_events')
    .select('id, event_type, aggregate_type, aggregate_id, payload')
    .is('published_at', null)
    .eq('status', 'pending')
    .order('occurred_at', { ascending: true })
    .limit(50)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let processed = 0
  let pushed = 0

  for (const event of (events ?? []) as EventRow[]) {
    // Cargar contexto del agregado para los mensajes.
    let context: any = null
    if (event.aggregate_type === 'Order') {
      const { data } = await sb
        .from('orders')
        .select('short_id, order_amount, restaurants(name)')
        .eq('id', event.aggregate_id)
        .maybeSingle()
      context = data
    } else if (event.aggregate_type === 'CashSettlement') {
      const { data } = await sb
        .from('cash_settlements')
        .select('delivered_amount, restaurants(name), drivers(full_name)')
        .eq('id', event.aggregate_id)
        .maybeSingle()
      context = data
    }

    const recipients = await resolveRecipients(sb, event)
    if (recipients.length === 0) {
      await sb
        .from('domain_events')
        .update({ published_at: new Date().toISOString(), status: 'published' })
        .eq('id', event.id)
      processed++
      continue
    }

    // Agrupar recipients por rol para elegir URL correcta en notificationFor.
    const byRole = new Map<Role, string[]>()
    for (const r of recipients) {
      const list = byRole.get(r.role) ?? []
      list.push(r.userId)
      byRole.set(r.role, list)
    }

    for (const [role, userIds] of byRole) {
      const notification = notificationFor(event, context, role)
      if (!notification) continue

      const { data: subs } = await sb
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth, consecutive_failures')
        .in('user_id', userIds)

      if (!subs || subs.length === 0) continue

      const count = await sendToSubscriptions(
        sb,
        subs,
        notification,
        notification.tag ?? event.event_type,
      )
      pushed += count
    }

    await sb
      .from('domain_events')
      .update({ published_at: new Date().toISOString(), status: 'published' })
      .eq('id', event.id)
    processed++
  }

  return new Response(JSON.stringify({ processed, pushed }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
