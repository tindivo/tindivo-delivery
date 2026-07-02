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
  retry_count?: number
}

type Notification = {
  title: string
  body: string
  url: string
  tag?: string
  requireInteraction?: boolean
  vibrate?: number[]
}

/**
 * `kind` permite diferenciar mensajes para distintos recipients del MISMO rol
 * en un evento. Caso de uso: `OrderTransferAutoAccepted` notifica al dueño
 * anterior (kind='from') con un mensaje distinto al del nuevo dueño
 * (kind='to'), aunque ambos son `role='driver'`. Para eventos donde no aplica,
 * se omite y el agrupamiento usa solo el rol.
 */
type Recipient = { userId: string; role: Role; kind?: 'from' | 'to' }

type OrderContext = {
  short_id: string | null
  client_name: string | null
  order_amount: number | string | null
  restaurants: { name: string | null } | null
} | null

type CashSettlementContext = {
  delivered_amount: number | string | null
  restaurants: { name: string | null } | null
  drivers: { full_name: string | null } | null
} | null

type EventContext = OrderContext | CashSettlementContext

function fmtPEN(n: number | string | null | undefined): string {
  const v = Number(n ?? 0)
  return `S/ ${v.toFixed(2)}`
}

/**
 * Mapea un evento + rol del recipient a una notificación (o null si no debe
 * generar push para ese rol). Las URLs por rol previenen 404s: el driver
 * navega bajo /motorizado y el restaurante bajo /restaurante.
 */
