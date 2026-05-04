'use client'
import { orders } from '@/lib/api/client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Orders } from '@tindivo/contracts'

export function useEditRestaurantOrder(orderId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (body: Orders.EditOrderByRestaurantRequest) =>
      orders.editRestaurantOrder(orderId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['restaurant', 'order', orderId] })
      qc.invalidateQueries({ queryKey: ['restaurant', 'orders'] })
      // Si el driver tiene este pedido cargado, su lista también debe refrescar.
      qc.invalidateQueries({ queryKey: ['driver'] })
    },
  })
}
