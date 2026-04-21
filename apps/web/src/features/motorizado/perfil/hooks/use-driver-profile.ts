'use client'
import { useQuery } from '@tanstack/react-query'
import { driver } from '@/lib/api/client'

export function useDriverProfile() {
  return useQuery({
    queryKey: ['driver', 'profile'],
    queryFn: () => driver.getProfile(),
  })
}
