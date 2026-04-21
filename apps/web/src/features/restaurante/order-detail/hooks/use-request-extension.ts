'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { orders } from '@/lib/api/client'

export function useRequestExtension(orderId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (additionalMinutes: 5 | 10) =>
      orders.requestExtension(orderId, { additionalMinutes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['restaurant', 'order', orderId] })
    },
  })
}
