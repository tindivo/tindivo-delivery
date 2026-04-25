'use client'
import { orders } from '@/lib/api/client'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useMarkReceived(orderId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => orders.markReceived(orderId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['driver'] }),
  })
}
