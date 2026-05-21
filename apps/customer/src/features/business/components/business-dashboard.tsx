'use client'
import { useCustomerAuth } from '@/features/auth/hooks/use-customer-auth'
import { Button, GlassTopBar, Icon, IconButton, Input, Label, Skeleton } from '@tindivo/ui'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import {
  useBusinessMenu,
  useBusinessProfile,
  useCreateBusinessCategory,
  useCreateBusinessItem,
  useCreateBusinessModifierGroup,
  useCreateBusinessModifierOption,
  useDeleteBusinessModifierGroup,
  useDeleteBusinessModifierOption,
  useUpdateBusinessItem,
  useUpdateBusinessModifierGroup,
  useUpdateBusinessModifierOption,
  useUpdateBusinessProfile,
} from '../hooks/use-business'
import { useUploadBusinessImage } from '../hooks/use-upload-business-image'

type MenuData = NonNullable<ReturnType<typeof useBusinessMenu>['data']>
type MenuGroup = MenuData['groups'][number]
type MenuOption = MenuData['options'][number]
type MenuItem = MenuData['items'][number]

export function BusinessDashboard() {
  const router = useRouter()
  const { session, loading, logout } = useCustomerAuth()
  const profile = useBusinessProfile()
  const menu = useBusinessMenu()
  const updateProfile = useUpdateBusinessProfile()
  const createCategory = useCreateBusinessCategory()
  const createItem = useCreateBusinessItem()
  const upload = useUploadBusinessImage()

  const business = profile.data?.business
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [description, setDescription] = useState('')
  const [categoryName, setCategoryName] = useState('')
  const [itemName, setItemName] = useState('')
  const [itemDescription, setItemDescription] = useState('')
  const [itemPrice, setItemPrice] = useState('')
  const [itemCategory, setItemCategory] = useState('')
  const [itemImageUrl, setItemImageUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && (!session || !session.roles.includes('business'))) router.replace('/')
  }, [loading, router, session])

  useEffect(() => {
    if (!business) return
    setName(business.name)
    setPhone(business.phone)
    setAddress(business.address)
    setDescription(business.description ?? '')
  }, [business])

  const groupsByItem = useMemo(() => {
    const map = new Map<string, NonNullable<typeof menu.data>['groups']>()
    for (const group of menu.data?.groups ?? []) {
      const list = map.get(group.menu_item_id) ?? []
      list.push(group)
      map.set(group.menu_item_id, list)
    }
    return map
  }, [menu.data?.groups])

  const optionsByGroup = useMemo(() => {
    const map = new Map<string, NonNullable<typeof menu.data>['options']>()
    for (const option of menu.data?.options ?? []) {
      const list = map.get(option.group_id) ?? []
      list.push(option)
      map.set(option.group_id, list)
    }
    return map
  }, [menu.data?.options])

  const items = menu.data?.items ?? []
  const categories = menu.data?.categories ?? []
  const availableCount = items.filter((item) => item.is_available).length

  async function handleLogout() {
    await logout()
    router.replace('/')
  }

  if (loading || !session || !session.roles.includes('business')) {
    return (
      <div className="customer-page">
        <GlassTopBar title="Negocio" />
        <main className="mx-auto max-w-2xl px-4 pt-24">
          <Skeleton className="h-48" />
        </main>
      </div>
    )
  }

  return (
    <div className="customer-page pb-16">
      <GlassTopBar
        title="Mi negocio"
        subtitle="tindivo.com"
        left={
          <IconButton variant="ghost" onClick={() => router.push('/')} aria-label="Volver">
            <Icon name="arrow_back" />
          </IconButton>
        }
        right={
          <IconButton variant="ghost" onClick={handleLogout} aria-label="Cerrar sesion">
            <Icon name="logout" />
          </IconButton>
        }
      />

      <main className="mx-auto max-w-6xl space-y-5 px-4 pt-24 md:grid md:grid-cols-[380px_minmax(0,1fr)] md:gap-5 md:space-y-0">
        <aside className="space-y-5">
          <section className="customer-soft-gradient customer-shimmer rounded-[36px] p-5 text-white">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase text-white/82">Panel de negocio</p>
                <h1 className="mt-2 text-3xl font-black leading-tight">
                  {business?.name ?? 'Negocio'}
                </h1>
                <p className="mt-2 text-sm font-bold leading-relaxed text-white/86">
                  Publica tu carta en tindivo.com sin mezclarla con delivery.
                </p>
              </div>
              <img
                src="/icon.svg"
                alt=""
                className="h-16 w-16 shrink-0 rounded-[22px] bg-white p-1"
              />
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <Metric value={String(categories.length)} label="Categorias" />
              <Metric value={String(items.length)} label="Platos" />
              <Metric value={String(availableCount)} label="Visibles" />
            </div>
          </section>

          <form
            className="customer-panel-soft space-y-4 rounded-[32px] p-5"
            onSubmit={async (event) => {
              event.preventDefault()
              await updateProfile.mutateAsync({
                name,
                phone,
                address,
                description: description.trim() || null,
              })
            }}
          >
            <div>
              <h2 className="text-xl font-black">Datos publicos</h2>
              <p className="mt-1 text-sm font-semibold text-on-surface-variant">
                Esto ve el cliente en el marketplace.
              </p>
            </div>
            <Field label="Nombre" htmlFor="business-name" icon="storefront">
              <Input
                id="business-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              />
            </Field>
            <Field label="Celular" htmlFor="business-phone" icon="phone_iphone">
              <Input
                id="business-phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 9))}
                required
                inputMode="numeric"
                className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              />
            </Field>
            <Field label="Direccion" htmlFor="business-address" icon="location_on">
              <Input
                id="business-address"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                required
                className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              />
            </Field>
            <div className="space-y-1.5">
              <Label htmlFor="business-description">Descripcion</Label>
              <textarea
                id="business-description"
                value={description}
                onChange={(event) => setDescription(event.target.value.slice(0, 500))}
                rows={3}
                className="customer-textarea"
                placeholder="Especialidad, horarios o beneficios para tus clientes"
              />
            </div>
            <Button className="w-full rounded-[24px]" disabled={updateProfile.isPending}>
              <Icon
                name={updateProfile.isPending ? 'progress_activity' : 'check'}
                className={updateProfile.isPending ? 'animate-spin' : undefined}
              />
              Guardar negocio
            </Button>
          </form>
        </aside>

        <section className="space-y-5">
          <div className="customer-panel-soft rounded-[32px] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">Carta publica</h2>
                <p className="mt-1 text-sm font-semibold text-on-surface-variant">
                  Agrega categorias, fotos, precios y agregados. No genera pedidos de delivery.
                </p>
              </div>
              <Link
                href="/"
                className="customer-lift inline-flex items-center gap-1.5 rounded-full bg-white/72 px-3 py-2 text-sm font-black text-primary-container"
              >
                Ver
                <Icon name="open_in_new" size={16} />
              </Link>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[0.86fr_1.14fr]">
            <form
              className="customer-panel-soft space-y-3 rounded-[30px] p-4"
              onSubmit={async (event) => {
                event.preventDefault()
                if (!categoryName.trim()) return
                await createCategory.mutateAsync({ name: categoryName.trim() })
                setCategoryName('')
              }}
            >
              <SectionTitle icon="category" title="Nueva categoria" />
              <Input
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                placeholder="Ej. Hamburguesas"
                className="rounded-[20px] bg-white/86"
              />
              <Button
                type="submit"
                className="w-full rounded-[22px]"
                disabled={createCategory.isPending}
              >
                <Icon name="add" />
                Crear categoria
              </Button>
            </form>

            <form
              className="customer-panel-soft space-y-3 rounded-[30px] p-4"
              onSubmit={async (event) => {
                event.preventDefault()
                if (!itemName.trim() || !itemPrice) return
                await createItem.mutateAsync({
                  categoryId: itemCategory || null,
                  name: itemName.trim(),
                  description: itemDescription.trim() || undefined,
                  price: Number(itemPrice),
                  imageUrl: itemImageUrl,
                  isAvailable: true,
                  isFeatured: false,
                })
                setItemName('')
                setItemDescription('')
                setItemPrice('')
                setItemImageUrl(null)
              }}
            >
              <SectionTitle icon="restaurant_menu" title="Nuevo plato" />
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  value={itemCategory}
                  onChange={(event) => setItemCategory(event.target.value)}
                  className="h-12 w-full rounded-[20px] border border-outline-variant/25 bg-white/86 px-3 text-base"
                >
                  <option value="">Sin categoria</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <Input
                  value={itemPrice}
                  onChange={(event) => setItemPrice(event.target.value)}
                  inputMode="decimal"
                  placeholder="Precio"
                  required
                  className="rounded-[20px] bg-white/86"
                />
              </div>
              <Input
                value={itemName}
                onChange={(event) => setItemName(event.target.value)}
                placeholder="Nombre del plato"
                required
                className="rounded-[20px] bg-white/86"
              />
              <Input
                value={itemDescription}
                onChange={(event) => setItemDescription(event.target.value)}
                placeholder="Descripcion corta"
                className="rounded-[20px] bg-white/86"
              />
              <label className="customer-lift flex cursor-pointer items-center justify-center gap-2 rounded-[22px] border border-outline-variant/25 bg-white/72 px-4 py-3 text-sm font-black">
                <Icon name={upload.uploading ? 'progress_activity' : 'add_photo_alternate'} />
                {itemImageUrl ? 'Imagen lista' : upload.uploading ? 'Subiendo...' : 'Subir foto'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={async (event) => {
                    const file = event.target.files?.[0]
                    if (!file || !business) return
                    const result = await upload.upload(file, business.id)
                    if ('url' in result) setItemImageUrl(result.url)
                  }}
                />
              </label>
              {upload.error && <p className="text-sm font-bold text-red-700">{upload.error}</p>}
              <Button className="w-full rounded-[22px]" disabled={createItem.isPending}>
                <Icon name="add" />
                Crear plato
              </Button>
            </form>
          </div>

          <div className="space-y-3">
            {menu.isLoading ? (
              <Skeleton className="h-44 rounded-[30px]" />
            ) : items.length === 0 ? (
              <div className="customer-panel-soft rounded-[32px] p-8 text-center">
                <Icon name="restaurant" size={46} className="mx-auto text-on-surface-variant/45" />
                <h3 className="mt-3 text-2xl font-black">Tu carta esta vacia</h3>
                <p className="mt-1 text-sm font-semibold text-on-surface-variant">
                  Crea tu primer plato para aparecer con contenido en tindivo.com.
                </p>
              </div>
            ) : (
              items.map((item, index) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  index={index}
                  restaurantId={business?.id ?? ''}
                  groups={groupsByItem.get(item.id) ?? []}
                  optionsByGroup={optionsByGroup}
                />
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[22px] bg-white/18 p-3 backdrop-blur">
      <p className="text-2xl font-black leading-none">{value}</p>
      <p className="mt-1 text-xs font-black uppercase text-white/78">{label}</p>
    </div>
  )
}

function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <h3 className="flex items-center gap-2 text-lg font-black">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-[18px] bg-primary-fixed text-on-primary-fixed">
        <Icon name={icon} size={21} filled />
      </span>
      {title}
    </h3>
  )
}

function Field({
  label,
  htmlFor,
  icon,
  children,
}: {
  label: string
  htmlFor: string
  icon: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      <div className="customer-field-surface flex h-14 items-center gap-3 px-4">
        <Icon name={icon} size={20} className="shrink-0 text-primary-container" />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}

type GroupMode = 'single' | 'optional' | 'multi' | 'required'

function modeOf(group: { min_selected: number; max_selected: number }): GroupMode {
  if (group.max_selected === 1 && group.min_selected === 0) return 'single'
  if (group.max_selected === 1 && group.min_selected === 1) return 'required'
  if (group.min_selected === 0) return 'optional'
  return 'multi'
}

function limitsToMinMax(mode: GroupMode, max: number) {
  if (mode === 'single') return { minSelected: 0, maxSelected: 1 }
  if (mode === 'required') return { minSelected: 1, maxSelected: 1 }
  if (mode === 'optional') return { minSelected: 0, maxSelected: Math.max(1, max) }
  return { minSelected: 1, maxSelected: Math.max(1, max) }
}

function groupLimitsLabel(group: MenuGroup): string {
  const mode = modeOf(group)
  if (mode === 'single') return 'Opcional · elige 1'
  if (mode === 'required') return 'Obligatorio · elige 1'
  if (mode === 'optional') return `Opcional · hasta ${group.max_selected}`
  return `Mínimo 1 · hasta ${group.max_selected}`
}

function MenuItemCard({
  item,
  index,
  restaurantId,
  groups,
  optionsByGroup,
}: {
  item: MenuItem
  index: number
  restaurantId: string
  groups: MenuGroup[]
  optionsByGroup: Map<string, MenuOption[]>
}) {
  const updateItem = useUpdateBusinessItem()
  const upload = useUploadBusinessImage()

  const [expanded, setExpanded] = useState(false)
  const [showAddGroup, setShowAddGroup] = useState(false)

  async function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !restaurantId) return
    const result = await upload.upload(file, restaurantId)
    if ('url' in result) {
      await updateItem.mutateAsync({ id: item.id, body: { imageUrl: result.url } })
    }
    event.target.value = ''
  }

  const photoBusy = upload.uploading || updateItem.isPending
  const totalOptions = groups.reduce(
    (sum, group) => sum + (optionsByGroup.get(group.id)?.length ?? 0),
    0,
  )

  return (
    <article
      className="customer-panel-soft customer-reveal overflow-hidden rounded-[30px]"
      style={{ animationDelay: `${Math.min(index * 35, 180)}ms` }}
    >
      {/* Header */}
      <div className="flex items-stretch gap-3 p-3">
        <label
          className={`relative flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-[24px] bg-surface-container ${photoBusy ? 'opacity-60' : ''}`}
        >
          {item.image_url ? (
            <img src={item.image_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <Icon name="add_photo_alternate" size={28} className="text-on-surface-variant/70" />
          )}
          <span className="absolute inset-x-0 bottom-0 bg-black/55 py-1 text-center text-[10px] font-black uppercase tracking-wider text-white">
            {photoBusy ? (
              <Icon name="progress_activity" size={12} className="animate-spin" />
            ) : item.image_url ? (
              'Cambiar'
            ) : (
              'Subir foto'
            )}
          </span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handlePhotoChange}
            disabled={photoBusy}
          />
        </label>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-black leading-tight text-on-surface">{item.name}</p>
            <p className="whitespace-nowrap font-black text-primary-container">
              S/ {Number(item.price).toFixed(2)}
            </p>
          </div>
          <p className="mt-1 line-clamp-2 text-sm font-semibold text-on-surface-variant">
            {item.description || 'Sin descripción'}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-800">
              <Icon name={item.is_available ? 'visibility' : 'visibility_off'} size={14} />
              {item.is_available ? 'Visible' : 'Oculto'}
            </span>
            {groups.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-fixed/60 px-2.5 py-1 text-[11px] font-black text-on-primary-fixed">
                <Icon name="tune" size={14} />
                {groups.length} {groups.length === 1 ? 'grupo' : 'grupos'} · {totalOptions}{' '}
                {totalOptions === 1 ? 'opción' : 'opciones'}
              </span>
            )}
          </div>
          {upload.error && <p className="mt-2 text-xs font-bold text-red-700">{upload.error}</p>}
        </div>
      </div>

      {/* Toggle bar */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between border-t border-outline-variant/15 bg-white/40 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-on-surface-variant transition hover:bg-white/64"
      >
        <span className="inline-flex items-center gap-1.5">
          <Icon name="restaurant_menu" size={14} />
          {expanded ? 'Cerrar editor' : 'Agregados y opciones'}
        </span>
        <Icon name={expanded ? 'expand_less' : 'expand_more'} size={18} />
      </button>

      {/* Editor */}
      {expanded && (
        <div className="space-y-3 border-t border-outline-variant/15 bg-white/30 p-4">
          {groups.length === 0 && !showAddGroup ? (
            <div className="rounded-[22px] border border-dashed border-outline-variant/40 bg-white/40 p-5 text-center">
              <Icon name="tune" size={28} className="mx-auto text-on-surface-variant/60" />
              <p className="mt-2 text-sm font-black text-on-surface">
                Aún no tiene grupos de opciones
              </p>
              <p className="mt-0.5 text-xs font-semibold text-on-surface-variant">
                Crea un grupo (Tamaño, Salsas, Agregados…) y agrégale opciones.
              </p>
              <Button
                type="button"
                onClick={() => setShowAddGroup(true)}
                className="mt-3 rounded-[18px]"
                size="md"
              >
                <Icon name="add" />
                Crear primer grupo
              </Button>
            </div>
          ) : (
            <>
              {groups.map((group) => (
                <ModifierGroupBlock
                  key={group.id}
                  group={group}
                  options={optionsByGroup.get(group.id) ?? []}
                />
              ))}
              {!showAddGroup ? (
                <button
                  type="button"
                  onClick={() => setShowAddGroup(true)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-[18px] border border-dashed border-outline-variant/40 bg-white/40 py-2.5 text-sm font-black text-primary-container transition hover:bg-white/72"
                >
                  <Icon name="add" size={16} />
                  Agregar otro grupo
                </button>
              ) : null}
            </>
          )}

          {showAddGroup && (
            <AddGroupForm
              itemId={item.id}
              onCancel={() => setShowAddGroup(false)}
              onCreated={() => setShowAddGroup(false)}
            />
          )}
        </div>
      )}
    </article>
  )
}

function AddGroupForm({
  itemId,
  onCancel,
  onCreated,
}: {
  itemId: string
  onCancel: () => void
  onCreated: () => void
}) {
  const createGroup = useCreateBusinessModifierGroup()
  const [name, setName] = useState('')
  const [mode, setMode] = useState<GroupMode>('optional')
  const [max, setMax] = useState('3')

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    const { minSelected, maxSelected } = limitsToMinMax(mode, Number.parseInt(max || '3', 10) || 3)
    await createGroup.mutateAsync({
      menuItemId: itemId,
      name: name.trim(),
      minSelected,
      maxSelected,
    })
    setName('')
    setMode('optional')
    setMax('3')
    onCreated()
  }

  const needsMax = mode === 'optional' || mode === 'multi'

  return (
    <form
      className="space-y-3 rounded-[22px] border border-primary-container/30 bg-white/72 p-4"
      onSubmit={handleSubmit}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-black uppercase tracking-wider text-on-surface-variant">
          Nuevo grupo de opciones
        </p>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancelar"
          className="inline-flex h-6 w-6 items-center justify-center rounded-full text-on-surface-variant transition hover:bg-surface-container"
        >
          <Icon name="close" size={16} />
        </button>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`add-group-name-${itemId}`}>Nombre</Label>
        <Input
          id={`add-group-name-${itemId}`}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ej. Tamaño, Salsas, Agregados"
          className="rounded-[18px] bg-white"
          autoFocus
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`add-group-mode-${itemId}`}>¿Cómo elige el cliente?</Label>
        <select
          id={`add-group-mode-${itemId}`}
          value={mode}
          onChange={(event) => setMode(event.target.value as GroupMode)}
          className="h-12 w-full rounded-[18px] border border-outline-variant/25 bg-white px-3 text-sm font-semibold"
        >
          <option value="single">Una sola opción · opcional</option>
          <option value="required">Una sola opción · obligatoria</option>
          <option value="optional">Varias opciones · opcional</option>
          <option value="multi">Varias opciones · al menos una</option>
        </select>
      </div>
      {needsMax && (
        <div className="space-y-1.5">
          <Label htmlFor={`add-group-max-${itemId}`}>Máximo de opciones</Label>
          <Input
            id={`add-group-max-${itemId}`}
            value={max}
            onChange={(event) => setMax(event.target.value)}
            inputMode="numeric"
            placeholder="3"
            className="rounded-[18px] bg-white"
          />
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <Button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-[18px] bg-white text-on-surface hover:bg-surface-container"
          size="md"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          className="flex-1 rounded-[18px]"
          size="md"
          disabled={createGroup.isPending || !name.trim()}
        >
          <Icon
            name={createGroup.isPending ? 'progress_activity' : 'check'}
            className={createGroup.isPending ? 'animate-spin' : undefined}
          />
          Crear grupo
        </Button>
      </div>
    </form>
  )
}

