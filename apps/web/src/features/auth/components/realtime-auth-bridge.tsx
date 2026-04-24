'use client'
import { supabase } from '@/lib/supabase/client'
import { useEffect } from 'react'

/**
 * Sincroniza el JWT del usuario con el cliente de Supabase Realtime.
 *
 * El Realtime client usa por defecto el token con el que se inicializó. Cuando
 * el usuario hace login o Supabase refresca el access token (cada ~1h), el
 * canal WebSocket sigue usando el token viejo y las RLS policies empiezan a
 * filtrar los eventos silenciosamente. Esto hace parecer que "realtime no
 * funciona" cuando en realidad el WS está vivo pero autenticado como caducado.
 *
 * Montar una sola vez en el árbol (en providers), no renderiza nada.
 */
export function RealtimeAuthBridge() {
  useEffect(() => {
    let cancelled = false

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      if (data.session?.access_token) {
        supabase.realtime.setAuth(data.session.access_token)
      }
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token)
      }
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  return null
}
