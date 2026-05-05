/// <reference lib="webworker" />
import { defaultCache } from '@serwist/next/worker'
import { NetworkFirst, type RuntimeCaching, Serwist } from 'serwist'

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (string | { url: string; revision: string | null })[]
}

/**
 * Service Worker de la PWA cliente (`apps/customer`).
 *
 * Por ahora solo precache + offline cache. NO incluye push handlers porque
 * los clientes (anónimos hoy) no se suscriben a Web Push. Cuando agreguemos
 * cuentas de cliente y notificaciones, copiar el patrón de `apps/web/src/sw.ts`
 * (handlers `push`, `notificationclick`, `pushsubscriptionchange`).
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
