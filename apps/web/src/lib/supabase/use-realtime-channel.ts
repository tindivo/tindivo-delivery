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
type Listener = (payload: RealtimePayload) => void

type RegistryEntry = {
  channel: RealtimeChannel
  listeners: Map<symbol, Listener>
}

/**
 * Registry singleton de canales. Permite que múltiples componentes se
 * suscriban al mismo channel name sin chocar en supabase-js (que rechaza
 * `.on()` después de `.subscribe()`). El primero crea el canal físico;
 * subsiguientes solo agregan listeners al fan-out. Al desuscribirse el
 * último, se destruye el canal.
 */
const registry = new Map<string, RegistryEntry>()

function subscribeToChannel(
  channelName: string,
  changes: PostgresChangesConfig[],
  listener: Listener,
): () => void {
  let entry = registry.get(channelName)

  if (!entry) {
    // Nonce en el topic físico para evitar que Supabase/HMR reciclen un
    // channel ya subscribed (en cuyo caso `.on()` tiraría). El registry key
    // sigue siendo el lógico `channelName` para dedup entre hooks.
    const physicalTopic = `${channelName}#${Math.random().toString(36).slice(2, 10)}`
    const channel = supabase.channel(physicalTopic)
    entry = { channel, listeners: new Map() }

    try {
      for (const cfg of changes) {
        // biome-ignore lint/suspicious/noExplicitAny: supabase-js .on overload no inferable aquí
        const onMethod = channel.on as any
        onMethod.call(
          channel,
          'postgres_changes',
          { schema: 'public', ...cfg },
          (payload: RealtimePayload) => {
            entry?.listeners.forEach((l) => l(payload))
          },
        )
      }

      channel.subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[realtime]', channelName, status)
        }
      })

      registry.set(channelName, entry)
    } catch (err) {
      // Puede ocurrir en dev con HMR cuando supabase-js recicla channels
      // internamente. No crashea la app; el next render recrea el canal.
      console.warn('[realtime] channel init failed for', channelName, err)
      try {
        supabase.removeChannel(channel)
      } catch {
        /* noop */
      }
      // Devolver noop — el próximo render (post HMR) lo reintentará.
      return () => {
        /* noop */
      }
    }
  }

  const id = Symbol('listener')
  entry.listeners.set(id, listener)

  return () => {
    const current = registry.get(channelName)
    if (!current) return
    current.listeners.delete(id)
    if (current.listeners.size === 0) {
      supabase.removeChannel(current.channel)
      registry.delete(channelName)
    }
  }
}

type Options = {
  /**
   * Nombre único del canal. Múltiples hooks con el mismo nombre comparten un
   * canal físico (fan-out) — deben declarar los mismos `changes`.
   */
  channelName: string
  /** Configs de postgres_changes a registrar. */
  changes: PostgresChangesConfig[]
  /** Callback por evento. */
  onEvent: (payload: RealtimePayload) => void
  /**
   * Si `false`, no se monta. Útil cuando el nombre depende de un id async.
   */
  enabled?: boolean
}

/**
 * Wrapper de supabase realtime para PWAs con:
 *  - Registry singleton por channel name → múltiples hooks pueden co-existir.
 *  - Reconexión al volver del background en iOS PWA via `realtime.connect()`.
 *  - Propagación de JWT fresh via `realtime.setAuth()` en TOKEN_REFRESHED.
 *  - Callback por ref — actualizar `onEvent` no re-suscribe.
 */
export function useRealtimeChannel({
  channelName,
  changes,
  onEvent,
  enabled = true,
}: Options) {
  const callbackRef = useRef(onEvent)
  callbackRef.current = onEvent

  const changesKey = JSON.stringify(changes)

  useEffect(() => {
    if (!enabled) return

    const parsed: PostgresChangesConfig[] = JSON.parse(changesKey)
    const unsubscribe = subscribeToChannel(channelName, parsed, (payload) => {
      callbackRef.current(payload)
    })

    // iOS PWA: al volver del background, el WebSocket puede estar muerto.
    // `connect()` es idempotente; revive el transport y los channels
    // existentes auto-resubscriben.
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        try {
          supabase.realtime.connect()
        } catch {
          /* noop */
        }
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pageshow', onVisibility)

    const { data: authSub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.access_token && (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN')) {
        supabase.realtime.setAuth(session.access_token)
      }
    })

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pageshow', onVisibility)
      authSub.subscription.unsubscribe()
      unsubscribe()
    }
  }, [channelName, changesKey, enabled])
}
