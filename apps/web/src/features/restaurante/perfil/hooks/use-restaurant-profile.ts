'use client'
import { useQuery } from '@tanstack/react-query'
import { restaurant } from '@/lib/api/client'

export function useRestaurantProfile() {
  return useQuery({
    queryKey: ['restaurant', 'profile'],
    queryFn: () => restaurant.getProfile(),
  })
}
