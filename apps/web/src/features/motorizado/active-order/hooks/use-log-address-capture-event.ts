'use client'
import { orders } from '@/lib/api/client'
import { useMutation } from '@tanstack/react-query'
import type { Orders } from '@tindivo/contracts'

export function useLogAddressCaptureEvent(orderId: string) {
  return useMutation({
    mutationFn: (body: Orders.LogAddressCaptureEventRequest) =>
      orders.logAddressCaptureEvent(orderId, body),
  })
}
