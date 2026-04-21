'use client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { orders } from '@/lib/api/client'
import { supabase } from '@/lib/supabase/client'

export function useRestaurantOrders() {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['restaurant', 'orders'],
    queryFn: () => orders.listRestaurantOrders(),
    refetchInterval: 30_000,
  })

  useEffect(() => {
    let sub: ReturnType<typeof supabase.channel> | null = null
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      const { data: r } = await supabase
        .from('restaurants')
        .select('id')
        .eq('user_id', data.user.id)
        .maybeSingle()
      if (!r) return
      sub = supabase
        .channel(`restaurant:${r.id}:orders`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${r.id}` },
          () => qc.invalidateQueries({ queryKey: ['restaurant', 'orders'] }),
        )
        .subscribe()
    })
    return () => {
      if (sub) supabase.removeChannel(sub)
    }
  }, [qc])

  return query
}
