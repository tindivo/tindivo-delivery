'use client'
import { api } from '@/lib/api/client'
import { useCallback, useEffect, useState } from 'react'

type Status = 'unsupported' | 'default' | 'granted' | 'denied' | 'subscribed'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

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
 * - Detecta si el browser soporta (Notification + ServiceWorker + PushManager).
 * - Expone el estado actual del permiso.
 * - `subscribe()` dispara el prompt de permisos, registra con pushManager y
 *   envía el endpoint al backend (POST /api/v1/push/subscribe).
 * - `unsubscribe()` invierte el proceso.
 *
 * UX: tras subscribe/unsubscribe SIEMPRE se revalida el estado real contra
 * PushManager (fuente de verdad) — esto hace que el toggle reaccione al
 * instante sin necesidad de cambiar de pestaña. Además se escucha el evento
 * `visibilitychange` para re-sincronizar cuando el user vuelve a la tab
 * (puede haber cambiado permisos desde settings del browser).
 */
export function usePushSubscription() {
  const [status, setStatus] = useState<Status>('default')
  const [loading, setLoading] = useState(false)

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

    // granted → revisar si hay subscription activa
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      const next: Status = sub ? 'subscribed' : 'granted'
      setStatus(next)
      return next
    } catch {
      setStatus('granted')
      return 'granted'
    }
  }, [])

  useEffect(() => {
    checkStatus()

    const onVisibility = () => {
      if (document.visibilityState === 'visible') checkStatus()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
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
    if (!VAPID_PUBLIC_KEY) {
      console.error('[push] NEXT_PUBLIC_VAPID_PUBLIC_KEY no configurada')
      return false
    }
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      console.warn('[push] subscribe called without granted permission')
      await checkStatus()
      return false
    }
    setLoading(true)
    try {
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

      // Fuente de verdad = PushManager real (no optimistic)
      await checkStatus()
      return true
    } catch (err) {
      console.error('[push] subscribe failed', err)
      await checkStatus()
      return false
    } finally {
      setLoading(false)
    }
  }, [checkStatus])

  const unsubscribe = useCallback(async () => {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await api.post<void>('push/unsubscribe', { endpoint: sub.endpoint }).catch(() => null)
        await sub.unsubscribe()
      }
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

  return { status, loading, subscribe, unsubscribe, refresh: checkStatus }
}
