'use client'
import { Icon, Skeleton } from '@tindivo/ui'
import { useState } from 'react'
import { useAdminBusinesses, useUpdateAdminBusiness } from '../hooks/use-admin-businesses'

export function BusinessesList() {
  const businesses = useAdminBusinesses()
  const items = businesses.data?.items ?? []
  const isLoading = businesses.isLoading

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="bleed-text font-black text-2xl md:text-3xl text-on-surface">Negocios</h1>
          <p className="text-on-surface-variant text-xs md:text-sm mt-1">
            Locales publicados en tindivo.com. Habilita delivery con un click para que el dueño
            ingrese a delivery.tindivo.com con las mismas credenciales.
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
        <div className="rounded-3xl p-10 text-center bg-surface-container-lowest border border-outline-variant/15">
          <Icon name="storefront" size={32} className="text-on-surface-variant/60" />
          <p className="mt-3 text-on-surface-variant">
            Aún no hay negocios registrados en tindivo.com.
          </p>
          <p className="mt-1 text-xs text-on-surface-variant/70">
            Los dueños se registran desde tindivo.com → "Crear cuenta" → "Negocio".
          </p>
        </div>
      ) : (
        <div className="rounded-3xl bg-surface-container-lowest border border-outline-variant/15 overflow-x-auto">
          <table className="w-full text-sm min-w-[920px]">
            <thead className="bg-surface-container-low text-xs uppercase tracking-wider text-on-surface-variant">
              <tr>
                <th className="text-left px-4 py-3">Negocio</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Teléfono</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-left px-4 py-3">Delivery</th>
                <th className="text-left px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((b) => (
                <BusinessRow key={b.id} business={b} />
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
}

function BusinessRow({ business }: BusinessRowProps) {
  const update = useUpdateAdminBusiness(business.id)
  const [enableModalOpen, setEnableModalOpen] = useState(false)

  async function toggleVerified() {
    await update.mutateAsync({ isVerified: !business.is_verified })
  }

  async function toggleActive() {
    await update.mutateAsync({ isActive: !business.is_active })
  }

  async function togglePublished() {
    await update.mutateAsync({ isMarketplacePublished: !business.is_marketplace_published })
  }

  return (
    <>
      <tr
        className={`border-t border-outline-variant/10 ${!business.is_active ? 'opacity-60' : ''}`}
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
        <td className="px-4 py-3 text-xs text-on-surface-variant">
          {business.users?.email ?? '—'}
        </td>
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
            <button
              type="button"
              onClick={togglePublished}
              disabled={update.isPending}
              className="inline-flex w-fit items-center gap-1 text-[10px] uppercase tracking-wider text-on-surface-variant/80 hover:text-on-surface"
            >
              <Icon
                name={business.is_marketplace_published ? 'visibility' : 'visibility_off'}
                size={11}
              />
              {business.is_marketplace_published ? 'Publicado' : 'Oculto'}
            </button>
          </div>
        </td>
        <td className="px-4 py-3">
          {business.is_delivery_enabled ? (
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                <Icon name="delivery_dining" size={10} filled />
                Delivery activo
              </span>
              <p className="text-[10px] text-on-surface-variant">
                S/{business.commission_per_order.toFixed(2)} por pedido
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEnableModalOpen(true)}
              disabled={update.isPending}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-primary text-on-primary px-3 py-1.5 text-xs font-bold hover:opacity-90 disabled:opacity-40"
            >
              <Icon name="delivery_dining" size={14} />
              Habilitar delivery
            </button>
          )}
        </td>
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={toggleVerified}
            disabled={update.isPending}
            className="inline-flex w-fit items-center gap-1 text-xs text-primary hover:underline"
          >
            <Icon name="verified" size={12} filled />
            {business.is_verified ? 'Quitar verificación' : 'Marcar verificado'}
          </button>
        </td>
      </tr>
      {enableModalOpen && (
        <EnableDeliveryModal
          businessName={business.name}
          isPending={update.isPending}
          onConfirm={async (commission) => {
            await update.mutateAsync({
              isDeliveryEnabled: true,
              commissionPerOrder: commission,
            })
            setEnableModalOpen(false)
          }}
          onCancel={() => setEnableModalOpen(false)}
        />
      )}
    </>
  )
}

type EnableDeliveryModalProps = {
  businessName: string
  isPending: boolean
  onConfirm: (commission: number) => Promise<void>
  onCancel: () => void
}

function EnableDeliveryModal({
  businessName,
  isPending,
  onConfirm,
  onCancel,
}: EnableDeliveryModalProps) {
  const [commission, setCommission] = useState('3.00')
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    const value = Number.parseFloat(commission)
    if (!Number.isFinite(value) || value < 0 || value > 99.99) {
      setError('Ingresa un valor entre 0 y 99.99')
      return
    }
    setError(null)
    try {
      await onConfirm(value)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo habilitar delivery')
    }
  }

  return (
    <tr>
      <td colSpan={6} className="p-0">
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={onCancel}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onCancel()
          }}
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-3xl bg-surface p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="enable-delivery-title"
          >
            <div className="flex items-start gap-3">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon name="delivery_dining" size={24} filled />
              </span>
              <div className="min-w-0 flex-1">
                <h2
                  id="enable-delivery-title"
                  className="font-black text-lg text-on-surface leading-tight"
                >
                  Habilitar delivery
                </h2>
                <p className="text-sm text-on-surface-variant mt-1">
                  Activa delivery para <span className="font-bold">{businessName}</span>. El dueño
                  podrá ingresar a delivery.tindivo.com con las mismas credenciales.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <label
                htmlFor="commission-input"
                className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant"
              >
                Comisión por pedido (S/)
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-bold text-on-surface-variant">
                  S/
                </span>
                <input
                  id="commission-input"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={99.99}
                  step={0.5}
                  value={commission}
                  onChange={(e) => setCommission(e.target.value)}
                  disabled={isPending}
                  className="h-14 w-full rounded-2xl border border-outline-variant/40 bg-surface-container-lowest pl-12 pr-4 text-lg font-bold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-on-surface-variant/80">
                Es la comisión fija que Tindivo cobra al restaurante por cada pedido entregado.
                Puede editarse después desde "Restaurantes".
              </p>
              {error && (
                <p className="rounded-2xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                  {error}
                </p>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={isPending}
                className="rounded-2xl px-4 py-2.5 text-sm font-bold text-on-surface-variant hover:bg-surface-container disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-primary px-4 py-2.5 text-sm font-bold text-on-primary hover:opacity-90 disabled:opacity-40"
              >
                <Icon
                  name={isPending ? 'progress_activity' : 'check'}
                  size={16}
                  className={isPending ? 'animate-spin' : undefined}
                />
                Habilitar
              </button>
            </div>
          </div>
        </div>
      </td>
    </tr>
  )
}
