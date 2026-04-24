'use client'
import { orders } from '@/lib/api/client'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useMarkArrived(orderId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => orders.markArrived(orderId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['driver'] }),
  })
}
