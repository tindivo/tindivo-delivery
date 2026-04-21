'use client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { orders } from '@/lib/api/client'
import { supabase } from '@/lib/supabase/client'

export function useAvailableOrders() {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['driver', 'available-orders'],
    queryFn: () => orders.listAvailable(),
    refetchInterval: 30_000,
  })

  useEffect(() => {
    const channel = supabase
      .channel('driver:available-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: 'status=eq.waiting_driver' },
        () => {
          qc.invalidateQueries({ queryKey: ['driver', 'available-orders'] })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [qc])

  return query
}
