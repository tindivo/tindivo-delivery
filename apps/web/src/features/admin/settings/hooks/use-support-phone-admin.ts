'use client'
import { admin } from '@/lib/api/client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const QK = ['admin', 'settings', 'support-phone'] as const

export function useSupportPhoneAdmin() {
  return useQuery({
    queryKey: QK,
    queryFn: () => admin.getSupportPhone(),
  })
}

export function useUpdateSupportPhone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (phone: string) => admin.updateSupportPhone(phone),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}
