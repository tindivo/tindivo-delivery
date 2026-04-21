'use client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { orders } from '@/lib/api/client'
import { supabase } from '@/lib/supabase/client'

/**
 * Detalle del pedido visto desde el restaurante.
 *
 * Refresca con realtime: suscribe a `orders` filtrado por `id` para
 * mostrar transiciones de estado en vivo (driver acepta, llega, entrega).
 */
export function useRestaurantOrderDetail(orderId: string) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['restaurant', 'order', orderId],
    queryFn: () => orders.getRestaurantOrder(orderId) as Promise<any>,
    refetchInterval: 30_000,
  })

  useEffect(() => {
    if (!orderId) return
    const channel = supabase
      .channel(`restaurant:order:${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ['restaurant', 'order', orderId] })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [orderId, qc])

  return query
}
