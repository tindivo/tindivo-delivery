'use client'
import { restaurant } from '@/lib/api/client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const QK = ['restaurant', 'menu'] as const

export function useMenuTree() {
  return useQuery({
    queryKey: QK,
    queryFn: () => restaurant.getMenuTree(),
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: restaurant.createMenuCategory,
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; body: Parameters<typeof restaurant.updateMenuCategory>[1] }) =>
      restaurant.updateMenuCategory(input.id, input.body),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => restaurant.deleteMenuCategory(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useCreateItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: restaurant.createMenuItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useUpdateItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; body: Parameters<typeof restaurant.updateMenuItem>[1] }) =>
      restaurant.updateMenuItem(input.id, input.body),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useDeleteItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => restaurant.deleteMenuItem(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useCreateModifierGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: restaurant.createModifierGroup,
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useDeleteModifierGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => restaurant.deleteModifierGroup(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useCreateModifierOption() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: restaurant.createModifierOption,
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useDeleteModifierOption() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => restaurant.deleteModifierOption(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}