function ModifierGroupBlock({ group, options }: { group: MenuGroup; options: MenuOption[] }) {
  const updateGroup = useUpdateBusinessModifierGroup()
  const deleteGroup = useDeleteBusinessModifierGroup()

  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showAddOption, setShowAddOption] = useState(false)

  const [name, setName] = useState(group.name)
  const [mode, setMode] = useState<GroupMode>(modeOf(group))
  const [max, setMax] = useState(String(group.max_selected))

  function startEdit() {
    setName(group.name)
    setMode(modeOf(group))
    setMax(String(group.max_selected))
    setEditing(true)
    setConfirmDelete(false)
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    const { minSelected, maxSelected } = limitsToMinMax(mode, Number.parseInt(max || '3', 10) || 3)
    await updateGroup.mutateAsync({
      id: group.id,
      body: { name: name.trim(), minSelected, maxSelected },
    })
    setEditing(false)
  }

  async function handleDelete() {
    await deleteGroup.mutateAsync(group.id)
  }

  const needsMax = mode === 'optional' || mode === 'multi'

  return (
    <div className="rounded-[22px] bg-white/72 p-3 space-y-2.5 ring-1 ring-outline-variant/15">
      {/* Group header */}
      {editing ? (
        <form className="space-y-2" onSubmit={handleSave}>
          <div className="space-y-1">
            <Label htmlFor={`edit-group-name-${group.id}`} className="text-[11px]">
              Nombre del grupo
            </Label>
            <Input
              id={`edit-group-name-${group.id}`}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="rounded-[16px] bg-white"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`edit-group-mode-${group.id}`} className="text-[11px]">
              ¿Cómo elige el cliente?
            </Label>
            <select
              id={`edit-group-mode-${group.id}`}
              value={mode}
              onChange={(event) => setMode(event.target.value as GroupMode)}
              className="h-11 w-full rounded-[16px] border border-outline-variant/25 bg-white px-3 text-sm font-semibold"
            >
              <option value="single">Una sola opción · opcional</option>
              <option value="required">Una sola opción · obligatoria</option>
              <option value="optional">Varias opciones · opcional</option>
              <option value="multi">Varias opciones · al menos una</option>
            </select>
          </div>
          {needsMax && (
            <div className="space-y-1">
              <Label htmlFor={`edit-group-max-${group.id}`} className="text-[11px]">
                Máximo de opciones
              </Label>
              <Input
                id={`edit-group-max-${group.id}`}
                value={max}
                onChange={(event) => setMax(event.target.value)}
                inputMode="numeric"
                className="rounded-[16px] bg-white"
              />
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              onClick={() => setEditing(false)}
              className="flex-1 rounded-[16px] bg-white text-on-surface hover:bg-surface-container"
              size="md"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 rounded-[16px]"
              size="md"
              disabled={updateGroup.isPending || !name.trim()}
            >
              <Icon
                name={updateGroup.isPending ? 'progress_activity' : 'check'}
                className={updateGroup.isPending ? 'animate-spin' : undefined}
              />
              Guardar
            </Button>
          </div>
        </form>
      ) : confirmDelete ? (
        <div className="flex items-center justify-between gap-2 rounded-[16px] bg-red-50 p-3">
          <div className="min-w-0">
            <p className="text-sm font-black text-red-900">¿Eliminar "{group.name}"?</p>
            <p className="text-[11px] font-semibold text-red-800/80">
              Se borrarán también sus {options.length}{' '}
              {options.length === 1 ? 'opción' : 'opciones'}.
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="rounded-full border border-red-300/50 bg-white px-3 py-1.5 text-xs font-black text-red-900"
              disabled={deleteGroup.isPending}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-1 rounded-full bg-red-600 px-3 py-1.5 text-xs font-black text-white"
              disabled={deleteGroup.isPending}
            >
              <Icon
                name={deleteGroup.isPending ? 'progress_activity' : 'delete'}
                size={14}
                className={deleteGroup.isPending ? 'animate-spin' : undefined}
              />
              Eliminar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-black text-on-surface">{group.name}</p>
            <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-primary-fixed/70 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-on-primary-fixed">
              {groupLimitsLabel(group)}
            </span>
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={startEdit}
              aria-label="Editar grupo"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface"
            >
              <Icon name="edit" size={16} />
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              aria-label="Eliminar grupo"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-red-700/80 transition hover:bg-red-50"
            >
              <Icon name="delete" size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Options */}
      {!editing && !confirmDelete && (
        <div className="space-y-1.5">
          {options.length > 0 ? (
            <ul className="space-y-1">
              {options.map((option) => (
                <OptionRow key={option.id} option={option} />
              ))}
            </ul>
          ) : (
            <p className="text-xs font-semibold text-on-surface-variant/70">Sin opciones todavía</p>
          )}

          {showAddOption ? (
            <AddOptionForm
              groupId={group.id}
              onCancel={() => setShowAddOption(false)}
              onCreated={() => setShowAddOption(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowAddOption(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-[14px] border border-dashed border-outline-variant/40 bg-white/40 py-1.5 text-xs font-black text-primary-container transition hover:bg-white"
            >
              <Icon name="add" size={14} />
              Agregar opción
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function OptionRow({ option }: { option: MenuOption }) {
  const updateOption = useUpdateBusinessModifierOption()
  const deleteOption = useDeleteBusinessModifierOption()

  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [name, setName] = useState(option.name)
  const [price, setPrice] = useState(String(option.price_delta))

  function startEdit() {
    setName(option.name)
    setPrice(String(option.price_delta))
    setEditing(true)
    setConfirmDelete(false)
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    await updateOption.mutateAsync({
      id: option.id,
      body: { name: name.trim(), priceDelta: Number(price || 0) },
    })
    setEditing(false)
  }

  async function handleDelete() {
    await deleteOption.mutateAsync(option.id)
  }

  if (editing) {
    return (
      <li>
        <form
          className="grid gap-1.5 rounded-[14px] bg-white p-2 md:grid-cols-[1fr_110px_auto]"
          onSubmit={handleSave}
        >
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-label="Nombre de la opción"
            placeholder="Nombre"
            className="h-10 rounded-[12px] bg-white"
            autoFocus
          />
          <Input
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            inputMode="decimal"
            aria-label="Precio extra"
            placeholder="0.00"
            className="h-10 rounded-[12px] bg-white"
          />
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setEditing(false)}
              aria-label="Cancelar"
              className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-surface-container text-on-surface-variant"
              disabled={updateOption.isPending}
            >
              <Icon name="close" size={16} />
            </button>
            <button
              type="submit"
              aria-label="Guardar"
              className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-primary text-on-primary disabled:opacity-50"
              disabled={updateOption.isPending || !name.trim()}
            >
              <Icon
                name={updateOption.isPending ? 'progress_activity' : 'check'}
                size={16}
                className={updateOption.isPending ? 'animate-spin' : undefined}
              />
            </button>
          </div>
        </form>
      </li>
    )
  }

  if (confirmDelete) {
    return (
      <li className="flex items-center justify-between gap-2 rounded-[14px] bg-red-50 px-3 py-2">
        <p className="truncate text-xs font-black text-red-900">¿Eliminar "{option.name}"?</p>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => setConfirmDelete(false)}
            className="rounded-full border border-red-300/50 bg-white px-2.5 py-1 text-[11px] font-black text-red-900"
            disabled={deleteOption.isPending}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-black text-white"
            disabled={deleteOption.isPending}
          >
            <Icon
              name={deleteOption.isPending ? 'progress_activity' : 'delete'}
              size={12}
              className={deleteOption.isPending ? 'animate-spin' : undefined}
            />
            Eliminar
          </button>
        </div>
      </li>
    )
  }

  return (
    <li className="group flex items-center justify-between gap-2 rounded-[14px] px-2 py-1.5 transition hover:bg-white">
      <span className="truncate text-sm font-semibold text-on-surface">{option.name}</span>
      <div className="flex shrink-0 items-center gap-1">
        <span className="text-sm font-black text-primary-container">
          +S/ {Number(option.price_delta).toFixed(2)}
        </span>
        <div className="ml-1 flex items-center opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
          <button
            type="button"
            onClick={startEdit}
            aria-label="Editar opción"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container"
          >
            <Icon name="edit" size={14} />
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            aria-label="Eliminar opción"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-red-700/80 hover:bg-red-50"
          >
            <Icon name="delete" size={14} />
          </button>
        </div>
      </div>
    </li>
  )
}

function AddOptionForm({
  groupId,
  onCancel,
  onCreated,
}: {
  groupId: string
  onCancel: () => void
  onCreated: () => void
}) {
  const createOption = useCreateBusinessModifierOption()
  const [name, setName] = useState('')
  const [price, setPrice] = useState('0')

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    await createOption.mutateAsync({
      groupId,
      name: name.trim(),
      priceDelta: Number(price || 0),
    })
    setName('')
    setPrice('0')
    onCreated()
  }

  return (
    <form
      className="grid gap-1.5 rounded-[14px] bg-white p-2 md:grid-cols-[1fr_110px_auto]"
      onSubmit={handleSubmit}
    >
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Nueva opción (ej. Doble queso)"
        aria-label="Nombre de la opción"
        className="h-10 rounded-[12px] bg-white"
        autoFocus
      />
      <Input
        value={price}
        onChange={(event) => setPrice(event.target.value)}
        inputMode="decimal"
        placeholder="0.00"
        aria-label="Precio extra"
        className="h-10 rounded-[12px] bg-white"
      />
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancelar"
          className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-surface-container text-on-surface-variant"
          disabled={createOption.isPending}
        >
          <Icon name="close" size={16} />
        </button>
        <button
          type="submit"
          aria-label="Agregar"
          className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-primary text-on-primary disabled:opacity-50"
          disabled={createOption.isPending || !name.trim()}
        >
          <Icon
            name={createOption.isPending ? 'progress_activity' : 'check'}
            size={16}
            className={createOption.isPending ? 'animate-spin' : undefined}
          />
        </button>
      </div>
    </form>
  )
}
