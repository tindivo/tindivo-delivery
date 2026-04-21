'use client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { orders } from '@/lib/api/client'
import { supabase } from '@/lib/supabase/client'

export function useAdminOrderDetail(orderId: string) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['admin', 'orders', orderId],
    queryFn: () => orders.getAdminOrder(orderId) as Promise<any>,
    refetchInterval: 10_000,
  })

  useEffect(() => {
    const sub = supabase
      .channel(`admin:order:${orderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        () => qc.invalidateQueries({ queryKey: ['admin', 'orders', orderId] }),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(sub)
    }
  }, [orderId, qc])

  return query
}
