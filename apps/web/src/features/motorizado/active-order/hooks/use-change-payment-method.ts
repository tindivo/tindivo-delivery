'use client'
import { orders } from '@/lib/api/client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Orders } from '@tindivo/contracts'

/**
 * Hook para cambiar el método de pago de un pedido en status=picked_up.
 * Caso real: el cliente cambia de Yape a efectivo (o viceversa) en la
 * puerta antes de recibir el pedido. El driver acepta la decisión y la
 * registra desde aquí. Invalida el cache del pedido para que la UI
 * refleje el split nuevo (PaymentBreakdown + YapeQrCard).
 */
export function useChangePaymentMethod(orderId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Orders.ChangePaymentMethodRequest) =>
      orders.changePaymentMethod(orderId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver', 'orders'] })
      qc.invalidateQueries({ queryKey: ['driver', 'orders', orderId] })
    },
  })
}
