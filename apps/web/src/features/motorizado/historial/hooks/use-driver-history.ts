'use client'
import { useQuery } from '@tanstack/react-query'
import { driver } from '@/lib/api/client'

export function useDriverHistory() {
  return useQuery({
    queryKey: ['driver', 'history'],
    // biome-ignore lint/suspicious/noExplicitAny: respuesta dinámica del API
    queryFn: () => driver.getHistory() as Promise<{ items: any[] }>,
  })
}
