'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { orders } from '@/lib/api/client'

export function useMarkReadyEarly(orderId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: () => orders.markReadyEarly(orderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['restaurant', 'order', orderId] })
    },
  })
}
