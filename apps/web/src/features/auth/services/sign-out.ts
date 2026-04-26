'use client'
import { api } from '@/lib/api/client'
import { signOutLocal } from '@tindivo/supabase'

/**
 * Logout completo desde la UI: limpia push subscription antes de cerrar sesión.
 *
 * Orden importa: el `DELETE /push/unsubscribe` requiere JWT vivo, así que va
 * ANTES del signOut. Si lo invocáramos después, el endpoint rechazaría con 401
 * y la fila quedaría huérfana en `push_subscriptions` — el usuario seguiría
 * recibiendo notificaciones de un dispositivo donde ya cerró sesión.
 *
 * Errores en el cleanup son no-bloqueantes: el logout del usuario es
 * prioritario sobre la higiene de la suscripción.
 */
export async function fullSignOut(): Promise<void> {
  try {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await api
          .request<void>('push/unsubscribe', {
            method: 'DELETE',
            body: { endpoint: sub.endpoint },
          })
          .catch(() => null)
        await sub.unsubscribe().catch(() => null)
      }
    }
  } catch {
    /* logout es prioritario sobre el cleanup */
  }
  await signOutLocal()
}
