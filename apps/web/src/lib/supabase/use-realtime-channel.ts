'use client'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { useEffect, useRef, useState } from 'react'
import { supabase } from './client'

const RT_DEBUG = process.env.NEXT_PUBLIC_RT_DEBUG === 'true'
const rtLog = (...args: unknown[]) => {
  if (RT_DEBUG) console.log(...args)
}

type PostgresChangesEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*'

type PostgresChangesConfig = {
  event: PostgresChangesEvent
  schema?: string
  table: string
  filter?: string
}

type RealtimePayload = RealtimePostgresChangesPayload<Record<string, unknown>>
type Listener = (payload: RealtimePayload) => void

export type ChannelHealth = 'initializing' | 'healthy' | 'degraded'

type RegistryEntry = {
  channel: RealtimeChannel
  /** Configs originales para poder recrear el canal en recovery. */
  changes: PostgresChangesConfig[]
  listeners: Map<symbol, Listener>
  health: ChannelHealth
  healthListeners: Set<() => void>
  subscribeCallback: (status: string, err?: Error) => void
  /** Flag para evitar reintentos simultáneos sobre el mismo canal. */
  recovering: boolean
  /** Backoff progresivo para reintentos de recovery (ms). */
  retryDelayMs: number
}

const registry = new Map<string, RegistryEntry>()

function notifyHealthListeners(entry: RegistryEntry) {
  entry.healthListeners.forEach((fn) => fn())
}

// ─── Creación y recuperación de canales ──────────────────────────────

/**
 * Crea una instancia NUEVA de RealtimeChannel y registra los bindings
 * de postgres_changes + el callback de subscribe. No llama a .subscribe().
 *
 * Se usa tanto en el montaje inicial como en la recuperación de canales
 * muertos (donde la instancia vieja ya fue removida).
 */
function createChannelInstance(
  entry: Pick<RegistryEntry, 'changes'>,
  channelName: string,
): { channel: RealtimeChannel; subscribeCallback: (status: string, err?: Error) => void } {
  // Nonce en el topic físico para HMR (mismo patrón original)
  const physicalTopic = `${channelName}#${Math.random().toString(36).slice(2, 10)}`
  const channel = supabase.channel(physicalTopic)

  const subscribeCallback = (status: string, err?: Error) => {
    rtLog('[rt-status]', channelName, status, err ?? '')
    if (status === 'SUBSCRIBED') {
      const e = registry.get(channelName)
      if (e) {
        e.health = 'healthy'
        e.recovering = false
        e.retryDelayMs = 1000
        notifyHealthListeners(e)
      }
    } else if (
      status === 'CHANNEL_ERROR' ||
      status === 'TIMED_OUT' ||
      status === 'CLOSED'
    ) {
      const e = registry.get(channelName)
      if (e) {
        e.health = 'degraded'
        e.recovering = false
        notifyHealthListeners(e)
      }
      if (status !== 'CLOSED') {
        console.warn('[realtime]', channelName, status)
      }
    }
  }

  // Re-registrar todos los bindings de postgres_changes
  for (const cfg of entry.changes) {
    // biome-ignore lint/suspicious/noExplicitAny: supabase-js .on overload no inferable
    const onMethod = channel.on as any
    onMethod.call(
      channel,
      'postgres_changes',
      { schema: 'public', ...cfg },
      (payload: RealtimePayload) => {
        const e = registry.get(channelName)
        e?.listeners.forEach((l) => l(payload))
      },
    )
  }

  return { channel, subscribeCallback }
}

/**
 * Recrea un canal que está muerto (closed/errored).
 * - Remueve la instancia vieja de supabase
 * - Crea una instancia NUEVA (única forma de volver a hacer join)
 * - Re-registra todos los listeners
 * - Subscribe → el nuevo SUBSCRIBED devuelve health a 'healthy'
 */
function recoverChannel(channelName: string, entry: RegistryEntry) {
  if (entry.recovering) {
    rtLog('[rt-recover]', channelName, 'already recovering, skipping')
    return
  }

  rtLog('[rt-recover]', channelName, 'recreating channel')

  // Limpiar la instancia muerta
  try {
    supabase.removeChannel(entry.channel)
  } catch {
    /* noop */
  }

  // Crear instancia nueva con los mismos cambios
  const { channel, subscribeCallback } = createChannelInstance(entry, channelName)
  entry.channel = channel
  entry.subscribeCallback = subscribeCallback
  entry.recovering = true

  // Suscribir la nueva instancia
  channel.subscribe(subscribeCallback)
}

// ─── Visibility change global (un solo listener) ────────────────────

