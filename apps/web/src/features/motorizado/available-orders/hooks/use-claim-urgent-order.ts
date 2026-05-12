'use client'
import { orders } from '@/lib/api/client'
import { useIdempotencyKey } from '@/lib/idempotency/use-idempotency-key'
import { useMutation, useQueryClient } from '@tanstack/react-query'

/**
 * Mutation para tomar manualmente un pedido de la cola "Urgente".
 *
 * Llama a `POST /api/v1/driver/orders/:id/claim` (FCFS sin reglas R1-R5).
 * Si dos drivers tap-ean simultáneamente, el endpoint resuelve la race con
 * UPDATE atómico — el segundo recibe 409 ORDER_ALREADY_ACCEPTED.
 *
 * Usa `Idempotency-Key` para evitar dobles requests en el frontend (doble
 * click rápido o reintento por timeout). El servidor cachea la respuesta
 * por 24h y devuelve la misma para retries con la misma key.
 */
export function useClaimUrgentOrder() {
  const qc = useQueryClient()
  const idem = useIdempotencyKey('motorizado:claim-urgent')
  return useMutation({
    mutationFn: (orderId: string) => orders.claimUrgent(orderId, { idempotencyKey: idem.key }),
    onSuccess: () => {
      idem.consume()
      qc.invalidateQueries({ queryKey: ['driver', 'available-orders'] })
      qc.invalidateQueries({ queryKey: ['driver', 'orders'] })
    },
    onError: (e) => {
      // 4xx: respuesta final (incluye 409 race perdida) — generar nueva key
      // para próximo intento. 5xx: NO consumir, retry seguro con misma key.
      const status = (e as { status?: number })?.status
      if (status !== undefined && status >= 400 && status < 500) idem.consume()
    },
  })
}
