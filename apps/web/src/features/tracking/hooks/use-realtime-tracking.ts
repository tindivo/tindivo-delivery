'use client'
import { createBrowserClient } from '@tindivo/supabase'
import type { Tracking } from '@tindivo/contracts'
import { useEffect } from 'react'

type Setter = (value: Tracking.TrackingResponse) => void

/**
 * Se suscribe al canal tracking:{shortId} y refetchea get_tracking
 * cada vez que hay un cambio en la fila de la orden.
 */
export function useRealtimeTracking(shortId: string, setTracking: Setter) {
  useEffect(() => {
    const sb = createBrowserClient()

    async function refetch() {
      const { data } = await sb.rpc('get_tracking', { p_short_id: shortId })
      if (data) setTracking(data as unknown as Tracking.TrackingResponse)
    }

    const channel = sb
      .channel(`tracking:${shortId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `short_id=eq.${shortId}` },
        () => {
          refetch()
        },
      )
      .subscribe()

    return () => {
      sb.removeChannel(channel)
    }
  }, [shortId, setTracking])
}
