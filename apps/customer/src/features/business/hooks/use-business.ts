'use client'
import { customer } from '@/lib/api/client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const PROFILE_QK = ['business', 'profile'] as const
const MENU_QK = ['business', 'menu'] as const

export function useBusinessProfile() {
  return useQuery({
    queryKey: PROFILE_QK,
    queryFn: () => customer.getBusinessProfile(),
  })
}

export function useUpdateBusinessProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: customer.updateBusinessProfile,
    onSuccess: () => qc.invalidateQueries({ queryKey: PROFILE_QK }),
  })
}

export function useBusinessMenu() {
  return useQuery({
    queryKey: MENU_QK,
    queryFn: () => customer.getBusinessMenuTree(),
  })
}

export function useCreateBusinessCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: customer.createBusinessMenuCategory,
    onSuccess: () => qc.invalidateQueries({ queryKey: MENU_QK }),
  })
}

export function useCreateBusinessItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: customer.createBusinessMenuItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: MENU_QK }),
  })
}

export function useUpdateBusinessItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string
      body: Parameters<typeof customer.updateBusinessMenuItem>[1]
    }) => customer.updateBusinessMenuItem(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: MENU_QK }),
  })
}

export function useCreateBusinessModifierGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: customer.createBusinessModifierGroup,
    onSuccess: () => qc.invalidateQueries({ queryKey: MENU_QK }),
  })
}

export function useUpdateBusinessModifierGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string
      body: Parameters<typeof customer.updateBusinessModifierGroup>[1]
    }) => customer.updateBusinessModifierGroup(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: MENU_QK }),
  })
}

export function useDeleteBusinessModifierGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => customer.deleteBusinessModifierGroup(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: MENU_QK }),
  })
}

export function useCreateBusinessModifierOption() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: customer.createBusinessModifierOption,
    onSuccess: () => qc.invalidateQueries({ queryKey: MENU_QK }),
  })
}

export function useUpdateBusinessModifierOption() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string
      body: Parameters<typeof customer.updateBusinessModifierOption>[1]
    }) => customer.updateBusinessModifierOption(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: MENU_QK }),
  })
}

export function useDeleteBusinessModifierOption() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => customer.deleteBusinessModifierOption(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: MENU_QK }),
  })
}
