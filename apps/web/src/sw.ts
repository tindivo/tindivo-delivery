/// <reference lib="webworker" />
import { defaultCache } from '@serwist/next/worker'
import { Serwist } from 'serwist'

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (string | { url: string; revision: string | null })[]
}

/**
 * Service Worker de Tindivo.
 *
 * Responsabilidades:
 *  1. Precache + offline cache (serwist/runtime cache por defecto).
 *  2. Recibir push notifications del servidor (Edge Function send-push).
 *  3. Abrir la URL del pedido al hacer click en la notificación.
 *
 * Las notificaciones se entregan aunque la PWA esté cerrada siempre que
 * (1) el SW esté instalado, (2) el user haya dado permiso, (3) el dispositivo
 * tenga conexión. En iOS 16.4+ requiere que la PWA esté en Home Screen.
 */

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
})

serwist.addEventListeners()

// ─────────────────────────────────────────────────────────────────────────
// PUSH NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────

type PushPayload = {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  url?: string
  requireInteraction?: boolean
  silent?: boolean
  vibrate?: number[]
}

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload: PushPayload
  try {
    payload = event.data.json() as PushPayload
  } catch {
    payload = {
      title: 'Tindivo',
      body: event.data.text(),
    }
  }

  const {
    title = 'Tindivo',
    body = '',
    icon = '/icon-192.png',
    badge = '/icon-192.png',
    tag,
    url = '/',
    requireInteraction = false,
    silent = false,
    vibrate = [200, 100, 200],
  } = payload

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag,
      requireInteraction,
      silent,
      data: { url },
      // `vibrate` solo soportado en Android — browsers lo ignoran silenciosamente
      // @ts-expect-error vibrate no está en TS lib por variar soporte
      vibrate,
    }),
  )
})

// ─────────────────────────────────────────────────────────────────────────
// NOTIFICATION CLICK — abrir URL del evento
// ─────────────────────────────────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const data = event.notification.data as { url?: string } | undefined
  const targetUrl = data?.url ?? '/'

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })

      // Si ya hay un tab abierto, focus + navegar
      for (const client of allClients) {
        if ('focus' in client) {
          const url = new URL(client.url)
          if (url.origin === self.location.origin) {
            await client.focus()
            if ('navigate' in client && client.url !== self.location.origin + targetUrl) {
              return (client as WindowClient).navigate(targetUrl)
            }
            return
          }
        }
      }

      // Si no hay tab abierto, abrir uno nuevo
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    })(),
  )
})

// ─────────────────────────────────────────────────────────────────────────
// PUSH SUBSCRIPTION CHANGE — re-suscribir transparentemente
// ─────────────────────────────────────────────────────────────────────────

self.addEventListener('pushsubscriptionchange', (event) => {
  const e = event as Event & {
    oldSubscription?: PushSubscription | null
    waitUntil: (p: Promise<unknown>) => void
  }
  const oldSub = e.oldSubscription
  e.waitUntil(
    (async () => {
      // Aquí idealmente notificaríamos al backend del cambio. Por ahora,
      // dejamos que la próxima vez que el usuario abra la app el hook
      // usePushSubscription re-establezca el subscription.
      console.log('[SW] pushsubscriptionchange', oldSub?.endpoint)
    })(),
  )
})
