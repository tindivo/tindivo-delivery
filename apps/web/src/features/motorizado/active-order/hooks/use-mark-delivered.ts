'use client'
import { orders } from '@/lib/api/client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'

export function useMarkDelivered(orderId: string) {
  const qc = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: () => orders.markDelivered(orderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver'] })
      router.push('/motorizado')
    },
  })
}
