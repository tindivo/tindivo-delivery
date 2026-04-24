'use client'
import { driver } from '@/lib/api/client'
import { useQuery } from '@tanstack/react-query'

export function useDriverHistory() {
  return useQuery({
    queryKey: ['driver', 'history'],
    // biome-ignore lint/suspicious/noExplicitAny: respuesta dinámica del API
    queryFn: () => driver.getHistory() as Promise<{ items: any[] }>,
  })
}
