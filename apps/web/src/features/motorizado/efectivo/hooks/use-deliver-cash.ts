'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { driver } from '@/lib/api/client'

export function useDeliverCash() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ restaurantId, amount }: { restaurantId: string; amount: number }) =>
      driver.deliverCash(restaurantId, { amount }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver', 'cash-summary'] })
    },
  })
}
