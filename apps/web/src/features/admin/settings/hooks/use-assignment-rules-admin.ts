'use client'
import { admin } from '@/lib/api/client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AssignmentRulesDto } from '@tindivo/api-client'

const QK = ['admin', 'settings', 'assignment-rules'] as const

export function useAssignmentRulesAdmin() {
  return useQuery({
    queryKey: QK,
    queryFn: () => admin.getAssignmentRules(),
  })
}

export function useUpdateAssignmentRules() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: AssignmentRulesDto) => admin.updateAssignmentRules(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK })
    },
  })
}
