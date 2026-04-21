'use client'
import { useEffect } from 'react'

declare global {
  interface Window {
    serwist?: {
      register: () => Promise<ServiceWorkerRegistration | undefined>
    }
  }
}

/**
 * Registra el Service Worker de Serwist en el cliente.
 *
 * `@serwist/next` compila `public/sw.js` pero **no lo registra automáticamente**
 * — expone `window.serwist.register()`. Sin este registro, Chrome no considera
 * instalable la PWA y no muestra el banner "Instalar app" ni dispara el
 * evento `beforeinstallprompt`.
 *
 * Fallback: si `window.serwist` todavía no está listo (race condition con
 * el bundle del worker entry), hace un registro manual directo a `/sw.js`.
 */
export function RegisterPWA() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    // Serwist expone window.serwist en el bundle del worker-entry.
    if (window.serwist !== undefined) {
      window.serwist.register().catch((err) => {
        console.error('[pwa] serwist.register failed, falling back', err)
        navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((e) => {
          console.error('[pwa] manual register failed', e)
        })
      })
      return
    }

    // Fallback directo — registra el SW que ya compiló Serwist.
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch((err) => console.error('[pwa] manual register failed', err))
  }, [])

  return null
}
