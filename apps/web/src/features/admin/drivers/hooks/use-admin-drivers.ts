'use client'
import { admin } from '@/lib/api/client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Drivers } from '@tindivo/contracts'

export function useAdminDrivers() {
  return useQuery({
    queryKey: ['admin', 'drivers'],
    queryFn: () => admin.listDrivers(),
  })
}

export function useAdminDriver(id: string) {
  return useQuery({
    queryKey: ['admin', 'drivers', id],
    queryFn: () => admin.getDriver(id),
    enabled: Boolean(id),
  })
}

export function useAdminRestaurantsForAssignment() {
  return useQuery({
    queryKey: ['admin', 'restaurants', 'list-for-assignment'],
    queryFn: () => admin.listRestaurants(),
  })
}

export function useCreateDriver() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Drivers.CreateDriverRequest) => admin.createDriver(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'drivers'] }),
  })
}

export function useUpdateDriver(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Drivers.UpdateDriverRequest) => admin.updateDriver(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'drivers'] })
      qc.invalidateQueries({ queryKey: ['admin', 'drivers', id] })
    },
  })
}

export function useSetDriverRestaurants(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Drivers.SetDriverRestaurantsRequest) => admin.setDriverRestaurants(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'drivers'] })
      qc.invalidateQueries({ queryKey: ['admin', 'drivers', id] })
    },
  })
}

export function useSetDriverActive(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Drivers.SetDriverActiveRequest) => admin.setDriverActive(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'drivers'] })
      qc.invalidateQueries({ queryKey: ['admin', 'drivers', id] })
    },
  })
}
