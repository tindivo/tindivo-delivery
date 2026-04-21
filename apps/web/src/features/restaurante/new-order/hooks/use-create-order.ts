'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Orders } from '@tindivo/contracts'
import { orders } from '@/lib/api/client'

export function useCreateOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Orders.CreateOrderRequest) => orders.createOrder(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['restaurant', 'orders'] }),
  })
}
