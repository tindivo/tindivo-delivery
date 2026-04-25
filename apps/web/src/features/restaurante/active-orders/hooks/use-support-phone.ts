'use client'
import { restaurant } from '@/lib/api/client'
import { useQuery } from '@tanstack/react-query'

/**
 * Lee el número de soporte Tindivo configurado por el admin. Cache 5 min:
 * cambios desde el dashboard se propagan rápido sin saturar el endpoint.
 */
export function useSupportPhone() {
  return useQuery({
    queryKey: ['restaurant', 'support-phone'],
    queryFn: () => restaurant.getSupportPhone(),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  })
}
