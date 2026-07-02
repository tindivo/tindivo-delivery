'use client'
import { restaurant } from '@/lib/api/client'
import { useQuery } from '@tanstack/react-query'
import type { Restaurants } from '@tindivo/contracts'

export function useRestaurantFrequentCustomers(query: Restaurants.FrequentCustomersQuery) {
  return useQuery({
    queryKey: ['restaurant', 'frequent-customers', query],
    queryFn: () => restaurant.getFrequentCustomers(query),
  })
}
