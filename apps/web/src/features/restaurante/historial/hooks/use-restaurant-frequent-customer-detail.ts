'use client'
import { restaurant } from '@/lib/api/client'
import { useQuery } from '@tanstack/react-query'
import type { Restaurants } from '@tindivo/contracts'

export function useRestaurantFrequentCustomerDetail(
  phone: string,
  query: Restaurants.FrequentCustomerDetailQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: ['restaurant', 'frequent-customers', phone, 'detail', query],
    queryFn: () => restaurant.getFrequentCustomerDetail(phone, query),
    enabled: enabled && !!phone,
  })
}
