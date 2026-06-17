'use client'
import { restaurant } from '@/lib/api/client'
import { useInfiniteQuery } from '@tanstack/react-query'

export type HistoryStatusFilter = 'delivered' | 'cancelled'

export type HistoryPage = {
  // biome-ignore lint/suspicious/noExplicitAny: filas snake_case dinámicas de Supabase
  items: any[]
  nextCursor: string | null
  summary: { deliveredCount: number; totalCommission: number }
}

/**
 * Historial paginado del restaurante por rango de fechas (días-Perú).
 * Keyset pagination vía `nextCursor`; el `summary` (entregados + comisión total
 * del periodo) viene en cada página — se usa el de la primera.
 */
export function useRestaurantHistory(
  range: { from: string; to: string },
  status?: HistoryStatusFilter,
) {
  return useInfiniteQuery({
    queryKey: ['restaurant', 'history', range.from, range.to, status ?? 'all'],
    queryFn: ({ pageParam }) =>
      restaurant.getHistory({
        from: range.from,
        to: range.to,
        status,
        cursor: pageParam,
      }) as Promise<HistoryPage>,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
}
