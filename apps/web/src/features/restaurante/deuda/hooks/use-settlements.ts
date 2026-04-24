'use client'
import { restaurant } from '@/lib/api/client'
import { useQuery } from '@tanstack/react-query'

export function useSettlements() {
  return useQuery({
    queryKey: ['restaurant', 'settlements'],
    queryFn: () => restaurant.getSettlements(),
  })
}