function notificationFor(
  event: EventRow,
  context: EventContext,
  role: Role,
  kind?: 'from' | 'to',
): Notification | null {
  if (event.aggregate_type === 'Order') {
    const order = context as OrderContext
    const restaurantName = order?.restaurants?.name ?? 'Tindivo'
    const shortId = order?.short_id ?? ''
    const amount = order?.order_amount ? fmtPEN(order.order_amount) : ''
    // Tag único por evento + pedido para evitar colapso entre eventos
    // distintos del mismo pedido. FCM/APNs colapsan pushes con mismo tag,
    // así que `OrderAssigned` y `OrderAccepted` del mismo pedido pisaban
    // el primero. Manteniendo el shortId en el tag, retries del mismo
    // evento sí se deduplican (deseado).
    const tag = `${event.event_type}-${shortId || event.aggregate_id}`
    // Etiqueta humana del pedido para el restaurante: nombre del cliente si
    // se ingresó al crear, sino fallback al #shortId. Para el driver se usa
    // siempre #shortId (el driver no necesariamente conoce al cliente).
    const clientName = order?.client_name?.trim() || null
    const restaurantOrderLabel = clientName ?? (shortId ? `#${shortId}` : 'tu pedido')

    switch (event.event_type) {
      case 'OrderCreated':
      case 'OrderAcceptedByRestaurant': {
        const prepMinutes = Number(
          event.payload?.prepMinutes ?? event.payload?.acceptedPrepMinutes ?? 0,
        )
        if (role !== 'driver' || prepMinutes <= 10) return null
        return {
          title: `Pedido en preparación — ${restaurantName}`,
          body: `Se acaba de registrar un pedido en ${restaurantName}. Estará listo en ${prepMinutes} minutos. Atento.`,
          url: `/motorizado?tab=available`,
          tag: `preparing-${shortId || event.aggregate_id}`,
        }
      }

      case 'OrderReadyForDrivers':
        if (role !== 'driver') return null
        return {
          title: `Nuevo pedido — ${restaurantName}`,
          body: `${amount} · listo pronto`,
          url: `/motorizado/pedidos/${event.aggregate_id}/preview`,
          tag: `ready-${shortId || event.aggregate_id}`,
          // En Android Chrome con Doze Mode, las notificaciones sin
          // requireInteraction se marcan como "low priority" y pueden
          // ocultarse silenciosamente. Para el evento principal de la
          // bandeja del driver, forzamos persistencia + vibración.
          requireInteraction: true,
          vibrate: [300, 120, 300],
        }

      case 'OrderAssigned':
        if (role !== 'driver') return null
        return {
          title: `Pedido asignado — ${restaurantName}`,
          body: `${amount} · revisa tu cola`,
          url: `/motorizado/pedidos/${event.aggregate_id}`,
          tag: `assigned-${shortId || event.aggregate_id}`,
          requireInteraction: true,
          vibrate: [300, 120, 300],
        }

      case 'OrderReassigned':
        // Caso: un motorizado transfirió su pedido (accidente, avería) a otro
        // compañero. Notificamos al destinatario para que tome la entrega y
        // al restaurante para que sepa quién se hace responsable ahora.
        if (role === 'driver') {
          return {
            title: `Te pasaron un pedido — ${restaurantName}`,
            body: `${amount} · entrégalo lo antes posible`,
            url: `/motorizado/pedidos/${event.aggregate_id}`,
            tag: `reassigned-${shortId || event.aggregate_id}`,
            requireInteraction: true,
            vibrate: [300, 120, 300],
          }
        }
        if (role === 'restaurant') {
          return {
            title: 'Cambio de motorizado',
            body: `${restaurantOrderLabel} ahora va con otro motorizado`,
            url: `/restaurante/pedidos/${event.aggregate_id}`,
            tag: `reassigned-${shortId || event.aggregate_id}`,
          }
        }
        return null

      case 'OrderTransferRequested':
        // Driver B (solicitante) le pidió a Driver A (este push) su pedido.
        // A tiene 30s para responder. URL apunta a la pestaña Equipo donde
        // está el banner sticky con countdown + botones Aceptar/Rechazar.
        if (role !== 'driver') return null
        return {
          title: `Te piden tu pedido — #${shortId}`,
          body: `Un compañero quiere atender este pedido. Acepta o rechaza en 30s.`,
          url: `/motorizado?tab=team`,
          tag: `transfer-req-${event.payload?.transferRequestId ?? event.aggregate_id}`,
          requireInteraction: true,
          vibrate: [300, 120, 300, 120, 300],
        }

      case 'OrderTransferAccepted':
        // Driver A aceptó la solicitud. Push al solicitante (Driver B) con
        // deeplink al detalle del pedido — ahora está en su mochila.
        if (role !== 'driver') return null
        return {
          title: `¡Tu solicitud fue aceptada! — #${shortId}`,
          body: `${restaurantName} · entrégalo lo antes posible`,
          url: `/motorizado/pedidos/${event.aggregate_id}`,
          tag: `transfer-accept-${event.payload?.transferRequestId ?? event.aggregate_id}`,
          requireInteraction: true,
          vibrate: [300, 120, 300],
        }

      case 'OrderTransferRejected':
        // Driver A rechazó manualmente. Push al solicitante (Driver B) para
        // que vuelva a Equipo y busque otro pedido.
        if (role !== 'driver') return null
        return {
          title: `Solicitud rechazada — #${shortId}`,
          body: `Tu compañero no pudo aceptar. Busca otro pedido en Equipo.`,
          url: `/motorizado?tab=team`,
          tag: `transfer-reject-${event.payload?.transferRequestId ?? event.aggregate_id}`,
        }

      case 'OrderTransferAutoAccepted': {
        // Driver A NO respondió en 30s. El cron transfirió automáticamente
        // a Driver B. Doble push: A recibe aviso (perdiste el pedido), B
        // recibe el mismo mensaje que en accept manual ("¡fue aceptada!").
        if (role !== 'driver') return null
        const transferRequestId =
          (event.payload as Record<string, unknown> | null)?.transferRequestId ?? event.aggregate_id
        if (kind === 'from') {
          return {
            title: `Tu pedido se transfirió — #${shortId}`,
            body: `No respondiste a tiempo. Ahora va con otro motorizado.`,
            url: `/motorizado?tab=team`,
            tag: `transfer-auto-from-${transferRequestId}`,
          }
        }
        // kind === 'to' (solicitante)
        return {
          title: `¡Tu solicitud fue aceptada! — #${shortId}`,
          body: `${restaurantName} · entrégalo lo antes posible`,
          url: `/motorizado/pedidos/${event.aggregate_id}`,
          tag: `transfer-auto-to-${transferRequestId}`,
          requireInteraction: true,
          vibrate: [300, 120, 300],
        }
      }

      case 'OrderTransferExpired': {
        // Expiró sin transferir porque el solicitante ya no es elegible.
        // Push solo a B con el motivo para que entienda por qué no calificó.
        if (role !== 'driver') return null
        const transferRequestId =
          (event.payload as Record<string, unknown> | null)?.transferRequestId ?? event.aggregate_id
        const reason = (event.payload as Record<string, unknown> | null)?.reason as
          | 'requester_capacity_exceeded'
          | 'requester_not_authorized'
          | 'order_already_transferred'
          | undefined
        const bodyByReason: Record<string, string> = {
          requester_capacity_exceeded: 'Ya no calificas porque tu mochila está llena.',
          requester_not_authorized: 'Ya no estás asignado a este restaurante.',
          order_already_transferred: 'El pedido ya cambió de dueño.',
        }
        return {
          title: `Solicitud vencida — #${shortId}`,
          body:
            (reason && bodyByReason[reason]) ?? 'Tu solicitud venció. Busca otro pedido en Equipo.',
          url: `/motorizado?tab=team`,
          tag: `transfer-expired-${transferRequestId}`,
        }
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

      case 'OrderMarkedUrgent':
        if (role !== 'driver') return null
        return {
          title: `¡Pedido urgente disponible! — ${restaurantName}`,
          body: `Se liberó ${amount} · tómalo ya`,
          url: `/motorizado?tab=team`,
          tag: `urgent-${shortId || event.aggregate_id}`,
          requireInteraction: true,
          vibrate: [400, 150, 400, 150, 400],
        }

      case 'OrderAccepted':
        if (role !== 'restaurant') return null
        return {
          title: 'Motorizado en camino',
          body: `Pedido de ${restaurantOrderLabel} fue aceptado`,
          url: `/restaurante/pedidos/${event.aggregate_id}`,
          tag: `accepted-${shortId || event.aggregate_id}`,
        }

      case 'OrderPendingAcceptance':
        // Push al restaurante: nuevo pedido del cliente que requiere
        // aceptación con prep_time. Auto-cancel a los 5 min sin respuesta,
        // por eso requireInteraction + vibración persistente.
        if (role !== 'restaurant') return null
        return {
          title: `Nuevo pedido del cliente — ${amount}`,
          body: `${restaurantOrderLabel} · acepta en menos de 5 min antes de que se cancele`,
          url: `/restaurante`,
          tag: `pending-${shortId || event.aggregate_id}`,
          requireInteraction: true,
          vibrate: [400, 150, 400, 150, 400],
        }

      // Removido caso viejo ya mapeado arriba

      case 'DriverArrived':
        if (role !== 'restaurant') return null
        return {
          title: 'Motorizado en el local',
          body: `Recogiendo pedido de ${restaurantOrderLabel}`,
          url: `/restaurante/pedidos/${event.aggregate_id}`,
          tag: `arrived-${shortId || event.aggregate_id}`,
        }

      case 'OrderDelivered':
        if (role !== 'restaurant') return null
        return {
          title: 'Pedido entregado',
          body: `Pedido de ${restaurantOrderLabel} completado`,
          url: `/restaurante/pedidos/${event.aggregate_id}`,
          tag: `delivered-${shortId || event.aggregate_id}`,
        }

      case 'OrderEditedByRestaurant': {
        // Solo notificamos al driver si ya tiene el pedido asignado: en ese
        // caso necesita ver el cambio de monto/método/cliente al instante.
        if (role !== 'driver') return null
        const payload = event.payload as {
          newClientName?: string | null
          previousOrderAmount?: number
          newOrderAmount?: number
          previousPaymentStatus?: string
          newPaymentStatus?: string
        }
        const changedAmount =
          payload.newOrderAmount != null &&
          payload.previousOrderAmount != null &&
          payload.newOrderAmount !== payload.previousOrderAmount
        const changedMethod =
          payload.newPaymentStatus != null &&
          payload.previousPaymentStatus != null &&
          payload.newPaymentStatus !== payload.previousPaymentStatus
        const parts: string[] = []
        if (changedAmount) parts.push(`monto S/ ${Number(payload.newOrderAmount).toFixed(2)}`)
        if (changedMethod) parts.push('método de pago')
        if (parts.length === 0) parts.push('datos del pedido')
        return {
          title: `Pedido actualizado — ${restaurantName}`,
          body: `El restaurante cambió ${parts.join(' y ')}.`,
          url: `/motorizado/pedidos/${event.aggregate_id}`,
          tag: `edited-${shortId || event.aggregate_id}`,
          requireInteraction: true,
          vibrate: [250, 100, 250],
        }
      }

      case 'OrderCancelled': {
        if (role === 'driver') {
          return {
            title: 'Pedido cancelado',
            body: `#${shortId} ha sido cancelado`,
            url: `/motorizado/pedidos/${event.aggregate_id}`,
            tag: `cancelled-${shortId || event.aggregate_id}`,
          }
        }
        if (role === 'restaurant') {
          return {
            title: 'Pedido cancelado',
            body: `Pedido de ${restaurantOrderLabel} ha sido cancelado`,
            url: `/restaurante/pedidos/${event.aggregate_id}`,
            tag: `cancelled-${shortId || event.aggregate_id}`,
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
    const settlement = context as CashSettlementContext
    const driverName = settlement?.drivers?.full_name ?? 'El motorizado'
    const restaurantName = settlement?.restaurants?.name ?? 'el restaurante'
    const tag = `cash-${event.aggregate_id}`

    switch (event.event_type) {
      case 'CashSettlementDelivered':
        if (role !== 'restaurant') return null
        return {
          title: `Efectivo por confirmar — ${driverName}`,
          body: `Declara haber entregado ${fmtPEN(payload.delivered_amount as number)} de ${payload.order_count ?? 0} pedido(s). Tócalo para validar.`,
          url: '/restaurante/efectivo',
          tag,
        }

      case 'CashSettlementConfirmed':
        if (role !== 'driver') return null
        return {
          title: 'Recepción confirmada',
          body: `${restaurantName} confirmó ${fmtPEN(payload.confirmed_amount as number)} de efectivo.`,
          url: '/motorizado/efectivo',
          tag,
        }

      case 'CashSettlementDisputed':
        if (role !== 'driver') return null
        return {
          title: 'Diferencia reportada',
          body: `${restaurantName} reportó una diferencia. Tindivo está revisando — no discutas en el local.`,
          url: '/motorizado/efectivo',
          tag,
        }

      case 'CashSettlementResolved': {
        const body = `Monto final: ${fmtPEN(payload.resolved_amount as number)}.`
        if (role === 'driver') {
          return {
            title: 'Caso resuelto por Tindivo',
            body,
            url: '/motorizado/efectivo',
            tag,
          }
        }
        if (role === 'restaurant') {
          return {
            title: 'Caso resuelto por Tindivo',
            body,
            url: '/restaurante/efectivo',
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
    // Hint `!orders_driver_id_fkey` desambigua el embed `drivers(...)`. Sin
    // el hint, la migración que añadió `order_assignment_rejections.driver_id`
    // (FK a drivers) crea una segunda ruta lógica entre `orders` y `drivers`
    // y PostgREST devuelve PGRST201, este SELECT retorna data=null y la
    // función marca el evento como published sin enviar ningún push.
    const { data: order } = await sb
      .from('orders')
      .select(
        'restaurant_id, driver_id, restaurants(user_id), drivers!orders_driver_id_fkey(user_id)',
      )
      .eq('id', event.aggregate_id)
      .maybeSingle()

    if (!order) return []

    const out: Recipient[] = []

    switch (event.event_type) {
      case 'OrderCreated':
      case 'OrderAcceptedByRestaurant': {
        const prepMinutes = Number(
          event.payload?.prepMinutes ?? event.payload?.acceptedPrepMinutes ?? 0,
        )
        if (prepMinutes > 10) {
          const { data: drivers } = await sb.from('drivers').select('user_id').eq('is_active', true)
          for (const d of drivers ?? []) {
            if (d.user_id) {
              out.push({ userId: d.user_id, role: 'driver' })
            }
          }
        }
        break
      }

      case 'OrderReadyForDrivers':
      case 'OrderOverdue':
      case 'OrderMarkedUrgent': {
        // Push se envía a TODOS los drivers activos con suscripción push,
        // sin importar `driver_availability.is_available`. El motorizado "No
        // disponible" recibe el push informativo y puede:
        //   1) activar disponibilidad manualmente, o
        //   2) reclamar el pedido directamente desde el deeplink del push
        //      (`/motorizado/pedidos/{id}/preview` → claimUrgentOrderUseCase
        //      que tampoco valida availability).
        // El filtro `is_available=true` SIGUE vigente en la asignación
        // automática (policy R1-R5 / findAssignmentCandidates) — esto es
        // solo desacoplar la NOTIFICACIÓN. Sin esto, drivers con sub válida
        // pero "No disponible" nunca recibían ofertas, dejándolos en un
        // limbo donde no podían volver a participar sin entrar primero a
        // la PWA por azar.
        const { data: drivers } = await sb.from('drivers').select('user_id').eq('is_active', true)
        for (const d of drivers ?? []) {
          if (d.user_id) {
            out.push({ userId: d.user_id, role: 'driver' })
          }
        }
        break
      }

      case 'OrderAssigned':
        if (order.drivers?.user_id) {
          out.push({ userId: order.drivers.user_id, role: 'driver' })
        }
        break

      case 'OrderReassigned':
        // `order.drivers.user_id` ya apunta al nuevo driver porque la fila
        // orders se actualizó antes de insertar el domain_event.
        if (order.drivers?.user_id) {
          out.push({ userId: order.drivers.user_id, role: 'driver' })
        }
        if (order.restaurants?.user_id) {
          out.push({ userId: order.restaurants.user_id, role: 'restaurant' })
        }
        break

      case 'OrderEditedByRestaurant':
        // Avisar al driver SOLO si el pedido ya tiene driver asignado.
        if (order.drivers?.user_id) {
          out.push({ userId: order.drivers.user_id, role: 'driver' })
        }
        break

      case 'OrderAccepted':
      case 'DriverArrived':
      case 'OrderDelivered':
      case 'OrderPendingAcceptance':
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

      case 'OrderTransferRequested': {
        // Push solo al dueño actual (fromDriverId del payload). NO usamos
        // order.drivers porque ese ya podría apuntar al nuevo dueño en
        // `OrderTransferAccepted` que se publica casi simultáneo. El payload
        // del evento es la fuente de verdad para "a quién avisar".
        const fromDriverId = (event.payload as Record<string, unknown> | null)?.fromDriverId
        if (typeof fromDriverId === 'string') {
          const { data: driver } = await sb
            .from('drivers')
            .select('user_id')
            .eq('id', fromDriverId)
            .maybeSingle()
          if (driver?.user_id) out.push({ userId: driver.user_id, role: 'driver' })
        }
        break
      }

      case 'OrderTransferAccepted':
      case 'OrderTransferRejected':
      case 'OrderTransferExpired': {
        // Push al solicitante (toDriverId): "tu solicitud fue aceptada/rechazada/expirada".
        const toDriverId = (event.payload as Record<string, unknown> | null)?.toDriverId
        if (typeof toDriverId === 'string') {
          const { data: driver } = await sb
            .from('drivers')
            .select('user_id')
            .eq('id', toDriverId)
            .maybeSingle()
          if (driver?.user_id) out.push({ userId: driver.user_id, role: 'driver' })
        }
        break
      }

      case 'OrderTransferAutoAccepted': {
        // Doble push: dueño anterior (kind='from') + solicitante (kind='to').
        // Cada uno recibe un mensaje distinto via `kind` en notificationFor.
        const payload = event.payload as Record<string, unknown> | null
        const fromDriverId = payload?.fromDriverId
        const toDriverId = payload?.toDriverId
        if (typeof fromDriverId === 'string') {
          const { data: driver } = await sb
            .from('drivers')
            .select('user_id')
            .eq('id', fromDriverId)
            .maybeSingle()
          if (driver?.user_id) out.push({ userId: driver.user_id, role: 'driver', kind: 'from' })
        }
        if (typeof toDriverId === 'string') {
          const { data: driver } = await sb
            .from('drivers')
            .select('user_id')
            .eq('id', toDriverId)
            .maybeSingle()
          if (driver?.user_id) out.push({ userId: driver.user_id, role: 'driver', kind: 'to' })
        }
        break
      }
    }

    // Dedupe por userId + role + kind (kind diferencia recipients del mismo
    // role en eventos como OrderTransferAutoAccepted).
    const seen = new Set<string>()
    return out.filter((r) => {
      const key = `${r.userId}:${r.role}:${r.kind ?? ''}`
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
          out.push({
            userId: settlement.restaurants.user_id,
            role: 'restaurant',
          })
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
          out.push({
            userId: settlement.restaurants.user_id,
            role: 'restaurant',
          })
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
 *
 * TTL=86400 (24h): si el dispositivo está dormido (iOS lockscreen, Doze
 * Android, batería baja) el provider FCM/APNs guarda el push hasta 24h y lo
 * entrega cuando despierta. El header `topic` colapsa pendientes con mismo
 * tag (p.ej. dos updates del mismo pedido) para no spammear al despertar.
 */
async function sendToSubscriptions(
  sb: ReturnType<typeof createServiceRoleClient>,
  subs: Array<{
    id: string
    endpoint: string
    p256dh: string
    auth: string
    consecutive_failures?: number
    user_id: string
  }>,
  notification: Notification,
  tag: string,
  requestId: string,
  eventType: string,
): Promise<number> {
  // RFC 8030 §5.4: el header `Topic` del request VAPID debe ser <=32 chars
  // URL-safe Base64. Tags como `cash-${uuid}` (41 chars) hacen que web-push
  // lance con `statusCode === undefined` ANTES de tocar la red. El catch lo
  // clasificaba como "transitorio" → consecutive_failures++. En producción
  // se observó 100% de fallo en CashSettlementDelivered/Confirmed durante
  // 48h, agotando subs válidas. Truncamos a 32; el slice sigue siendo único
  // por aggregate_id porque el prefijo + parte del UUID difieren entre
  // eventos. El `notification.tag` completo (en el payload JSON) NO se
  // trunca — el Service Worker del cliente lo usa para dedup visual.
  const safeTopic = tag.slice(0, 32)

  let pushed = 0
  for (const sub of subs) {
    let sentOk = false
    let webpushErr: { code?: number; msg: string } | null = null

    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(notification),
        { TTL: 86400, urgency: 'high', topic: safeTopic },
      )
      sentOk = true
      pushed++
      console.log(`[send-push:${requestId}] pushed sub=${sub.id.slice(0, 8)} topic=${safeTopic}`)
    } catch (err) {
      const code = (err as { statusCode?: number } | null)?.statusCode
      const msg = (err as Error | null)?.message ?? 'unknown'
      webpushErr = { code, msg }
      console.error(
        `[send-push:${requestId}] failed sub=${sub.id.slice(0, 8)} code=${code ?? '?'} msg=${msg}`,
      )
    }

    if (sentOk) {
      // UPDATE en su PROPIO try: si falla (race con cron de prune, RLS edge
      // case), NO afecta la clasificación del push. El push ya fue enviado.
      try {
        await sb
          .from('push_subscriptions')
          .update({
            last_success_at: new Date().toISOString(),
            consecutive_failures: 0,
          })
          .eq('id', sub.id)
      } catch (updateErr) {
        console.warn(
          `[send-push:${requestId}] sub=${sub.id.slice(0, 8)} push enviado pero UPDATE last_success_at falló: ${(updateErr as Error | null)?.message ?? '?'}`,
        )
      }
      // Telemetría: log de entrega exitosa para auditar por usuario.
      // Si la tabla todavía no existe (deploy ordenado: Edge Function vs
      // migration), el insert falla silencioso — best-effort.
      await sb
        .from('push_delivery_log')
        .insert({
          subscription_id: sub.id,
          user_id: sub.user_id,
          event_type: eventType,
          status_code: 200,
          error_text: null,
        })
        .then(
          () => null,
          () => null,
        )
    } else if (webpushErr) {
      // Telemetría del fallo del webpush (best-effort).
      await sb
        .from('push_delivery_log')
        .insert({
          subscription_id: sub.id,
          user_id: sub.user_id,
          event_type: eventType,
          status_code: webpushErr.code ?? null,
          error_text: webpushErr.msg,
        })
        .then(
          () => null,
          () => null,
        )
      if (webpushErr.code === 410 || webpushErr.code === 404) {
        // Endpoint muerto — limpiar.
        await sb.from('push_subscriptions').delete().eq('id', sub.id)
      } else {
        // Error transitorio (5xx, timeout, validation lib): incrementar
        // contador. Purgar al 5to fallo (subido desde 3 para tolerar mejor
        // 5xx esporádicos de FCM/APNs y prevenir agotamiento de subs
        // válidas por bugs latentes del lado servidor).
        const next = (sub.consecutive_failures ?? 0) + 1
        if (next >= 5) {
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

// @ts-expect-error: Deno.serve
Deno.serve(async () => {
  const sb = createServiceRoleClient()
  // requestId acota cada invocación en los logs. 8 hex chars son suficientes
  // para correlacionar líneas dentro de un mismo Deno.serve sin pesar.
  const requestId = crypto.randomUUID().slice(0, 8)

  const { data: events, error } = await sb.rpc('claim_pending_domain_events', {
    p_limit: 50,
  })

  if (error) {
    console.error(`[send-push:${requestId}] events_query_error msg=${error.message}`)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  console.log(`[send-push:${requestId}] start events=${events?.length ?? 0}`)

  const { data: flagRow } = await sb
    .from('app_settings')
    .select('value')
    .eq('key', 'push_urgent_notification_enabled')
    .maybeSingle()
  const urgentEnabled = flagRow?.value === 'true'

  let processed = 0
  let pushed = 0

  for (const event of (events ?? []) as EventRow[]) {
    try {
      if (event.event_type === 'OrderMarkedUrgent' && !urgentEnabled) {
        await sb
          .from('domain_events')
          .update({
            published_at: new Date().toISOString(),
            status: 'published',
          })
          .eq('id', event.id)
        processed++
        continue
      }

      // Cargar contexto del agregado para los mensajes.
      let context: EventContext = null
      if (event.aggregate_type === 'Order') {
        const { data } = await sb
          .from('orders')
          .select('short_id, client_name, order_amount, restaurants(name)')
          .eq('id', event.aggregate_id)
          .maybeSingle<OrderContext>()
        context = data
      } else if (event.aggregate_type === 'CashSettlement') {
        const { data } = await sb
          .from('cash_settlements')
          .select('delivered_amount, restaurants(name), drivers(full_name)')
          .eq('id', event.aggregate_id)
          .maybeSingle<CashSettlementContext>()
        context = data
      }

      const recipients = await resolveRecipients(sb, event)
      console.log(
        `[send-push:${requestId}] event=${event.event_type} agg=${event.aggregate_id} recipients=${recipients.length}`,
      )
      if (recipients.length === 0) {
        await sb
          .from('domain_events')
          .update({
            published_at: new Date().toISOString(),
            status: 'published',
          })
          .eq('id', event.id)
        processed++
        continue
      }

      // Agrupar recipients por (rol, kind) para que recipients del mismo rol
      // pero distinto kind reciban notificaciones diferenciadas
      // (ej: OrderTransferAutoAccepted → push 'from' ≠ push 'to').
      type GroupKey = `${Role}:${'from' | 'to' | ''}`
      const byGroup = new Map<GroupKey, { role: Role; kind?: 'from' | 'to'; userIds: string[] }>()
      for (const r of recipients) {
        const key = `${r.role}:${r.kind ?? ''}` as GroupKey
        const entry = byGroup.get(key) ?? {
          role: r.role,
          kind: r.kind,
          userIds: [],
        }
        entry.userIds.push(r.userId)
        byGroup.set(key, entry)
      }

      for (const [, group] of byGroup) {
        const notification = notificationFor(event, context, group.role, group.kind)
        if (!notification) continue

        const { data: subs } = await sb
          .from('push_subscriptions')
          .select('id, endpoint, p256dh, auth, consecutive_failures, user_id')
          .in('user_id', group.userIds)

        if (!subs || subs.length === 0) {
          console.log(
            `[send-push:${requestId}] no_subs role=${group.role} kind=${group.kind ?? '-'} users=${group.userIds.length} event=${event.event_type}`,
          )
          continue
        }

        const count = await sendToSubscriptions(
          sb,
          subs,
          notification,
          notification.tag ?? event.event_type,
          requestId,
          event.event_type,
        )
        pushed += count
      }

      await sb
        .from('domain_events')
        .update({ published_at: new Date().toISOString(), status: 'published' })
        .eq('id', event.id)
      processed++
    } catch (err) {
      console.error(
        `[send-push:${requestId}] error processing event=${event.id} type=${event.event_type}:`,
        err,
      )
      const errorMsg = (err as Error | null)?.message ?? 'unknown'
      await sb
        .from('domain_events')
        .update({
          status: 'pending',
          retry_count: (event.retry_count ?? 0) + 1,
          last_error: errorMsg.slice(0, 500),
        })
        .eq('id', event.id)
    }
  }

  console.log(`[send-push:${requestId}] done processed=${processed} pushed=${pushed}`)

  return new Response(JSON.stringify({ processed, pushed }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
