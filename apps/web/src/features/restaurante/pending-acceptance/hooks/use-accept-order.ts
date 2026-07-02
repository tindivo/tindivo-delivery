'use client'
import { restaurant } from '@/lib/api/client'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useAcceptOrderByRestaurant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { orderId: string; prepMinutes: number; readyEarly?: boolean }) =>
      restaurant.acceptOrderByRestaurant(input.orderId, {
        prepMinutes: input.prepMinutes,
        readyEarly: input.readyEarly,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['restaurant', 'pending-acceptance'] })
      qc.invalidateQueries({ queryKey: ['restaurant', 'orders'] })
    },
  })
}
