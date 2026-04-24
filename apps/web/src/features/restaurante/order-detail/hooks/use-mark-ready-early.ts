'use client'
import { orders } from '@/lib/api/client'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useMarkReadyEarly(orderId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: () => orders.markReadyEarly(orderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['restaurant', 'order', orderId] })
    },
  })
}
