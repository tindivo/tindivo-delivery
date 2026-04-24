'use client'
import { restaurant } from '@/lib/api/client'
import { useQuery } from '@tanstack/react-query'

export function useRestaurantHistory(status?: 'delivered' | 'cancelled') {
  return useQuery({
    queryKey: ['restaurant', 'history', status ?? 'all'],
    queryFn: () =>
      // biome-ignore lint/suspicious/noExplicitAny: respuesta dinámica del API
      restaurant.getHistory(status ? { status } : undefined) as Promise<{ items: any[] }>,
  })
}
