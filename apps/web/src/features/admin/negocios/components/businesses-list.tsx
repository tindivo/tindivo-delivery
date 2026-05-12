'use client'
import { useAdminRestaurants } from '@/features/admin/restaurants/hooks/use-admin-restaurants'
import { Icon, Skeleton } from '@tindivo/ui'
import { useMemo, useState } from 'react'
import { useAdminBusinesses, useUpdateAdminBusiness } from '../hooks/use-admin-businesses'

export function BusinessesList() {
  const businesses = useAdminBusinesses()
  const restaurants = useAdminRestaurants()

  const restaurantOptions = useMemo(
    () => restaurants.data?.items ?? [],
    [restaurants.data?.items],
  )
  const items = businesses.data?.items ?? []
  const isLoading = businesses.isLoading || restaurants.isLoading

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="bleed-text font-black text-2xl md:text-3xl text-on-surface">Negocios</h1>
          <p className="text-on-surface-variant text-xs md:text-sm mt-1">
            Negocios registrados en tindivo.com. Enlaza un negocio a un restaurante de delivery
            para que sus clientes puedan ordenar pedidos.
          </p>
        </div>
      </header>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl p-10 text-center bg-surface-container-lowest border border-outline-variant/15">
          <Icon name="storefront" size={32} className="text-on-surface-variant/60" />
          <p className="mt-3 text-on-surface-variant">
            Aún no hay negocios registrados en tindivo.com.
          </p>
          <p className="mt-1 text-xs text-on-surface-variant/70">
            Los dueños se registran desde tindivo.com → "Crear cuenta" → "Negocio".
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/15 overflow-x-auto">
          <table className="w-full text-sm min-w-[920px]">
            <thead className="bg-surface-container-low text-xs uppercase tracking-wider text-on-surface-variant">
              <tr>
                <th className="text-left px-4 py-3">Negocio</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Teléfono</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-left px-4 py-3">Delivery enlazado</th>
                <th className="text-left px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((b) => (
                <BusinessRow key={b.id} business={b} restaurants={restaurantOptions} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

type BusinessRowProps = {
  business: NonNullable<ReturnType<typeof useAdminBusinesses>['data']>['items'][number]
  restaurants: NonNullable<ReturnType<typeof useAdminRestaurants>['data']>['items']
}

function BusinessRow({ business, restaurants }: BusinessRowProps) {
  const update = useUpdateAdminBusiness(business.id)
  const [selected, setSelected] = useState<string>(business.delivery_restaurant_id ?? '')

  const linked = business.delivery_restaurant_id !== null
  const dirty = selected !== (business.delivery_restaurant_id ?? '')

  async function save() {
    await update.mutateAsync({
      deliveryRestaurantId: selected === '' ? null : selected,
    })
  }

  async function toggleVerified() {
    await update.mutateAsync({ isVerified: !business.is_verified })
  }

  async function toggleActive() {
    await update.mutateAsync({ isActive: !business.is_active })
  }

  return (
    <tr
      className={`border-t border-outline-variant/10 ${
        !business.is_active ? 'opacity-60' : ''
      }`}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-block w-3 h-3 rounded-sm border border-black/10"
            style={{ background: `#${business.accent_color}` }}
          />
          <span className="font-bold">{business.name}</span>
          {business.is_verified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
              <Icon name="verified" size={10} filled />
              Verificado
            </span>
          )}
        </div>
        <p className="text-xs text-on-surface-variant mt-0.5">{business.address}</p>
      </td>
      <td className="px-4 py-3 text-xs text-on-surface-variant">{business.users?.email ?? '—'}</td>
      <td className="px-4 py-3 font-mono text-xs">+51 {business.phone}</td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1 text-xs">
          <button
            type="button"
            onClick={toggleActive}
            disabled={update.isPending}
            className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              business.is_active
                ? 'bg-emerald-50 text-emerald-800'
                : 'bg-surface-container text-on-surface-variant'
            }`}
          >
            <Icon name={business.is_active ? 'check_circle' : 'pause'} size={10} filled />
            {business.is_active ? 'Activo' : 'Inactivo'}
          </button>
          <span className="text-[10px] text-on-surface-variant/70">
            {business.is_published ? 'Publicado' : 'Oculto'}
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        {linked && business.restaurants ? (
          <div className="space-y-1">
            <p className="font-bold text-xs">{business.restaurants.name}</p>
            <p className="text-[10px] text-on-surface-variant">
              {business.restaurants.is_active ? 'Restaurante activo' : 'Restaurante inactivo'}
            </p>
          </div>
        ) : (
          <span className="text-xs text-on-surface-variant/70">Sin delivery</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              disabled={update.isPending}
              className="h-9 rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-2 text-xs min-w-[180px]"
            >
              <option value="">— Sin delivery —</option>
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={save}
              disabled={!dirty || update.isPending}
              className="inline-flex items-center gap-1 rounded-lg bg-primary text-on-primary px-3 py-1.5 text-xs font-bold disabled:opacity-40"
            >
              <Icon
                name={update.isPending ? 'progress_activity' : 'link'}
                size={14}
                className={update.isPending ? 'animate-spin' : undefined}
              />
              {linked ? (selected === '' ? 'Desenlazar' : 'Reenlazar') : 'Enlazar'}
            </button>
          </div>
          <button
            type="button"
            onClick={toggleVerified}
            disabled={update.isPending}
            className="inline-flex w-fit items-center gap-1 text-xs text-primary hover:underline"
          >
            <Icon name="verified" size={12} filled />
            {business.is_verified ? 'Quitar verificación' : 'Marcar verificado'}
          </button>
        </div>
      </td>
    </tr>
  )
}
