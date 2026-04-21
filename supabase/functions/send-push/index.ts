/**
 * Edge Function: send-push
 *
 * Procesa los eventos pendientes en la tabla `domain_events` (outbox) y
 * envía Web Push a los usuarios correspondientes mediante VAPID.
 *
 * Invocación: por pg_cron cada minuto o por trigger pg_net tras INSERT
 * en domain_events.
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
}

/**
 * Mapea un evento a una notificación (o null si no debe generar push).
 */
function notificationFor(event: EventRow, order: any): Notification | null {
  const restaurantName = order?.restaurants?.name ?? 'Tindivo'
  const shortId = order?.short_id ?? ''
  const amount = order?.order_amount ? `S/ ${Number(order.order_amount).toFixed(2)}` : ''

  switch (event.event_type) {
    case 'OrderCreated':
      return {
        title: `Nuevo pedido — ${restaurantName}`,
        body: `${amount} · listo pronto`,
        url: `/orders/available`,
        tag: `order-${shortId}`,
      }
    case 'OrderAccepted':
      return {
        title: `Motorizado en camino`,
        body: `Tu pedido #${shortId} fue aceptado`,
        url: `/orders/${event.aggregate_id}`,
        tag: `order-${shortId}`,
      }
    case 'DriverArrived':
      return {
        title: `Motorizado en el local`,
        body: `Recogiendo pedido #${shortId}`,
        url: `/orders/${event.aggregate_id}`,
        tag: `order-${shortId}`,
      }
    case 'OrderDelivered':
      return {
        title: `Pedido entregado ✓`,
        body: `#${shortId} completado`,
        url: `/orders/${event.aggregate_id}`,
        tag: `order-${shortId}`,
      }
    case 'OrderCancelled':
      return {
        title: `Pedido cancelado`,
        body: `#${shortId} ha sido cancelado`,
        url: `/orders/${event.aggregate_id}`,
        tag: `order-${shortId}`,
      }
    default:
      return null
  }
}

/**
 * Determina los userIds destinatarios de un evento.
 */
async function resolveRecipients(sb: ReturnType<typeof createServiceRoleClient>, event: EventRow): Promise<string[]> {
  if (event.aggregate_type !== 'Order') return []

  const { data: order } = await sb
    .from('orders')
    .select('restaurant_id, driver_id, restaurants(user_id), drivers(user_id)')
    .eq('id', event.aggregate_id)
    .maybeSingle()

  if (!order) return []

  const users: string[] = []

  switch (event.event_type) {
    case 'OrderCreated':
      // Todos los drivers activos y disponibles
      {
        const { data: drivers } = await sb
          .from('drivers')
          .select('user_id, driver_availability(is_available)')
          .eq('is_active', true)
        for (const d of drivers ?? []) {
          if (d.driver_availability?.is_available) users.push(d.user_id)
        }
      }
      break
    case 'OrderAccepted':
    case 'DriverArrived':
      if (order.restaurants?.user_id) users.push(order.restaurants.user_id)
      break
    case 'OrderDelivered':
      if (order.restaurants?.user_id) users.push(order.restaurants.user_id)
      break
    case 'OrderCancelled':
      if (order.drivers?.user_id) users.push(order.drivers.user_id)
      if (order.restaurants?.user_id) users.push(order.restaurants.user_id)
      break
    default:
      break
  }

  return [...new Set(users)]
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
    const { data: order } = await sb
      .from('orders')
      .select('short_id, order_amount, restaurants(name)')
      .eq('id', event.aggregate_id)
      .maybeSingle()

    const notification = notificationFor(event, order)
    if (!notification) {
      await sb
        .from('domain_events')
        .update({ published_at: new Date().toISOString(), status: 'published' })
        .eq('id', event.id)
      processed++
      continue
    }

    const userIds = await resolveRecipients(sb, event)
    if (userIds.length === 0) {
      await sb
        .from('domain_events')
        .update({ published_at: new Date().toISOString(), status: 'published' })
        .eq('id', event.id)
      processed++
      continue
    }

    const { data: subs } = await sb
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .in('user_id', userIds)

    for (const sub of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(notification),
          { TTL: 60, urgency: 'high', topic: notification.tag ?? event.event_type },
        )
        pushed++
      } catch (err: any) {
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          await sb.from('push_subscriptions').delete().eq('id', sub.id)
        }
      }
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
