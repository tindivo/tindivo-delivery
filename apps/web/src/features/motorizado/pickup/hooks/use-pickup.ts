'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Orders } from '@tindivo/contracts'
import { orders } from '@/lib/api/client'

export function usePickup(orderId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Orders.MarkPickedUpRequest) => orders.markPickedUp(orderId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['driver'] }),
  })
}
