'use client'
import { useEffect } from 'react'

declare global {
  interface Window {
    serwist?: {
      register: () => Promise<ServiceWorkerRegistration | undefined>
    }
  }
}

const SW_RELOAD_GUARD_KEY = 'tindivo-sw-reloaded'

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
 *
 * Auto-reload tras update: cuando un nuevo SW toma control via `clientsClaim`,
 * las pestañas siguen ejecutando el JS viejo en memoria. Forzamos un reload
 * único (con guard sessionStorage anti-loop) para que el bundle nuevo entre
 * inmediatamente — crítico en iOS PWA donde el código viejo seguía cerrando
 * sesiones globalmente.
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

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    const onControllerChange = () => {
      // Guard: una sola recarga por sesión de tab. Evita loops si el browser
      // dispara controllerchange más de una vez (ej. tras skipWaiting + claim).
      if (sessionStorage.getItem(SW_RELOAD_GUARD_KEY) === '1') return
      sessionStorage.setItem(SW_RELOAD_GUARD_KEY, '1')
      window.location.reload()
    }

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    }
  }, [])

  return null
}
