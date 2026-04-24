'use client'
import { restaurant } from '@/lib/api/client'
import { useQuery } from '@tanstack/react-query'

export function useRestaurantProfile() {
  return useQuery({
    queryKey: ['restaurant', 'profile'],
    queryFn: () => restaurant.getProfile(),
  })
}
