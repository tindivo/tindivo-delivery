'use client'
import { orders } from '@/lib/api/client'
import { useMutation, useQueryClient } from '@tanstack/react-query'

/**
 * Driver A acepta una solicitud RECIBIDA. Internamente reusa Order.reassignTo,
 * el pedido pasa a la mochila del solicitante. Las otras solicitudes pending
 * del mismo pedido se invalidan automáticamente.
 */
export function useAcceptTransferRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (transferRequestId: string) => orders.acceptTransferRequest(transferRequestId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver', 'team', 'received-requests'] })
      qc.invalidateQueries({ queryKey: ['driver', 'team', 'orders'] })
      qc.invalidateQueries({ queryKey: ['driver', 'orders'] })
    },
  })
}
