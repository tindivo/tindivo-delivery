'use client'
import { admin } from '@/lib/api/client'
import { useQuery } from '@tanstack/react-query'

/**
 * KPIs operativos del día (TZ Lima por default).
 * Refresca cada 60s para mantener el dashboard vivo sin saturar al backend.
 */
export function useAdminMetrics() {
  return useQuery({
    queryKey: ['admin', 'metrics'],
    queryFn: () => admin.getMetrics(),
    refetchInterval: 60_000,
  })
}
