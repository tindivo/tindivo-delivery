'use client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { driver } from '@/lib/api/client'
import { supabase } from '@/lib/supabase/client'

export function useCashSummary(driverId: string | null | undefined) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['driver', 'cash-summary'],
    queryFn: () => driver.getCashSummary(),
  })

  useEffect(() => {
    if (!driverId) return
    const channel = supabase
      .channel(`driver:${driverId}:cash-settlements`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cash_settlements',
          filter: `driver_id=eq.${driverId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ['driver', 'cash-summary'] })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [driverId, qc])

  return query
}
