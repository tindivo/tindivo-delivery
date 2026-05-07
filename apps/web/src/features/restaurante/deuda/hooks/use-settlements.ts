'use client'
import { restaurant } from '@/lib/api/client'
import { useQuery } from '@tanstack/react-query'

export function useMyPayments() {
  return useQuery({
    queryKey: ['restaurant', 'payments'],
    queryFn: () => restaurant.listMyPayments(),
    refetchInterval: 30_000,
  })
}
