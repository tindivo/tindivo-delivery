'use client'
import { orders } from '@/lib/api/client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Orders } from '@tindivo/contracts'

export function useMarkPickedUp(orderId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Orders.MarkPickedUpRequest) => orders.markPickedUp(orderId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['driver'] }),
  })
}
