'use client'
import { useRestaurantProfile } from '@/features/restaurante/perfil/hooks/use-restaurant-profile'
import { EmptyState, OrderCard, Skeleton, cn } from '@tindivo/ui'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useRestaurantHistory } from '../hooks/use-restaurant-history'

type Filter = 'all' | 'delivered' | 'cancelled'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'delivered', label: 'Entregados' },
  { value: 'cancelled', label: 'Cancelados' },
]

function paymentLabel(status: string): string {
  switch (status) {
    case 'prepaid':
      return 'Pagado'
    case 'pending_yape':
      return 'Yape'
    case 'pending_cash':
      return 'Efectivo'
    default:
      return status
  }
}

function bandLabel(band: 'near' | 'far' | null | undefined): string | null {
  if (band === 'near') return 'Cerca'
  if (band === 'far') return 'Lejos'
  return null
}

export function RestaurantHistory() {
  const router = useRouter()
  const [filter, setFilter] = useState<Filter>('all')
  const profile = useRestaurantProfile()
  // Siempre traemos el día completo (delivered + cancelled). El filtro pill
  // se aplica en cliente para que el resumen del día (count + comisión total)
  // permanezca estable al cambiar de pestaña — esa métrica es del día, no
  // depende del filtro UI.
  const { data, isLoading } = useRestaurantHistory()

  const accent = profile.data?.accentColor ?? 'ab3500'

  // biome-ignore lint/suspicious/noExplicitAny: payload dinámico con columnas snake_case
  const allItems = (data?.items ?? []) as any[]

  const summary = useMemo(() => {
    const deliveredItems = allItems.filter((o) => o.status === 'delivered')
    const totalCommission = deliveredItems.reduce(
      (sum, o) => sum + Number(o.delivery_fee ?? 0),
      0,
    )
    return { count: deliveredItems.length, totalCommission }
  }, [allItems])

  const visibleItems = useMemo(() => {
    if (filter === 'all') return allItems
    return allItems.filter((o) => o.status === filter)
  }, [allItems, filter])

  return (
    <div className="space-y-5">
      {/* Resumen del día — siempre refleja delivered, no cambia con el filtro */}
      {summary.count > 0 && (
        <section
          className="rounded-2xl p-4 border"
          style={{
            background:
              'linear-gradient(135deg, rgba(255,107,53,0.10) 0%, rgba(255,140,66,0.06) 100%)',
            borderColor: 'rgba(255,107,53,0.25)',
          }}
        >
          <div className="text-[10px] font-bold tracking-[0.22em] uppercase text-on-surface-variant">
            Hoy
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-3">
            <div className="font-black text-2xl text-on-surface">
              {summary.count} {summary.count === 1 ? 'pedido' : 'pedidos'}
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold tracking-wider uppercase text-on-surface-variant">
                Comisión Tindivo
              </div>
              <div className="font-black text-xl text-primary">
                S/ {summary.totalCommission.toFixed(2)}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Filter pills */}
      <div className="flex gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.value
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cn(
                'flex-1 text-[12px] font-bold tracking-wider uppercase px-3 py-2.5 rounded-full transition-all duration-300 active:scale-95',
              )}
              style={{
                background: active
                  ? 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%)'
                  : 'rgba(255, 255, 255, 0.7)',
                color: active ? '#ffffff' : '#594139',
                border: active ? 'none' : '1px solid rgba(225, 191, 181, 0.3)',
                boxShadow: active ? '0 4px 12px rgba(255, 107, 53, 0.35)' : 'none',
              }}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : visibleItems.length === 0 ? (
        <EmptyState
          icon="history"
          title="Sin pedidos aún"
          description="Los pedidos completados o cancelados de hoy aparecerán aquí."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {visibleItems.map((order) => {
            const fee = Number(order.delivery_fee ?? 0)
            const band = bandLabel(order.delivery_distance_band)
            const showCommission = order.status === 'delivered' && fee > 0
            return (
              <li key={order.id} className="space-y-1">
                <OrderCard
                  shortId={order.short_id}
                  clientName={order.client_name ?? null}
                  restaurantName={profile.data?.name ?? 'Mi restaurante'}
                  restaurantAccentColor={accent}
                  status={order.status}
                  orderAmount={Number(order.order_amount)}
                  paymentLabel={paymentLabel(order.payment_status)}
                  prepTimeMinutes={order.prep_minutes}
                  driverName={order.drivers?.full_name ?? null}
                  onClick={() => router.push(`/restaurante/pedidos/${order.id}`)}
                />
                {showCommission ? (
                  <div
                    className="px-4 py-2 rounded-2xl text-xs flex items-center justify-between"
                    style={{
                      background: 'rgba(255,107,53,0.06)',
                      border: '1px solid rgba(255,107,53,0.15)',
                    }}
                  >
                    <span className="text-on-surface-variant font-semibold">
                      Comisión Tindivo
                    </span>
                    <span className="font-mono font-black text-on-surface tabular-nums">
                      S/ {fee.toFixed(2)}
                      {band && (
                        <span className="text-on-surface-variant font-bold"> · {band}</span>
                      )}
                    </span>
                  </div>
                ) : order.status === 'cancelled' ? (
                  <div
                    className="px-4 py-2 rounded-2xl text-[11px] text-on-surface-variant/70 italic"
                    style={{ background: 'rgba(0,0,0,0.02)' }}
                  >
                    Sin comisión (cancelado)
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
