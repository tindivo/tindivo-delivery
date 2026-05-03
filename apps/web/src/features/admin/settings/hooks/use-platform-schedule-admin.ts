'use client'
import { admin } from '@/lib/api/client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PlatformScheduleDto } from '@tindivo/api-client'

const QK = ['admin', 'settings', 'platform-schedule'] as const

export function usePlatformScheduleAdmin() {
  return useQuery({
    queryKey: QK,
    queryFn: () => admin.getPlatformSchedule(),
  })
}

export function useUpdatePlatformSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: PlatformScheduleDto) => admin.updatePlatformSchedule(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK })
      qc.invalidateQueries({ queryKey: ['platform-status'] })
    },
  })
}
