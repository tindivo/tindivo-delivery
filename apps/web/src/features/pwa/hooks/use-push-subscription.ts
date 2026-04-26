'use client'
import { api } from '@/lib/api/client'
import { supabase } from '@/lib/supabase/client'
import { useCallback, useEffect, useRef, useState } from 'react'

type Status = 'unsupported' | 'default' | 'granted' | 'denied' | 'subscribed'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''
const AUTO_HEAL_MIN_INTERVAL_MS = 60_000

/**
 * Indica si hay sesión Supabase activa. Lo usamos como guard antes de cualquier
 * fetch al backend protegido por requireAuth — sin sesión esos endpoints
 * devuelven 401 (o HTML de Vercel/CORS en edge cases) y ensucian la consola
 * con `Unexpected token '<'` cuando el ApiClient intenta parsear la response.
 *
 * `getSession()` resuelve desde memoria/cookies sin hit de red, así que el
 * costo de invocarlo en cada checkStatus es despreciable.
 */
async function hasActiveSession(): Promise<boolean> {
  const { data } = await supabase.auth.getSession()
  return !!data.session
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i)
  return output
}

/**
 * Hook para gestionar la suscripción a Web Push Notifications.
 *
 * Fuente de verdad: `pushManager.getSubscription()`. Tras cualquier operación
 * se revalida contra PushManager para que el toggle refleje el estado real.
 *
 * Auto-heal silencioso: si el navegador rota el endpoint (pushsubscriptionchange)
 * o revoca la suscripción, `checkStatus` detecta `permission=granted` pero
 * `sub=null` y re-suscribe sin pedir permiso (ya está granted). Esto evita
 * que el toggle se vea "desactivado" cuando en realidad el usuario sí tiene
 * permiso concedido.
 *
 * Re-sync:
 *  - `visibilitychange` (user vuelve a la tab).
 *  - Polling cada 60s (detecta rotación mientras la app está abierta).
 *  - `message` del SW con `type: 'push-subscription-changed'` (reactivo).
 */
