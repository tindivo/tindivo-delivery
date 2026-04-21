'use client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { orders } from '@/lib/api/client'
import { supabase } from '@/lib/supabase/client'

export function useAdminActiveOrders() {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['admin', 'orders', 'active'],
    queryFn: async () => {
      const all = await orders.listAdminOrders()
      const active = (all.items ?? []).filter(
        (o: any) => o.status !== 'delivered' && o.status !== 'cancelled',
      )
      return { items: active }
    },
    refetchInterval: 15_000,
  })

  useEffect(() => {
    const sub = supabase
      .channel('admin:orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        qc.invalidateQueries({ queryKey: ['admin', 'orders'] })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(sub)
    }
  }, [qc])

  return query
}
