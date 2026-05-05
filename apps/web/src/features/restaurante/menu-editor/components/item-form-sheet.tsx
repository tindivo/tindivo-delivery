'use client'
import { supabase } from '@/lib/supabase/client'
import {
  ApiError,
  type MenuCategoryRow,
  type MenuItemRow,
  type MenuModifierGroupRow,
  type MenuModifierOptionRow,
} from '@tindivo/api-client'
import { Button, Icon, IconButton, Input, Label, Skeleton } from '@tindivo/ui'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import {
  useCreateItem,
  useCreateModifierGroup,
  useCreateModifierOption,
  useDeleteItem,
  useDeleteModifierGroup,
  useDeleteModifierOption,
  useUpdateItem,
} from '../hooks/use-menu'
import { useUploadMenuImage } from '../hooks/use-upload-menu-image'

type Props = {
  item: Partial<MenuItemRow> | null
  categories: MenuCategoryRow[]
  groups: MenuModifierGroupRow[]
  options: MenuModifierOptionRow[]
  onClose: () => void
}

export function ItemFormSheet({ item, categories, groups, options, onClose }: Props) {
  const isEdit = Boolean(item?.id)
  const create = useCreateItem()
  const update = useUpdateItem()
  const remove = useDeleteItem()
  const upload = useUploadMenuImage()

  const [name, setName] = useState(item?.name ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [price, setPrice] = useState(item?.price ?? 0)
  const [imageUrl, setImageUrl] = useState<string | null>(item?.image_url ?? null)
  const [categoryId, setCategoryId] = useState<string | null>(item?.category_id ?? null)
  const [prepMinutes, setPrepMinutes] = useState<number | null>(item?.prep_minutes ?? null)
  const [isAvailable, setIsAvailable] = useState(item?.is_available ?? true)
  const [isFeatured, setIsFeatured] = useState(item?.is_featured ?? false)
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadRest() {
      const { data: u } = await supabase.auth.getUser()
      if (!u.user) return
      const { data } = await supabase.from('restaurants').select('id').eq('user_id', u.user.id).maybeSingle()
      setRestaurantId(data?.id ?? null)
    }
    loadRest()
  }, [])

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !restaurantId) return
    const res = await upload.upload(file, restaurantId, item?.id)
    if ('url' in res) setImageUrl(res.url)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      if (isEdit && item?.id) {
        await update.mutateAsync({
          id: item.id,
          body: {
            categoryId,
            name,
            description: description || null,
            price: Number(price),
            imageUrl: imageUrl ?? null,
            prepMinutes: prepMinutes ?? null,
            isAvailable,
            isFeatured,
          },
        })
      } else {
        await create.mutateAsync({
          categoryId,
          name,
          description,
          price: Number(price),
          imageUrl: imageUrl ?? null,
          prepMinutes: prepMinutes ?? undefined,
          isAvailable,
          isFeatured,
        })
      }
      onClose()
    } catch (err) {
      setError(humanize(err))
    }
  }

  async function handleDelete() {
    if (!item?.id) return
    if (!confirm(`¿Eliminar "${name}"? Esta acción no se puede deshacer.`)) return
    setError(null)
    try {
      await remove.mutateAsync(item.id)
      onClose()
    } catch (err) {
      setError(humanize(err))
    }
  }

  const itemGroups = item?.id
    ? groups.filter((g) => g.menu_item_id === item.id)
    : []

  return (
    <div className="fixed inset-0 z-[80] bg-black/40 flex items-end" role="dialog">
      <button type="button" aria-label="Cerrar" className="absolute inset-0" onClick={onClose} />
      <motion.div
        initial={{ y: 720 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 260 }}
        className="relative z-10 w-full max-h-[92vh] overflow-y-auto rounded-t-[28px] bg-surface pb-32"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-surface/92 backdrop-blur-xl border-b border-outline-variant/10">
          <h2 className="text-xl font-black">{isEdit ? 'Editar producto' : 'Nuevo producto'}</h2>
          <IconButton variant="subtle" onClick={onClose} aria-label="Cerrar">
            <Icon name="close" />
          </IconButton>
        </div>

        <form onSubmit={handleSave} className="px-5 pt-4 max-w-md mx-auto space-y-4">
          {/* Imagen */}
          <div className="space-y-2">
            <Label>Imagen (opcional)</Label>
            <div className="flex items-center gap-3">
              <span className="w-20 h-20 rounded-2xl bg-surface-container overflow-hidden flex items-center justify-center flex-shrink-0">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Icon name="image" size={28} className="text-on-surface-variant/40" />
                )}
              </span>
              <label className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-outline-variant/30 cursor-pointer bg-surface-container-lowest text-sm font-bold">
                <Icon name={upload.uploading ? 'progress_activity' : 'photo_camera'} className={upload.uploading ? 'animate-spin' : undefined} />
                {upload.uploading ? 'Subiendo...' : imageUrl ? 'Cambiar imagen' : 'Subir imagen'}
                <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
              </label>
            </div>
            {upload.error && <p className="text-xs text-red-700">{upload.error}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="item-name">Nombre</Label>
            <Input id="item-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={80} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="item-desc">Descripción</Label>
            <textarea
              id="item-desc"
              value={description ?? ''}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              rows={3}
              className="w-full rounded-[20px] border border-outline-variant/35 bg-surface-container-lowest px-4 py-3 text-sm resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="item-price">Precio (S/)</Label>
              <Input
                id="item-price"
                type="number"
                step="0.01"
                min={0}
                max={9999.99}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="item-prep">Tiempo prep (min)</Label>
              <Input
                id="item-prep"
                type="number"
                min={5}
                max={120}
                value={prepMinutes ?? ''}
                onChange={(e) => setPrepMinutes(e.target.value ? Number(e.target.value) : null)}
                placeholder="Auto"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="item-cat">Categoría</Label>
            <select
              id="item-cat"
              value={categoryId ?? ''}
              onChange={(e) => setCategoryId(e.target.value || null)}
              className="w-full rounded-xl bg-surface-container-lowest border border-outline-variant/30 px-3 py-2.5 text-sm"
            >
              <option value="">Sin categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm font-bold text-on-surface">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isAvailable}
                onChange={(e) => setIsAvailable(e.target.checked)}
                className="w-4 h-4"
              />
              Disponible
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="w-4 h-4"
              />
              Destacado
            </label>
          </div>

          {/* Modificadores: solo cuando ya existe el item (necesita item_id) */}
          {isEdit && item?.id && (
            <ModifiersEditor itemId={item.id} groups={itemGroups} options={options} />
          )}

          {error && (
            <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}
        </form>

        <div className="fixed bottom-0 left-0 right-0 z-20 px-5 pb-5 pt-3 bg-surface/92 backdrop-blur-xl border-t border-outline-variant/15 max-w-md mx-auto space-y-2">
          <Button
            onClick={handleSave}
            type="button"
            size="lg"
            className="w-full"
            disabled={create.isPending || update.isPending}
          >
            <Icon name={create.isPending || update.isPending ? 'progress_activity' : 'check'} className={create.isPending || update.isPending ? 'animate-spin' : undefined} />
            {isEdit ? 'Guardar cambios' : 'Crear producto'}
          </Button>
          {isEdit && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={remove.isPending}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-300 text-red-700 font-bold text-sm hover:bg-red-50"
            >
              <Icon name="delete" size={16} />
              Eliminar producto
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}

function ModifiersEditor({
  itemId,
  groups,
  options,
}: {
  itemId: string
  groups: MenuModifierGroupRow[]
  options: MenuModifierOptionRow[]
}) {
  const createGroup = useCreateModifierGroup()
  const deleteGroup = useDeleteModifierGroup()
  const createOption = useCreateModifierOption()
  const deleteOption = useDeleteModifierOption()
  const [newGroupName, setNewGroupName] = useState('')

  async function addGroup() {
    if (!newGroupName.trim()) return
    await createGroup.mutateAsync({
      menuItemId: itemId,
      name: newGroupName.trim(),
      minSelected: 1,
      maxSelected: 1,
    })
    setNewGroupName('')
  }

  return (
    <section className="space-y-3 pt-2 border-t border-outline-variant/10">
      <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase text-on-surface-variant">
        Modificadores (acompañamientos, extras)
      </h3>

      {groups.map((group) => (
        <div key={group.id} className="rounded-xl bg-surface-container/40 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold text-sm">
              {group.name}{' '}
              <span className="font-normal text-on-surface-variant">
                ({group.min_selected}-{group.max_selected})
              </span>
            </p>
            <button
              type="button"
              onClick={() => deleteGroup.mutateAsync(group.id)}
              className="text-red-700 text-xs font-bold"
            >
              Eliminar
            </button>
          </div>
          <ul className="space-y-1">
            {options
              .filter((o) => o.group_id === group.id)
              .map((opt) => (
                <li key={opt.id} className="flex items-center justify-between text-xs gap-2">
                  <span>
                    {opt.name}
                    {opt.price_delta !== 0 && (
                      <span className="ml-1 text-on-surface-variant">
                        {opt.price_delta > 0 ? '+' : ''}S/ {Number(opt.price_delta).toFixed(2)}
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteOption.mutateAsync(opt.id)}
                    className="text-red-700 font-bold"
                  >
                    ✕
                  </button>
                </li>
              ))}
            <NewOptionInput groupId={group.id} onCreate={(o) => createOption.mutateAsync(o)} />
          </ul>
        </div>
      ))}

      <div className="flex items-center gap-2">
        <Input
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          placeholder="Nombre del grupo (ej. Acompañamiento)"
        />
        <button
          type="button"
          onClick={addGroup}
          disabled={createGroup.isPending}
          className="px-4 py-2 rounded-xl bg-surface-container text-sm font-bold flex-shrink-0"
        >
          + Grupo
        </button>
      </div>
    </section>
  )
}

function NewOptionInput({
  groupId,
  onCreate,
}: {
  groupId: string
  onCreate: (input: { groupId: string; name: string; priceDelta?: number }) => Promise<unknown>
}) {
  const [name, setName] = useState('')
  const [delta, setDelta] = useState(0)
  const [busy, setBusy] = useState(false)

  async function add() {
    if (!name.trim()) return
    setBusy(true)
    try {
      await onCreate({ groupId, name: name.trim(), priceDelta: delta })
      setName('')
      setDelta(0)
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="flex items-center gap-1.5 pt-1">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Opción"
        className="flex-1 rounded-lg border border-outline-variant/30 px-2 py-1 text-xs"
      />
      <input
        type="number"
        step="0.5"
        value={delta}
        onChange={(e) => setDelta(Number(e.target.value))}
        placeholder="0.00"
        className="w-16 rounded-lg border border-outline-variant/30 px-2 py-1 text-xs tabular-nums"
      />
      <button
        type="button"
        onClick={add}
        disabled={busy}
        className="px-2 py-1 rounded-lg bg-primary-container text-white text-xs font-bold"
      >
        +
      </button>
    </li>
  )
}

function humanize(err: unknown): string {
  if (err instanceof ApiError) return err.problem.detail ?? err.problem.title
  return 'No se pudo guardar. Intenta de nuevo.'
}
