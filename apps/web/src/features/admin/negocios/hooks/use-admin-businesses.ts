'use client'
import { admin } from '@/lib/api/client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Business } from '@tindivo/contracts'

export function useAdminBusinesses() {
  return useQuery({
    queryKey: ['admin', 'businesses'],
    queryFn: () => admin.listBusinesses(),
  })
}

export function useUpdateAdminBusiness(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Business.AdminUpdateBusiness) => admin.updateBusiness(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'businesses'] }),
  })
}
