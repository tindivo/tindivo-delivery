'use client'
import { orders } from '@/lib/api/client'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useMarkPickedUp(orderId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (occupancySlots: number) => orders.markPickedUp(orderId, { occupancySlots }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['driver'] }),
  })
}
