'use client'
import { useQuery } from '@tanstack/react-query'
import { restaurant } from '@/lib/api/client'

export function useRestaurantHistory(status?: 'delivered' | 'cancelled') {
  return useQuery({
    queryKey: ['restaurant', 'history', status ?? 'all'],
    queryFn: () =>
      restaurant.getHistory(status ? { status } : undefined) as Promise<{ items: any[] }>,
  })
}
