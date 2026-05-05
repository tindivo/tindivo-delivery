'use client'
import { useEffect } from 'react'

declare global {
  interface Window {
    serwist?: {
      register: () => Promise<ServiceWorkerRegistration | undefined>
    }
  }
}

const SW_RELOAD_GUARD_KEY = 'tindivo-customer-sw-reloaded'

/**
 * Registra el Service Worker de Serwist en el cliente.
 *
 * `@serwist/next` compila `public/sw.js` pero **no lo registra automáticamente**
 * — expone `window.serwist.register()`. Sin este registro, Chrome no considera
 * instalable la PWA y no muestra el banner "Instalar app" ni dispara el
 * evento `beforeinstallprompt`.
 *
 * Auto-reload tras update: cuando un nuevo SW toma control via `clientsClaim`,
 * las pestañas siguen ejecutando el JS viejo en memoria. Forzamos un reload
 * único (con guard sessionStorage anti-loop) para que el bundle nuevo entre
 * inmediatamente.
 *
 * Nota: el storage key tiene prefijo `tindivo-customer-` para no chocar con
 * apps/web si en algún testing local se accede a ambos en el mismo origen.
 */
export function RegisterPWA() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    if (window.serwist !== undefined) {
      window.serwist.register().catch((err) => {
        console.error('[pwa] serwist.register failed, falling back', err)
        navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((e) => {
          console.error('[pwa] manual register failed', e)
        })
      })
      return
    }

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch((err) => console.error('[pwa] manual register failed', err))
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    const onControllerChange = () => {
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
