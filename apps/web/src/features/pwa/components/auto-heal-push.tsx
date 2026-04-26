'use client'
import { supabase } from '@/lib/supabase/client'
import { useEffect } from 'react'
import { usePushSubscription } from '../hooks/use-push-subscription'

/**
 * Mantiene sana la suscripción push en cualquier ruta.
 *
 * El hook `usePushSubscription` ya tiene lógica de auto-heal: si detecta
 * `permission='granted'` + `getSubscription()===null` re-suscribe en silencio.
 * Hasta ahora el hook vivía solo en la tarjeta de Perfil, así que el auto-heal
 * no corría si el usuario nunca visitaba Perfil.
 *
 * Este componente lo monta globalmente (en el layout root) para que el
 * auto-heal ocurra en cualquier pantalla. Requiere sesión Supabase activa —
 * sin sesión el `POST /push/subscribe` devolvería 401, así que solo activamos
 * el hook cuando hay sesión.
 */
export function AutoHealPush() {
  const { refresh, forceRefresh } = usePushSubscription()

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      if (!data.session) return
      if (typeof Notification === 'undefined') return
      if (Notification.permission !== 'granted') return
      void refresh()
    })()

    // En SIGNED_IN forzamos validación de ownership ya: si A había
    // dejado una sub viva en este browser y ahora se logueó B, queremos
    // detectarlo inmediatamente y re-suscribir, no esperar al tick de
    // polling de 60s.
    const { data: authSub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) return
      if (typeof Notification === 'undefined') return
      if (Notification.permission !== 'granted') return
      if (event === 'SIGNED_IN') void forceRefresh()
      else void refresh()
    })

    return () => {
      cancelled = true
      authSub.subscription.unsubscribe()
    }
  }, [refresh, forceRefresh])

  return null
}
