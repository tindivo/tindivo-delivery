'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { driver } from '@/lib/api/client'
import type { DriverProfile } from '@tindivo/api-client'

export function useToggleAvailability() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (isAvailable: boolean) => driver.toggleAvailability({ isAvailable }),
    onMutate: async (isAvailable) => {
      await qc.cancelQueries({ queryKey: ['driver', 'profile'] })
      const previous = qc.getQueryData<DriverProfile>(['driver', 'profile'])
      if (previous) {
        qc.setQueryData<DriverProfile>(['driver', 'profile'], { ...previous, isAvailable })
      }
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(['driver', 'profile'], ctx.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['driver', 'profile'] }),
  })
}
