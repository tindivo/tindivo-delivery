'use client'
import { useQuery } from '@tanstack/react-query'
import { orders } from '@/lib/api/client'

/**
 * Lee el pedido sin aceptarlo todavía — busca en la lista de `available`
 * que expone datos suficientes para mostrar el preview (short_id, restaurante,
 * monto, payment, ready_at).
 */
export function useOrderPreview(orderId: string) {
  return useQuery({
    queryKey: ['driver', 'preview', orderId],
    queryFn: async () => {
      // biome-ignore lint/suspicious/noExplicitAny: respuesta dinámica del API
      const list = (await orders.listAvailable()) as { items: any[] }
      // biome-ignore lint/suspicious/noExplicitAny: items con columnas dinámicas
      return list.items?.find((o: any) => o.id === orderId) ?? null
    },
    // No refetch agresivo — es info estática hasta que se acepte
    staleTime: 10_000,
  })
}
