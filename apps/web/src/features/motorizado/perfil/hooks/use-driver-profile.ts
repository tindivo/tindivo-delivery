'use client'
import { driver } from '@/lib/api/client'
import { useQuery } from '@tanstack/react-query'

export function useDriverProfile() {
  return useQuery({
    queryKey: ['driver', 'profile'],
    queryFn: () => driver.getProfile(),
  })
}
