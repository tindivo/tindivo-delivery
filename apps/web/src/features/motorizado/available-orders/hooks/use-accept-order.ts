'use client'
import { orders } from '@/lib/api/client'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useAcceptOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (orderId: string) => orders.acceptOrder(orderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver', 'available-orders'] })
      qc.invalidateQueries({ queryKey: ['driver', 'orders'] })
    },
  })
}
