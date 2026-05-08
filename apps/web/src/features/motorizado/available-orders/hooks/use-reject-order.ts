'use client'
import { orders } from '@/lib/api/client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Orders } from '@tindivo/contracts'

export function useRejectOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason: Orders.RejectionReason }) =>
      orders.rejectAssignment(orderId, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver', 'available-orders'] })
      qc.invalidateQueries({ queryKey: ['driver', 'orders'] })
    },
  })
}
