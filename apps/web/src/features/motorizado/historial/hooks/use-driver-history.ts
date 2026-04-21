'use client'
import { useQuery } from '@tanstack/react-query'
import { driver } from '@/lib/api/client'

export function useDriverHistory() {
  return useQuery({
    queryKey: ['driver', 'history'],
    queryFn: () => driver.getHistory() as Promise<{ items: any[] }>,
  })
}
