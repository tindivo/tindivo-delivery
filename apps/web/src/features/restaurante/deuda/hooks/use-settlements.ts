'use client'
import { useQuery } from '@tanstack/react-query'
import { restaurant } from '@/lib/api/client'

export function useSettlements() {
  return useQuery({
    queryKey: ['restaurant', 'settlements'],
    queryFn: () => restaurant.getSettlements(),
  })
}
