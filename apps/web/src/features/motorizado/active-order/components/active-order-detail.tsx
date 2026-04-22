'use client'
import {
  BottomActionBar,
  Button,
  ColorDot,
  ElapsedTimer,
  GlassTopBar,
  Icon,
  IconButton,
  StatusChip,
  Timeline,
  UrgencyBadge,
  type TimelineStep,
} from '@tindivo/ui'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import { useNow } from '@/shared/hooks/use-now'
import { useOrderDetail } from '../hooks/use-order-detail'
import { useMarkArrived } from '../hooks/use-mark-arrived'
import { useMarkDelivered } from '../hooks/use-mark-delivered'

type Props = { orderId: string }

export function ActiveOrderDetail({ orderId }: Props) {
  const router = useRouter()
  const { data: order, isLoading } = useOrderDetail(orderId)
  const arrived = useMarkArrived(orderId)
  const delivered = useMarkDelivered(orderId)
  const now = useNow(1_000)

  const steps = useMemo<TimelineStep[]>(() => {
    if (!order) return []
    const s = order.status as string
    return [
      {
        key: 'accepted',
        label: 'Aceptado',
        icon: 'check',
        done: true,
      },
      {
        key: 'heading',
        label: 'En camino al local',
        icon: 'two_wheeler',
        done: ['waiting_at_restaurant', 'picked_up', 'delivered'].includes(s),
        current: s === 'heading_to_restaurant',
      },
      {
        key: 'at_restaurant',
        label: 'Recogiendo pedido',
        icon: 'restaurant',
        done: ['picked_up', 'delivered'].includes(s),
        current: s === 'waiting_at_restaurant',
      },
      {
        key: 'picked_up',
        label: 'En camino al cliente',
        icon: 'delivery_dining',
        done: s === 'delivered',
        current: s === 'picked_up',
      },
      {
        key: 'delivered',
        label: 'Entregado',
        icon: 'check_circle',
        done: s === 'delivered',
      },
    ]
  }, [order])

  if (isLoading || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Icon name="progress_activity" size={36} className="animate-spin text-primary" />
      </div>
    )
  }

  // biome-ignore lint/suspicious/noExplicitAny: payload dinámico con columnas anidadas (restaurants, payment, etc.)
  const raw = order as any
  const status = raw.status as string
  const restaurant = raw.restaurants ?? {}

  return (
    <div className="min-h-screen" style={{ paddingBottom: 'calc(160px + env(safe-area-inset-bottom))' }}>
      <GlassTopBar
        title="PEDIDO"
        subtitle="Motorizado"
        left={
          <IconButton variant="ghost" onClick={() => router.back()} aria-label="Volver">
            <Icon name="arrow_back" />
          </IconButton>
        }
      />

      <main className="pt-24 px-4 max-w-md mx-auto space-y-5">
        {/* Header del pedido */}
        <section className="bg-surface-container-lowest rounded-lg p-5 border border-outline-variant/15 shadow-[0_4px_20px_rgba(171,53,0,0.04)]">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ColorDot color={restaurant.accent_color ?? 'ab3500'} />
                <h1 className="font-black text-lg text-on-surface">{restaurant.name}</h1>
              </div>
              <p className="text-xs text-on-surface-variant font-mono">#{raw.short_id}</p>
            </div>
            <StatusChip status={status as never} />
          </div>
          <div className="mt-4 flex items-center gap-4 text-sm">
            {Number(raw.order_amount) === 0 ? (
              <div
                className="flex items-center gap-1.5 font-bold"
                style={{ color: '#059669' }}
              >
                <Icon name="verified" size={16} filled />
                <span>No cobrar · Solo entregar</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1.5 text-on-surface-variant">
                  <Icon name="payments" size={16} />
                  <span className="font-semibold text-on-surface">
                    S/ {Number(raw.order_amount).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-on-surface-variant">
                  <Icon name="receipt" size={16} />
                  <span>{paymentLabel(raw.payment_status)}</span>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Cronómetros: tiempo en cola + countdown si aplica */}
        <section className="flex items-stretch gap-2">
          {raw.created_at && (
            <ElapsedTimer createdAt={raw.created_at} now={now} withLabel className="flex-1" />
          )}
          {raw.estimated_ready_at && ['heading_to_restaurant', 'waiting_at_restaurant'].includes(status) && (
            <UrgencyBadge
              estimatedReadyAt={raw.estimated_ready_at}
              now={now}
              variant="hero"
              className="flex-1"
            />
          )}
        </section>

        {/* Timeline */}
        <section className="bg-surface-container-lowest rounded-lg p-5 border border-outline-variant/15 shadow-[0_4px_20px_rgba(171,53,0,0.04)]">
          <Timeline steps={steps} />
        </section>

        {/* Restaurante: dirección + navegar */}
        {(status === 'heading_to_restaurant' || status === 'waiting_at_restaurant') && (
          <section className="bg-surface-container-lowest rounded-lg p-5 border border-outline-variant/15 shadow-[0_4px_20px_rgba(171,53,0,0.04)] space-y-3">
            <h3 className="text-xs font-bold tracking-widest uppercase text-on-surface-variant">
              Recoger pedido en
            </h3>
            <p className="font-semibold">{restaurant.address}</p>
            {restaurant.phone && (
              <a
                href={`tel:+51${restaurant.phone}`}
                className="inline-flex items-center gap-2 text-primary-container font-semibold text-sm"
              >
                <Icon name="call" size={16} />
                Llamar al local
              </a>
            )}
          </section>
        )}

        {/* Cliente: dirección + navegar */}
        {status === 'picked_up' && raw.delivery_maps_url && (
          <section className="bg-surface-container-lowest rounded-lg p-5 border border-outline-variant/15 shadow-[0_4px_20px_rgba(171,53,0,0.04)] space-y-3">
            <h3 className="text-xs font-bold tracking-widest uppercase text-on-surface-variant">
              Entregar al cliente
            </h3>
            {raw.client_phone && (
              <a
                href={`tel:+51${raw.client_phone}`}
                className="inline-flex items-center gap-2 text-primary-container font-semibold"
              >
                <Icon name="call" size={18} />
                Llamar: +51 {raw.client_phone}
              </a>
            )}
          </section>
        )}
      </main>

      <BottomActionBar>
        {status === 'heading_to_restaurant' && (
            <>
              <Link
                href={buildRestaurantNavUrl(restaurant)}
                target="_blank"
                className="w-full inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-surface-container-lowest border border-outline-variant/40 text-on-surface font-bold tracking-wide transition-all duration-300 active:scale-95"
              >
                <Icon name="navigation" size={20} filled />
                Abrir en Google Maps
              </Link>
              <Button
                size="lg"
                className="w-full"
                disabled={arrived.isPending}
                onClick={() => arrived.mutate()}
              >
                <Icon name="check" />
                Llegué al local
              </Button>
            </>
          )}

          {status === 'waiting_at_restaurant' && (
            <Link
              href={`/motorizado/pedidos/${orderId}/pickup`}
              className="w-full inline-flex items-center justify-center gap-2 h-14 px-8 rounded-xl bg-primary-container text-on-primary font-bold tracking-wide text-lg shadow-[0_4px_20px_rgba(255,107,53,0.3)] transition-all duration-300 active:scale-95"
            >
              <Icon name="shopping_bag" size={22} filled />
              Recibí el pedido
            </Link>
          )}

          {status === 'picked_up' && raw.delivery_maps_url && (
            <>
              <a
                href={raw.delivery_maps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-surface-container-lowest border border-outline-variant/40 text-on-surface font-bold tracking-wide transition-all duration-300 active:scale-95"
              >
                <Icon name="navigation" size={20} filled />
                Abrir en Google Maps
              </a>
              <Button
                size="lg"
                variant="success"
                className="w-full"
                disabled={delivered.isPending}
                onClick={() => {
                  if (confirm('¿Confirmas que entregaste el pedido?')) delivered.mutate()
                }}
              >
                <Icon name="check_circle" filled />
                Pedido entregado
              </Button>
            </>
          )}
      </BottomActionBar>
    </div>
  )
}

function paymentLabel(status: string): string {
  switch (status) {
    case 'prepaid':
      return 'Pagado'
    case 'pending_yape':
      return 'Cobrar Yape'
    case 'pending_cash':
      return 'Cobrar efectivo'
    default:
      return status
  }
}

function buildRestaurantNavUrl(restaurant: { address?: string }): string {
  if (!restaurant.address) return '#'
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(restaurant.address)}&travelmode=driving`
}
