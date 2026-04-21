'use client'
import { EmptyState, OrderCard, Skeleton, cn } from '@tindivo/ui'
import { useState } from 'react'
import { useRestaurantProfile } from '@/features/restaurante/perfil/hooks/use-restaurant-profile'
import { useRestaurantHistory } from '../hooks/use-restaurant-history'

const PREP_MINS: Record<string, number> = { fast: 10, normal: 15, slow: 20 }
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

export function RestaurantHistory() {
  const [filter, setFilter] = useState<Filter>('all')
  const profile = useRestaurantProfile()
  const { data, isLoading } = useRestaurantHistory(filter === 'all' ? undefined : filter)

  const accent = profile.data?.accentColor ?? 'ab3500'

  return (
    <div className="space-y-5">
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
      ) : (data?.items ?? []).length === 0 ? (
        <EmptyState
          icon="history"
          title="Sin pedidos aún"
          description="Los pedidos completados o cancelados de hoy aparecerán aquí."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {(data?.items ?? []).map((order: any) => (
            <li key={order.id}>
              <OrderCard
                shortId={order.short_id}
                restaurantName={profile.data?.name ?? 'Mi restaurante'}
                restaurantAccentColor={accent}
                status={order.status}
                orderAmount={Number(order.order_amount)}
                paymentLabel={paymentLabel(order.payment_status)}
                prepTimeMinutes={PREP_MINS[order.prep_time_option]}
                driverName={order.drivers?.full_name ?? null}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
