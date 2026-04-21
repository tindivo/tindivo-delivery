'use client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { orders } from '@/lib/api/client'
import { supabase } from '@/lib/supabase/client'

export function useDriverActiveOrders() {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['driver', 'orders'],
    queryFn: () => orders.listDriverOrders(),
    refetchInterval: 60_000,
  })

  useEffect(() => {
    const { data } = supabase.auth.getSession() as never
    let sub: ReturnType<typeof supabase.channel> | null = null
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id
      if (!uid) return
      sub = supabase
        .channel(`driver:events:${uid}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'orders' },
          () => qc.invalidateQueries({ queryKey: ['driver', 'orders'] }),
        )
        .subscribe()
    })
    return () => {
      if (sub) supabase.removeChannel(sub)
    }
  }, [qc])

  return query
}
