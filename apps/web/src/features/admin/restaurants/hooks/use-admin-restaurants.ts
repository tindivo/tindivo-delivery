'use client'
import type { Restaurants } from '@tindivo/contracts'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { admin } from '@/lib/api/client'

export function useAdminRestaurants() {
  return useQuery({
    queryKey: ['admin', 'restaurants'],
    queryFn: () => admin.listRestaurants(),
  })
}

export function useAdminRestaurant(id: string) {
  return useQuery({
    queryKey: ['admin', 'restaurants', id],
    queryFn: () => admin.getRestaurant(id),
    enabled: Boolean(id),
  })
}

export function useCreateRestaurant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Restaurants.CreateRestaurantRequest) => admin.createRestaurant(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'restaurants'] }),
  })
}

export function useUpdateRestaurant(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Restaurants.UpdateRestaurantRequest) => admin.updateRestaurant(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'restaurants'] })
      qc.invalidateQueries({ queryKey: ['admin', 'restaurants', id] })
    },
  })
}
