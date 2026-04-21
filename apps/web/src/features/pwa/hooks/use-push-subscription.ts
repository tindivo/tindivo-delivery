'use client'
import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api/client'

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
 */
export function usePushSubscription() {
  const [status, setStatus] = useState<Status>('default')
  const [loading, setLoading] = useState(false)

  const checkStatus = useCallback(async () => {
    if (typeof window === 'undefined') return
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported')
      return
    }

    if (Notification.permission === 'denied') {
      setStatus('denied')
      return
    }

    if (Notification.permission === 'default') {
      setStatus('default')
      return
    }

    // granted → revisar si hay subscription activa
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      setStatus(sub ? 'subscribed' : 'granted')
    } catch {
      setStatus('granted')
    }
  }, [])

  useEffect(() => {
    checkStatus()
  }, [checkStatus])

  const subscribe = useCallback(async () => {
    if (!VAPID_PUBLIC_KEY) {
      console.error('[push] NEXT_PUBLIC_VAPID_PUBLIC_KEY no configurada')
      return false
    }
    setLoading(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'default')
        return false
      }

      const reg = await navigator.serviceWorker.ready
      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
        })
      }

      const json = sub.toJSON()
      await api.post<void>('push/subscribe', {
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
        userAgent: navigator.userAgent,
      })

      setStatus('subscribed')
      return true
    } catch (err) {
      console.error('[push] subscribe failed', err)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const unsubscribe = useCallback(async () => {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await api.post<void>('push/unsubscribe', { endpoint: sub.endpoint }).catch(() => null)
        await sub.unsubscribe()
      }
      setStatus('granted')
    } catch (err) {
      console.error('[push] unsubscribe failed', err)
    } finally {
      setLoading(false)
    }
  }, [])

  return { status, loading, subscribe, unsubscribe, refresh: checkStatus }
}