let visibilityHandlerInstalled = false

function installVisibilityHandler() {
  if (visibilityHandlerInstalled) return
  visibilityHandlerInstalled = true

  let wasHidden = false

  const onHide = () => {
    if (document.visibilityState === 'hidden') {
      wasHidden = true
      rtLog('[rt-visibility] page hidden')
    }
  }

  const onVisible = () => {
    if (document.visibilityState !== 'visible') return
    if (!wasHidden) {
      rtLog('[rt-visibility] initial visible, skipping')
      return
    }
    wasHidden = false

    rtLog('[rt-visibility] returning from background, checking channels')
    const socketConnected = supabase.realtime.isConnected()

    // Un solo realtime.connect() global
    if (!socketConnected) {
      try {
        supabase.realtime.connect()
        rtLog('[rt-visibility] realtime.connect() called')
      } catch {
        /* noop */
      }
    }

    // Evaluar cada canal
    for (const [name, entry] of registry) {
      const state = entry.channel.state
      rtLog('[rt-visibility]', name, 'state:', state, 'socketConnected:', socketConnected)

      if (state === 'joined' && socketConnected) {
        // Canal sano, socket vivo. No tocar.
        continue
      }

      // Canal roto o socket caído: recrear el canal
      recoverChannel(name, entry)
    }
  }

  document.addEventListener('visibilitychange', onHide)
  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('pageshow', onVisible)
}

// ─── Subscribe inicial ──────────────────────────────────────────────

function subscribeToChannel(
  channelName: string,
  changes: PostgresChangesConfig[],
  listener: Listener,
): () => void {
  let entry = registry.get(channelName)

  if (!entry) {
    const { channel, subscribeCallback } = createChannelInstance({ changes }, channelName)

    entry = {
      channel,
      changes,
      listeners: new Map(),
      health: 'initializing',
      healthListeners: new Set(),
      subscribeCallback,
      recovering: false,
      retryDelayMs: 1000,
    }

    try {
      channel.subscribe(subscribeCallback)

      // Instalar el handler global de visibility UNA sola vez
      installVisibilityHandler()

      registry.set(channelName, entry)
    } catch (err) {
      console.warn('[realtime] channel init failed for', channelName, err)
      try {
        supabase.removeChannel(channel)
      } catch {
        /* noop */
      }
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

// ─── Hooks públicos ─────────────────────────────────────────────────

type Options = {
  channelName: string
  changes: PostgresChangesConfig[]
  onEvent: (payload: RealtimePayload) => void
  enabled?: boolean
}

export function useRealtimeChannel({
  channelName,
  changes,
  onEvent,
  enabled = true,
}: Options): { health: ChannelHealth } {
  const callbackRef = useRef(onEvent)
  callbackRef.current = onEvent

  const changesKey = JSON.stringify(changes)
  const [health, setHealth] = useState<ChannelHealth>(() => {
    return registry.get(channelName)?.health ?? 'initializing'
  })

  useEffect(() => {
    if (!enabled) return
    const entry = registry.get(channelName)
    if (!entry) return

    const onHealthChange = () => setHealth(entry.health)
    entry.healthListeners.add(onHealthChange)
    setHealth(entry.health)

    return () => {
      entry.healthListeners.delete(onHealthChange)
    }
  }, [channelName, enabled])

  useEffect(() => {
    if (!enabled) return

    const parsed: PostgresChangesConfig[] = JSON.parse(changesKey)
    const unsubscribe = subscribeToChannel(channelName, parsed, (payload) => {
      callbackRef.current(payload)
    })

    const { data: authSub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.access_token && (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN')) {
        supabase.realtime.setAuth(session.access_token)
      }
    })

    return () => {
      authSub.subscription.unsubscribe()
      unsubscribe()
    }
  }, [channelName, changesKey, enabled])

  return { health }
}

export function useChannelHealth(
  channelName: string,
  opts?: { enabled?: boolean },
): ChannelHealth {
  const enabled = opts?.enabled ?? true

  const [health, setHealth] = useState<ChannelHealth>(() => {
    if (!enabled) return 'initializing'
    return registry.get(channelName)?.health ?? 'initializing'
  })

  useEffect(() => {
    if (!enabled) {
      setHealth('initializing')
      return
    }
    const entry = registry.get(channelName)
    if (!entry) {
      setHealth('initializing')
      return
    }

    const onHealthChange = () => setHealth(entry.health)
    entry.healthListeners.add(onHealthChange)
    setHealth(entry.health)

    return () => {
      entry.healthListeners.delete(onHealthChange)
    }
  }, [channelName, enabled])

  return health
}
