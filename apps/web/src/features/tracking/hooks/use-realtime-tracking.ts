'use client'
import { supabase } from '@/lib/supabase/client'
import { useRealtimeChannel } from '@/lib/supabase/use-realtime-channel'
import type { Tracking } from '@tindivo/contracts'
import { useCallback } from 'react'

type Setter = (value: Tracking.TrackingResponse) => void

/**
 * Se suscribe al canal tracking:{shortId} y refetchea get_tracking
 * cada vez que hay un cambio en la fila de la orden.
 */
export function useRealtimeTracking(shortId: string, setTracking: Setter) {
  const onEvent = useCallback(async () => {
    const { data } = await supabase.rpc('get_tracking', { p_short_id: shortId })
    if (data) setTracking(data as unknown as Tracking.TrackingResponse)
  }, [shortId, setTracking])

  useRealtimeChannel({
    channelName: `tracking:${shortId}`,
    changes: [{ event: 'UPDATE', table: 'orders', filter: `short_id=eq.${shortId}` }],
    onEvent,
    enabled: Boolean(shortId),
  })
}
