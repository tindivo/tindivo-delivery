/// <reference lib="webworker" />
import { defaultCache } from '@serwist/next/worker'
import { NetworkFirst, type RuntimeCaching, Serwist } from 'serwist'

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

// `defaultCache` cachea `/_next/static/*.js` con CacheFirst + maxAgeFrom:'last-used'.
// En PWA usadas a diario los chunks JS nunca expiran y iOS sirve indefinidamente
// código viejo (incluso después de un deploy). Forzamos NetworkFirst para que
// cada navegación pida el bundle más reciente, con fallback a cache si la red
// falla — el modo offline sigue andando para chunks ya visitados.
const runtimeCaching: RuntimeCaching[] = defaultCache.map((rule) => {
  const isNextJsChunk =
    rule.matcher instanceof RegExp && rule.matcher.source === '\\/_next\\/static.+\\.js$'
  if (!isNextJsChunk) return rule
  return {
    ...rule,
    handler: new NetworkFirst({
      cacheName: 'next-static-js-assets',
      networkTimeoutSeconds: 3,
    }),
  }
})

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
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
  // CRÍTICO iOS — Silent push penalty.
  // WebKit revoca PERMANENTEMENTE la suscripción si el handler no muestra
  // una notificación visible (ver Apple Dev Forums thread 727887 y el blog
  // de WebKit "Meet Declarative Web Push"). El comportamiento previo era:
  //   - `if (!event.data) return` → no notif → iOS revoca tras 1-3 pushes.
  //   - Si `event.data.json()` o `event.data.text()` lanzaba → tampoco se
  //     mostraba la notif → mismo problema.
  // Defensa: TODOS los caminos terminan en `showNotification`, con fallback
  // genérico si el payload no se puede parsear. El `try/catch` envuelve solo
  // el parsing — el `showNotification` siempre se ejecuta.
  const promise = (async () => {
    let title = 'Tindivo'
    let options: NotificationOptions = {
      body: 'Tienes una actualización',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
    }

    try {
      if (event.data) {
        let payload: PushPayload | null = null
        try {
          payload = event.data.json() as PushPayload
        } catch {
          try {
            payload = { title: 'Tindivo', body: event.data.text() }
          } catch {
            payload = null
          }
        }

        if (payload) {
          const {
            title: parsedTitle,
            body = '',
            icon = '/icon-192.png',
            badge = '/icon-192.png',
            tag,
            url = '/',
            requireInteraction = false,
            silent,
            vibrate = [200, 100, 200],
          } = payload

          if (parsedTitle) title = parsedTitle

          // Construimos las options sin pasar `silent` cuando no viene
          // explícito — declarar `silent: false` puede causar que algunos
          // browsers traten la notif como "low priority" y la silencien en
          // background. Omitirlo deja al UA aplicar el default (con sonido).
          options = {
            body,
            icon,
            badge,
            tag,
            requireInteraction,
            data: { url },
            // `vibrate` solo soportado en Android — browsers lo ignoran
            // @ts-expect-error vibrate no está en TS lib por variar soporte
            vibrate,
          }
          if (typeof silent === 'boolean') options.silent = silent

          console.log('[sw:push]', { tag, title, body, requireInteraction, hasUrl: !!url })
        } else {
          console.warn('[sw:push] payload no parseable, mostrando notif genérica')
        }
      } else {
        console.warn(
          '[sw:push] sin event.data, mostrando notif genérica para no perder permiso iOS',
        )
      }
    } catch (err) {
      // Cualquier error en parsing cae aquí — igual mostramos la notif
      // genérica de abajo para preservar el permiso iOS.
      console.error('[sw:push] error procesando payload', err)
    }

    return self.registration.showNotification(title, options)
  })()

  event.waitUntil(promise)
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
// PUSH SUBSCRIPTION CHANGE — avisar al frontend para re-suscribir
// ─────────────────────────────────────────────────────────────────────────
//
// El SW no tiene el token de Supabase Auth, así que no puede llamar directo
// a /api/v1/push/subscribe (la API vive en otro origen y requireAuth valida
// Bearer JWT). Estrategia: avisar a cualquier tab abierta vía postMessage.
// Si no hay tab abierta, el AutoHealPush del layout se encarga al siguiente
// boot detectando `permission=granted` + `getSubscription()===null`.

self.addEventListener('pushsubscriptionchange', (event) => {
  const e = event as Event & {
    oldSubscription?: PushSubscription | null
    newSubscription?: PushSubscription | null
    waitUntil: (p: Promise<unknown>) => void
  }
  e.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      for (const client of clientsList) {
        client.postMessage({ type: 'push-subscription-changed' })
      }
    })(),
  )
})
