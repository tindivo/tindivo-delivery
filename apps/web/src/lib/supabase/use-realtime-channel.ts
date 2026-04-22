'use client'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { useEffect, useRef } from 'react'
import { supabase } from './client'

type PostgresChangesEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*'

type PostgresChangesConfig = {
  event: PostgresChangesEvent
  schema?: string
  table: string
  filter?: string
}

type RealtimePayload = RealtimePostgresChangesPayload<Record<string, unknown>>

type Options = {
  /**
   * Nombre único del canal. Incluir algún identificador relevante (user id,
   * entity id) para evitar colisiones entre componentes que subscriben a la
   * misma tabla.
   */
  channelName: string
  /**
   * Configs de postgres_changes a registrar en el canal. Se permiten múltiples
   * en un solo canal (p.ej. escuchar orders + driver_availability juntos).
   */
  changes: PostgresChangesConfig[]
  /** Callback por evento. */
  onEvent: (payload: RealtimePayload) => void
  /**
   * Si `false`, el canal no se monta. Útil cuando depende de un id async
   * (p.ej. `restaurant_id` que se resuelve con un query).
   */
  enabled?: boolean
}

/**
 * Wrapper sobre `supabase.channel(...)` con manejo correcto del ciclo de vida
 * en PWAs (especialmente iOS).
 *
 * Garantiza:
 *  - Suscripción síncrona al montar (sin `.then()` en useEffect → sin race
 *    conditions de cleanup).
 *  - Re-subscribe al volver del background en iOS PWA (`visibilitychange`).
 *    iOS suspende agresivamente el JS y el WebSocket de Supabase Realtime
 *    muere. Sin este reconnect, los eventos se pierden hasta el próximo
 *    refresh.
 *  - Re-subscribe + `realtime.setAuth()` cuando Supabase refresca el JWT
 *    (`TOKEN_REFRESHED`). Sin esto, las RLS policies empiezan a filtrar los
 *    eventos porque el canal sigue usando el token viejo.
 *  - Cleanup correcto con `removeChannel`.
 *  - Callback guardado en ref: actualizar `onEvent` no re-crea el canal.
 */
export function useRealtimeChannel({
  channelName,
  changes,
  onEvent,
  enabled = true,
}: Options) {
  const callbackRef = useRef(onEvent)
  callbackRef.current = onEvent

  // Serializamos `changes` para que el effect sea estable frente a nuevos
  // arrays con el mismo contenido.
  const changesKey = JSON.stringify(changes)

  useEffect(() => {
    if (!enabled) return

    let channel: RealtimeChannel | null = null
    let cancelled = false

    const subscribe = () => {
      if (cancelled) return
      if (channel) {
        supabase.removeChannel(channel)
        channel = null
      }

      const parsedChanges: PostgresChangesConfig[] = JSON.parse(changesKey)
      channel = supabase.channel(channelName)

      for (const cfg of parsedChanges) {
        // supabase-js no narrowea el overload de `.on()` al pasar cfg como
        // spread, así que forzamos el tipo. El payload sí conserva tipado.
        // biome-ignore lint/suspicious/noExplicitAny: supabase-js .on overload no inferable aquí
        const onMethod = channel.on as any
        onMethod.call(
          channel,
          'postgres_changes',
          { schema: 'public', ...cfg },
          (payload: RealtimePayload) => callbackRef.current(payload),
        )
      }

      channel.subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[realtime]', channelName, status)
        }
      })
    }

    subscribe()

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        // iOS PWA: al volver del background, el WebSocket puede estar muerto.
        // Forzar reconexión antes de re-subscribir.
        try {
          supabase.realtime.connect()
        } catch {
          /* no-op: ya conectado o no disponible */
        }
        subscribe()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    // `pageshow` es más fiable que visibilitychange cuando iOS restaura
    // desde bfcache.
    window.addEventListener('pageshow', onVisibility)

    const { data: authSub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED' && session?.access_token) {
        supabase.realtime.setAuth(session.access_token)
      }
      if (event === 'SIGNED_IN') {
        if (session?.access_token) supabase.realtime.setAuth(session.access_token)
        subscribe()
      }
    })

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pageshow', onVisibility)
      authSub.subscription.unsubscribe()
      if (channel) supabase.removeChannel(channel)
    }
  }, [channelName, changesKey, enabled])
}
