'use client'
import { orders } from '@/lib/api/client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Orders } from '@tindivo/contracts'

export function useSaveCustomerData(orderId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Orders.SaveCustomerDataRequest) => orders.saveCustomerData(orderId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['driver'] }),
  })
}
