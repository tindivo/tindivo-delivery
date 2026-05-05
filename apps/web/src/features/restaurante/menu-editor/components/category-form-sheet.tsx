'use client'
import { ApiError, type MenuCategoryRow } from '@tindivo/api-client'
import { Button, Icon, IconButton, Input, Label } from '@tindivo/ui'
import { motion } from 'motion/react'
import { useState } from 'react'
import { useCreateCategory, useDeleteCategory, useUpdateCategory } from '../hooks/use-menu'

type Props = {
  category: MenuCategoryRow | null
  onClose: () => void
}

export function CategoryFormSheet({ category, onClose }: Props) {
  const create = useCreateCategory()
  const update = useUpdateCategory()
  const remove = useDeleteCategory()
  const isEdit = Boolean(category?.id)
  const [name, setName] = useState(category?.name ?? '')
  const [description, setDescription] = useState(category?.description ?? '')
  const [isActive, setIsActive] = useState(category?.is_active ?? true)
  const [sortOrder, setSortOrder] = useState(category?.sort_order ?? 0)
  const [error, setError] = useState<string | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      if (isEdit && category) {
        await update.mutateAsync({
          id: category.id,
          body: { name, description: description || null, isActive, sortOrder },
        })
      } else {
        await create.mutateAsync({ name, description, sortOrder, isActive })
      }
      onClose()
    } catch (err) {
      setError(humanize(err))
    }
  }

  async function handleDelete() {
    if (!category) return
    if (!confirm(`¿Eliminar "${category.name}"? Los productos en esta categoría quedarán sin categoría.`)) return
    setError(null)
    try {
      await remove.mutateAsync(category.id)
      onClose()
    } catch (err) {
      setError(humanize(err))
    }
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/40 flex items-end" role="dialog">
      <button type="button" aria-label="Cerrar" className="absolute inset-0" onClick={onClose} />
      <motion.div
        initial={{ y: 480 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 260 }}
        className="relative z-10 w-full rounded-t-[28px] bg-surface pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/10">
          <h2 className="text-xl font-black">{isEdit ? 'Editar categoría' : 'Nueva categoría'}</h2>
          <IconButton variant="subtle" onClick={onClose} aria-label="Cerrar">
            <Icon name="close" />
          </IconButton>
        </div>

        <form onSubmit={handleSave} className="px-5 pt-4 max-w-md mx-auto space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cat-name">Nombre</Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Entradas, Bebidas, etc."
              required
              minLength={2}
              maxLength={60}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cat-desc">Descripción (opcional)</Label>
            <Input
              id="cat-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cat-order">Orden</Label>
              <Input
                id="cat-order"
                type="number"
                min={0}
                max={9999}
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm font-bold text-on-surface">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4"
                />
                Visible al cliente
              </label>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={create.isPending || update.isPending}>
            <Icon name={create.isPending || update.isPending ? 'progress_activity' : 'check'} className={create.isPending || update.isPending ? 'animate-spin' : undefined} />
            {isEdit ? 'Guardar cambios' : 'Crear categoría'}
          </Button>

          {isEdit && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={remove.isPending}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-300 text-red-700 font-bold text-sm hover:bg-red-50"
            >
              <Icon name="delete" size={16} />
              Eliminar categoría
            </button>
          )}
        </form>
      </motion.div>
    </div>
  )
}

function humanize(err: unknown): string {
  if (err instanceof ApiError) return err.problem.detail ?? err.problem.title
  return 'No se pudo guardar. Intenta de nuevo.'
}
