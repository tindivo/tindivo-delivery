'use client'
import { driver } from '@/lib/api/client'
import { useQuery } from '@tanstack/react-query'

export function useDriverSupportPhone() {
  return useQuery({
    queryKey: ['driver', 'support-phone'],
    queryFn: () => driver.getSupportPhone(),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  })
}
