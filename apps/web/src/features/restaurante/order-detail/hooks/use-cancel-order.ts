'use client'
import { orders } from '@/lib/api/client'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useCancelRestaurantOrder(orderId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (reason: string) => orders.cancelByRestaurant(orderId, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['restaurant', 'order', orderId] })
      qc.invalidateQueries({ queryKey: ['restaurant', 'orders'] })
    },
  })
}
