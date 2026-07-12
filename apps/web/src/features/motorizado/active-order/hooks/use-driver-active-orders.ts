'use client'
import { orders } from '@/lib/api/client'
import { supabase } from '@/lib/supabase/client'
import {
  useChannelHealth,
  useRealtimeChannel,
} from '@/lib/supabase/use-realtime-channel'
import { useQuery, useQueryClient } from '@tanstack/react-query'

function useCurrentUserId() {
  return useQuery({
    queryKey: ['me', 'user-id'],
    staleTime: Number.POSITIVE_INFINITY,
    queryFn: async () => {
      const { data } = await supabase.auth.getUser()
      return data.user?.id ?? null
    },
  })
}

/** Canal compartido para el driver activo. */
function driverChannelName(uid: string | null | undefined) {
  return `driver:events:${uid ?? 'pending'}`
}

/**
 * Hook de datos puro — solo lee `driver/orders`. Se puede llamar en múltiples
 * componentes sin conflicto (TanStack Query dedupe por queryKey).
 *
 * Polling adaptativo: lento cuando el WebSocket está sano, agresivo solo
 * cuando el canal Realtime está degradado.
 */
export function useDriverActiveOrders() {
  const { data: uid } = useCurrentUserId()
  const health = useChannelHealth(driverChannelName(uid), { enabled: Boolean(uid) })

  return useQuery({
    queryKey: ['driver', 'orders'],
    queryFn: () => orders.listDriverOrders(),
    refetchInterval: health === 'healthy' ? 120_000 : 30_000,
  })
}

/**
 * Sync de realtime para `driver:events:{uid}`. Debe montarse UNA SOLA VEZ en
 * el árbol (p.ej. HomeTabs) — si dos componentes lo montan simultáneamente
 * chocan en el mismo channel name y supabase-js rechaza el segundo `.on()`.
 *
 * También invalida el detalle individual (`['driver', 'orders', orderId]`)
 * para que la pantalla de pedido activo se actualice por push sin polling.
 */
export function useDriverActiveOrdersRealtime() {
  const qc = useQueryClient()
  const { data: uid } = useCurrentUserId()

  useRealtimeChannel({
    channelName: driverChannelName(uid),
    changes: [{ event: 'UPDATE', table: 'orders' }],
    onEvent: (payload) => {
      qc.invalidateQueries({ queryKey: ['driver', 'orders'] })
      // Invalidar también el detalle del pedido afectado para que
      // la pantalla activa se refresque por push (P0-2).
      const orderId = (payload as any)?.new?.id ?? (payload as any)?.old?.id
      if (orderId) {
        qc.invalidateQueries({ queryKey: ['driver', 'orders', orderId] })
      }
    },
    enabled: Boolean(uid),
  })
}
