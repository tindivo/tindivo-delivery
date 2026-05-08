'use client'
import { orders } from '@/lib/api/client'
import type { Orders } from '@tindivo/contracts'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useTransferOrder(orderId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Orders.TransferOrderRequest) => orders.transferOrder(orderId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver'] })
    },
  })
}
