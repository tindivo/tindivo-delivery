'use client'
import { orders } from '@/lib/api/client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Orders } from '@tindivo/contracts'

/**
 * Mutation de crear pedido manual desde el back-office del restaurante.
 *
 * Idempotencia (patrón Stripe): el caller pasa una `idempotencyKey` (UUID v4
 * generado por `useIdempotencyKey('new-order')`). El servidor cachea la
 * respuesta por 24h. Reintentos por timeout o doble click reciben la misma
 * respuesta sin volver a crear el pedido — fin del bug de duplicados.
 */
export function useCreateOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { body: Orders.CreateOrderRequest; idempotencyKey?: string }) =>
      orders.createOrder(input.body, { idempotencyKey: input.idempotencyKey }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['restaurant', 'orders'] }),
  })
}
