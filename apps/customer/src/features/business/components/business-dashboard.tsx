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
  useUpdateBusinessItem,
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
  const createGroup = useCreateBusinessModifierGroup()

  const [groupName, setGroupName] = useState('')
  const [groupMode, setGroupMode] = useState<'single' | 'optional' | 'multi' | 'required'>(
    'optional',
  )
  const [groupMax, setGroupMax] = useState('3')

  async function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !restaurantId) return
    const result = await upload.upload(file, restaurantId)
    if ('url' in result) {
      await updateItem.mutateAsync({ id: item.id, body: { imageUrl: result.url } })
    }
    event.target.value = ''
  }

  async function handleCreateGroup(event: React.FormEvent) {
    event.preventDefault()
    let minSelected = 0
    let maxSelected = 1
    if (groupMode === 'single') {
      minSelected = 0
      maxSelected = 1
    } else if (groupMode === 'optional') {
      minSelected = 0
      maxSelected = Math.max(1, Number.parseInt(groupMax || '3', 10) || 3)
    } else if (groupMode === 'multi') {
      minSelected = 1
      maxSelected = Math.max(1, Number.parseInt(groupMax || '3', 10) || 3)
    } else if (groupMode === 'required') {
      minSelected = 1
      maxSelected = 1
    }
    await createGroup.mutateAsync({
      menuItemId: item.id,
      name: groupName.trim() || 'Agregados',
      minSelected,
      maxSelected,
    })
    setGroupName('')
    setGroupMode('optional')
    setGroupMax('3')
  }

  const modeNeedsMax = groupMode === 'optional' || groupMode === 'multi'

  const photoBusy = upload.uploading || updateItem.isPending

  return (
    <article
      className="customer-panel-soft customer-reveal rounded-[30px] p-3"
      style={{ animationDelay: `${Math.min(index * 35, 180)}ms` }}
    >
      <div className="flex gap-3">
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
            {item.description || 'Sin descripcion'}
          </p>
          <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-800">
            <Icon name={item.is_available ? 'visibility' : 'visibility_off'} size={14} />
            {item.is_available ? 'Visible' : 'Oculto'}
          </p>
          {upload.error && (
            <p className="mt-2 text-xs font-bold text-red-700">{upload.error}</p>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {groups.map((group) => (
          <ModifierGroupBlock
            key={group.id}
            group={group}
            options={optionsByGroup.get(group.id) ?? []}
          />
        ))}
      </div>

      <form
        className="mt-3 space-y-3 rounded-[22px] bg-white/64 p-4"
        onSubmit={handleCreateGroup}
      >
        <p className="text-xs font-black uppercase tracking-wider text-on-surface-variant">
          Agregar grupo de opciones al plato
        </p>
        <div className="space-y-1.5">
          <Label htmlFor={`group-name-${item.id}`}>Nombre del grupo</Label>
          <Input
            id={`group-name-${item.id}`}
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
            placeholder="Ej. Tamaño, Salsas, Agregados"
            className="rounded-[18px] bg-white/86"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`group-mode-${item.id}`}>¿Cómo elige el cliente?</Label>
          <select
            id={`group-mode-${item.id}`}
            value={groupMode}
            onChange={(event) => setGroupMode(event.target.value as typeof groupMode)}
            className="h-12 w-full rounded-[18px] border border-outline-variant/25 bg-white/86 px-3 text-sm font-semibold"
          >
            <option value="single">Una sola opción · opcional</option>
            <option value="required">Una sola opción · obligatoria</option>
            <option value="optional">Varias opciones · opcional</option>
            <option value="multi">Varias opciones · al menos una</option>
          </select>
        </div>
        {modeNeedsMax && (
          <div className="space-y-1.5">
            <Label htmlFor={`group-max-${item.id}`}>Máximo de opciones que puede elegir</Label>
            <Input
              id={`group-max-${item.id}`}
              value={groupMax}
              onChange={(event) => setGroupMax(event.target.value)}
              inputMode="numeric"
              placeholder="3"
              className="rounded-[18px] bg-white/86"
            />
          </div>
        )}
        <Button
          type="submit"
          className="w-full rounded-[20px]"
          disabled={createGroup.isPending || !groupName.trim()}
        >
          <Icon
            name={createGroup.isPending ? 'progress_activity' : 'add'}
            className={createGroup.isPending ? 'animate-spin' : undefined}
          />
          Crear grupo
        </Button>
      </form>
    </article>
  )
}

function ModifierGroupBlock({ group, options }: { group: MenuGroup; options: MenuOption[] }) {
  const createOption = useCreateBusinessModifierOption()
  const [optName, setOptName] = useState('')
  const [optPrice, setOptPrice] = useState('0')

  async function handleAddOption(event: React.FormEvent) {
    event.preventDefault()
    if (!optName.trim()) return
    await createOption.mutateAsync({
      groupId: group.id,
      name: optName.trim(),
      priceDelta: Number(optPrice || 0),
    })
    setOptName('')
    setOptPrice('0')
  }

  const limitsLabel =
    group.min_selected === 0 && group.max_selected === 1
      ? 'Opcional · elige 1'
      : group.min_selected === group.max_selected
        ? `Elige ${group.max_selected}`
        : `Min ${group.min_selected} · Max ${group.max_selected}`

  return (
    <div className="rounded-[22px] bg-white/64 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="font-black">{group.name}</p>
        <span className="rounded-full bg-primary-fixed/70 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-on-primary-fixed">
          {limitsLabel}
        </span>
      </div>
      {options.length > 0 ? (
        <ul className="space-y-1 text-sm font-semibold text-on-surface-variant">
          {options.map((option) => (
            <li key={option.id} className="flex items-center justify-between">
              <span>{option.name}</span>
              <span className="font-black text-primary-container">
                +S/ {Number(option.price_delta).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm font-semibold text-on-surface-variant/70">Sin opciones todavía</p>
      )}
      <form className="space-y-2 pt-2" onSubmit={handleAddOption}>
        <p className="text-xs font-black uppercase tracking-wider text-on-surface-variant">
          Agregar opción a este grupo
        </p>
        <div className="grid gap-2 md:grid-cols-[1fr_140px_auto]">
          <div className="space-y-1">
            <Label htmlFor={`opt-name-${group.id}`} className="text-[11px]">
              Opción
            </Label>
            <Input
              id={`opt-name-${group.id}`}
              value={optName}
              onChange={(event) => setOptName(event.target.value)}
              placeholder="Ej. Mayonesa, Doble queso"
              className="rounded-[18px] bg-white/86"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`opt-price-${group.id}`} className="text-[11px]">
              Precio extra (S/)
            </Label>
            <Input
              id={`opt-price-${group.id}`}
              value={optPrice}
              onChange={(event) => setOptPrice(event.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              className="rounded-[18px] bg-white/86"
            />
          </div>
          <div className="flex items-end">
            <Button
              type="submit"
              size="md"
              className="w-full rounded-[18px]"
              disabled={createOption.isPending || !optName.trim()}
            >
              <Icon
                name={createOption.isPending ? 'progress_activity' : 'add'}
                className={createOption.isPending ? 'animate-spin' : undefined}
              />
              Agregar
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
