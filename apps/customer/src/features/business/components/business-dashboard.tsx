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
  useUpdateBusinessProfile,
} from '../hooks/use-business'
import { useUploadBusinessImage } from '../hooks/use-upload-business-image'

export function BusinessDashboard() {
  const router = useRouter()
  const { session, loading, logout } = useCustomerAuth()
  const profile = useBusinessProfile()
  const menu = useBusinessMenu()
  const updateProfile = useUpdateBusinessProfile()
  const createCategory = useCreateBusinessCategory()
  const createItem = useCreateBusinessItem()
  const createGroup = useCreateBusinessModifierGroup()
  const createOption = useCreateBusinessModifierOption()
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
  const [modifierItemId, setModifierItemId] = useState('')
  const [modifierGroupName, setModifierGroupName] = useState('')
  const [modifierOptionName, setModifierOptionName] = useState('')
  const [modifierOptionPrice, setModifierOptionPrice] = useState('0')

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
                <article
                  key={item.id}
                  className="customer-panel-soft customer-reveal rounded-[30px] p-3"
                  style={{ animationDelay: `${Math.min(index * 35, 180)}ms` }}
                >
                  <div className="flex gap-3">
                    <span className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[24px] bg-surface-container">
                      {item.image_url ? (
                        <img src={item.image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Icon name="restaurant" />
                      )}
                    </span>
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
                        <Icon
                          name={item.is_available ? 'visibility' : 'visibility_off'}
                          size={14}
                        />
                        {item.is_available ? 'Visible' : 'Oculto'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    {(groupsByItem.get(item.id) ?? []).map((group) => (
                      <div key={group.id} className="rounded-[22px] bg-white/64 p-3">
                        <p className="font-black">{group.name}</p>
                        <p className="mt-1 text-sm font-semibold text-on-surface-variant">
                          {(optionsByGroup.get(group.id) ?? [])
                            .map(
                              (option) =>
                                `${option.name} +S/ ${Number(option.price_delta).toFixed(2)}`,
                            )
                            .join(' / ') || 'Sin opciones'}
                        </p>
                      </div>
                    ))}
                  </div>

                  <form
                    className="mt-3 grid gap-2 md:grid-cols-[1fr_1fr_110px_auto]"
                    onSubmit={async (event) => {
                      event.preventDefault()
                      const group = await createGroup.mutateAsync({
                        menuItemId: item.id,
                        name: modifierGroupName.trim() || 'Agregados',
                        minSelected: 0,
                        maxSelected: 3,
                      })
                      setModifierItemId(item.id)
                      if (modifierOptionName.trim()) {
                        await createOption.mutateAsync({
                          groupId: group.id,
                          name: modifierOptionName.trim(),
                          priceDelta: Number(modifierOptionPrice || 0),
                        })
                      }
                      setModifierGroupName('')
                      setModifierOptionName('')
                      setModifierOptionPrice('0')
                    }}
                  >
                    <Input
                      value={modifierItemId === item.id ? modifierGroupName : ''}
                      onFocus={() => setModifierItemId(item.id)}
                      onChange={(event) => {
                        setModifierItemId(item.id)
                        setModifierGroupName(event.target.value)
                      }}
                      placeholder="Grupo"
                      className="rounded-[18px] bg-white/86"
                    />
                    <Input
                      value={modifierItemId === item.id ? modifierOptionName : ''}
                      onFocus={() => setModifierItemId(item.id)}
                      onChange={(event) => {
                        setModifierItemId(item.id)
                        setModifierOptionName(event.target.value)
                      }}
                      placeholder="Opcion"
                      className="rounded-[18px] bg-white/86"
                    />
                    <Input
                      value={modifierItemId === item.id ? modifierOptionPrice : '0'}
                      onFocus={() => setModifierItemId(item.id)}
                      onChange={(event) => {
                        setModifierItemId(item.id)
                        setModifierOptionPrice(event.target.value)
                      }}
                      inputMode="decimal"
                      className="rounded-[18px] bg-white/86"
                    />
                    <Button type="submit" size="md" className="rounded-[18px]">
                      <Icon name="add" />
                    </Button>
                  </form>
                </article>
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
