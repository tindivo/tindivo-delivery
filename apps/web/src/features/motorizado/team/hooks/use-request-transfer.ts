'use client'
import { orders } from '@/lib/api/client'
import { useIdempotencyKey } from '@/lib/idempotency/use-idempotency-key'
import { useMutation, useQueryClient } from '@tanstack/react-query'

/**
 * Mutation: Driver B solicita un pedido de Driver A. Crea entrada pending
 * con TTL 30s en order_transfer_requests. A recibe push + ve banner en Equipo.
 *
 * Idempotency-Key: defensa contra doble-click. El UNIQUE constraint en BD
 * (order_id, to_driver_id) WHERE status='pending' es la barrera real.
 */
export function useRequestTransfer() {
  const qc = useQueryClient()
  const idem = useIdempotencyKey('motorizado:request-transfer')

  return useMutation({
    mutationFn: (orderId: string) =>
      orders.requestOrderTransfer(orderId, { idempotencyKey: idem.key }),
    onSuccess: () => {
      idem.consume()
      qc.invalidateQueries({ queryKey: ['driver', 'team', 'orders'] })
    },
    onError: (e) => {
      const status = (e as { status?: number })?.status
      if (status !== undefined && status >= 400 && status < 500) idem.consume()
    },
  })
}
