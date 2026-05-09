'use client'
import { orders } from '@/lib/api/client'
import { useMutation, useQueryClient } from '@tanstack/react-query'

/**
 * Driver A rechaza explícitamente una solicitud RECIBIDA. El pedido NO
 * cambia de dueño. B recibe push para que busque otro pedido en Equipo.
 */
export function useRejectTransferRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (transferRequestId: string) => orders.rejectTransferRequest(transferRequestId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver', 'team', 'received-requests'] })
    },
  })
}