export function usePushSubscription() {
  const [status, setStatus] = useState<Status>('default')
  const [loading, setLoading] = useState(false)
  const lastAutoHealAtRef = useRef<number>(0)
  const autoHealInFlightRef = useRef<boolean>(false)

  const subscribeInternal = useCallback(async (): Promise<boolean> => {
    if (!VAPID_PUBLIC_KEY) {
      console.error('[push] NEXT_PUBLIC_VAPID_PUBLIC_KEY no configurada')
      return false
    }
    // Guard de sesión: el endpoint requiere Bearer token. Sin sesión activa
    // la request va sin Authorization y termina en 401, que el ApiClient
    // tropieza al intentar parsear si el body no es JSON válido.
    if (!(await hasActiveSession())) return false

    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      })
    }

    const json = sub.toJSON()
    if (!json.keys?.p256dh || !json.keys?.auth) {
      throw new Error('PushSubscription incompleto (faltan keys)')
    }
    await api.post<void>('push/subscribe', {
      endpoint: sub.endpoint,
      keys: {
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      },
      userAgent: navigator.userAgent.slice(0, 300),
    })
    return true
  }, [])

  const tryAutoHeal = useCallback(async (): Promise<void> => {
    // Debounce: máximo 1 intento por minuto. Evita loops si subscribe falla.
    const now = Date.now()
    if (autoHealInFlightRef.current) return
    if (now - lastAutoHealAtRef.current < AUTO_HEAL_MIN_INTERVAL_MS) return
    autoHealInFlightRef.current = true
    lastAutoHealAtRef.current = now
    try {
      await subscribeInternal()
    } catch (err) {
      console.warn('[push] auto-heal failed, retrying next cycle', err)
    } finally {
      autoHealInFlightRef.current = false
    }
  }, [subscribeInternal])

  const checkStatus = useCallback(async (): Promise<Status> => {
    if (typeof window === 'undefined') return 'default'
    if (
      !('Notification' in window) ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    ) {
      setStatus('unsupported')
      return 'unsupported'
    }

    if (Notification.permission === 'denied') {
      setStatus('denied')
      return 'denied'
    }

    if (Notification.permission === 'default') {
      setStatus('default')
      return 'default'
    }

    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        // Validar ownership: el SW puede devolver un endpoint válido pero
        // asociado en BD a OTRO user (caso B inicia sesión en device de A
        // sin pasar por fullSignOut). En ese caso re-suscribimos con el
        // user actual antes de declarar 'subscribed'.
        if (await hasActiveSession()) {
          const owned = await api
            .get<{ owned: boolean }>(`push/me?endpoint=${encodeURIComponent(sub.endpoint)}`)
            .catch(() => ({ owned: true }))
          if (!owned.owned) {
            await sub.unsubscribe().catch(() => null)
            lastAutoHealAtRef.current = 0
            void tryAutoHeal().then(() => {
              void (async () => {
                const regAfter = await navigator.serviceWorker.ready
                const subAfter = await regAfter.pushManager.getSubscription()
                if (subAfter) setStatus('subscribed')
              })()
            })
            setStatus('granted')
            return 'granted'
          }
        }
        setStatus('subscribed')
        return 'subscribed'
      }
      // Permiso granted + sub=null → browser rotó el endpoint. Auto-heal
      // silencioso porque no necesitamos pedir permiso (ya está granted).
      // Pero solo si hay sesión: sin auth el POST a /push/subscribe es
      // rechazado y ensucia la consola con SyntaxError al parsear la response.
      setStatus('granted')
      if (!(await hasActiveSession())) return 'granted'
      void tryAutoHeal().then(() => {
        void (async () => {
          const regAfter = await navigator.serviceWorker.ready
          const subAfter = await regAfter.pushManager.getSubscription()
          if (subAfter) setStatus('subscribed')
        })()
      })
      return 'granted'
    } catch {
      setStatus('granted')
      return 'granted'
    }
  }, [tryAutoHeal])

  /**
   * Variante de checkStatus que bypassea el debounce de auto-heal. La
   * usa AutoHealPush en el evento `SIGNED_IN` para que el cambio de
   * cuenta dispare validación de ownership inmediata sin esperar el
   * tick de polling.
   */
  const forceRefresh = useCallback(async () => {
    lastAutoHealAtRef.current = 0
    return checkStatus()
  }, [checkStatus])

  useEffect(() => {
    void checkStatus()

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void checkStatus()
    }
    document.addEventListener('visibilitychange', onVisibility)

    const onSwMessage = (ev: MessageEvent) => {
      if (ev.data?.type === 'push-subscription-changed') {
        lastAutoHealAtRef.current = 0 // forzar auto-heal aunque esté en debounce
        void checkStatus()
      }
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', onSwMessage)
    }

    const interval = window.setInterval(() => {
      void checkStatus()
    }, AUTO_HEAL_MIN_INTERVAL_MS)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', onSwMessage)
      }
      window.clearInterval(interval)
    }
  }, [checkStatus])

  /**
   * Registra PushManager y postea el endpoint al backend.
   *
   * ASUME que el permiso ya es `granted`. El caller (PushToggleCard) debe
   * llamar `Notification.requestPermission()` directamente en el user-gesture
   * handler antes de invocar este método, porque iOS Safari rompe el contexto
   * de gesto si hay setState/render intermedios.
   */
  const subscribe = useCallback(async () => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      console.warn('[push] subscribe called without granted permission')
      await checkStatus()
      return false
    }
    setLoading(true)
    try {
      await subscribeInternal()
      await checkStatus()
      return true
    } catch (err) {
      console.error('[push] subscribe failed', err)
      await checkStatus()
      return false
    } finally {
      setLoading(false)
    }
  }, [checkStatus, subscribeInternal])

  const unsubscribe = useCallback(async () => {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await api.post<void>('push/unsubscribe', { endpoint: sub.endpoint }).catch(() => null)
        await sub.unsubscribe()
      }
      // Evitar que el polling re-suscriba inmediatamente.
      lastAutoHealAtRef.current = Date.now()
      await checkStatus()
      return true
    } catch (err) {
      console.error('[push] unsubscribe failed', err)
      await checkStatus()
      return false
    } finally {
      setLoading(false)
    }
  }, [checkStatus])

  return { status, loading, subscribe, unsubscribe, refresh: checkStatus, forceRefresh }
}
