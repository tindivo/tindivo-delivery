'use client'
import { admin } from '@/lib/api/client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { RestaurantPayments } from '@tindivo/contracts'

export function useAdminDebtSummary() {
  return useQuery({
    queryKey: ['admin', 'restaurant-payments', 'summary'],
    queryFn: () => admin.listDebtSummary(),
    refetchInterval: 30_000,
  })
}

export function useAdminPaymentsHistory(restaurantId?: string) {
  return useQuery({
    queryKey: ['admin', 'restaurant-payments', 'history', restaurantId ?? 'all'],
    queryFn: () => admin.listRestaurantPayments(restaurantId ? { restaurantId } : undefined),
  })
}

export function useRegisterPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: RestaurantPayments.CreateRestaurantPaymentRequest) =>
      admin.createRestaurantPayment(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'restaurant-payments'] })
      qc.invalidateQueries({ queryKey: ['admin', 'restaurants'] })
    },
  })
}
