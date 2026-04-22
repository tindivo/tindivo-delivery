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
import { YapeQrCard } from './yape-qr-card'

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
        right={
          <IconButton
            variant="ghost"
            onClick={() => router.push('/motorizado')}
            aria-label="Ir al inicio"
          >
            <Icon name="home" />
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

        {/* Breakdown de cobro — qué pagar, con qué paga el cliente y vuelto a dar */}
        {Number(raw.order_amount) > 0 && (
          <PaymentBreakdown
            amount={Number(raw.order_amount)}
            paymentStatus={raw.payment_status}
            clientPaysWith={raw.client_pays_with != null ? Number(raw.client_pays_with) : null}
            changeToGive={raw.change_to_give != null ? Number(raw.change_to_give) : null}
          />
        )}

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

        {/* QR Yape — mostrar al cliente cuando se va a entregar y el pago es Yape pendiente */}
        {status === 'picked_up' && raw.payment_status === 'pending_yape' && (
          <YapeQrCard
            qrUrl={restaurant.qr_url ?? null}
            yapeNumber={restaurant.yape_number ?? null}
            amount={Number(raw.order_amount)}
            restaurantName={restaurant.name ?? 'Restaurante'}
          />
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

type PaymentBreakdownProps = {
  amount: number
  paymentStatus: string
  clientPaysWith: number | null
  changeToGive: number | null
}

/**
 * Desglose de cobro — HU-D-015: el driver necesita saber rápidamente
 * cuánto cobrar, con qué billete pagará el cliente, y cuánto vuelto debe
 * dar. El dato de "vuelto" se destaca porque es la información operativa
 * crítica (el driver debe llevar el cambio ya en la bolsa).
 */
function PaymentBreakdown({
  amount,
  paymentStatus,
  clientPaysWith,
  changeToGive,
}: PaymentBreakdownProps) {
  if (paymentStatus === 'prepaid') {
    return (
      <section
        className="rounded-[24px] p-5 border border-emerald-200/60"
        style={{ background: 'rgba(16, 185, 129, 0.08)' }}
      >
        <div className="flex items-center gap-3">
          <span
            className="inline-flex items-center justify-center w-11 h-11 rounded-xl"
            style={{
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              color: '#ffffff',
            }}
          >
            <Icon name="verified" size={22} filled />
          </span>
          <div>
            <div className="text-[10px] font-bold tracking-[0.22em] uppercase text-emerald-800">
              Ya pagó
            </div>
            <div className="font-bold text-emerald-900">
              No cobres nada al cliente — solo entregar.
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (paymentStatus === 'pending_yape') {
    return (
      <section className="rounded-[24px] p-5 bg-surface-container-lowest border border-outline-variant/15">
        <div className="text-[10px] font-bold tracking-[0.22em] uppercase text-on-surface-variant mb-3">
          Cobro al cliente
        </div>
        <div className="flex items-end justify-between">
          <div>
            <div className="bleed-text text-3xl font-black text-on-surface">
              S/ {amount.toFixed(2)}
            </div>
            <div className="text-xs text-on-surface-variant mt-1">
              Cobrar por Yape — el cliente escanea el QR abajo
            </div>
          </div>
          <Icon name="qr_code_2" size={28} className="text-on-surface-variant/40" filled />
        </div>
      </section>
    )
  }

  // pending_cash: desglose completo con vuelto
  const hasChange = clientPaysWith != null && changeToGive != null && changeToGive > 0

  return (
    <section className="rounded-[24px] p-5 bg-surface-container-lowest border border-outline-variant/15 shadow-[0_4px_20px_rgba(171,53,0,0.04)] space-y-4">
      <div className="text-[10px] font-bold tracking-[0.22em] uppercase text-on-surface-variant">
        Cobro en efectivo
      </div>

      {/* Grid: monto pedido · paga con */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className="rounded-2xl p-4"
          style={{ background: 'rgba(255, 107, 53, 0.08)' }}
        >
          <div className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant">
            Precio
          </div>
          <div className="bleed-text text-2xl font-black mt-1 text-on-surface font-mono tabular-nums">
            S/ {amount.toFixed(2)}
          </div>
          <div className="text-[10px] text-on-surface-variant mt-0.5">lo que debe pagar</div>
        </div>
        {clientPaysWith != null ? (
          <div
            className="rounded-2xl p-4"
            style={{ background: 'rgba(59, 130, 246, 0.08)' }}
          >
            <div className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant">
              Paga con
            </div>
            <div
              className="bleed-text text-2xl font-black mt-1 font-mono tabular-nums"
              style={{ color: '#1E40AF' }}
            >
              S/ {clientPaysWith.toFixed(2)}
            </div>
            <div className="text-[10px] text-on-surface-variant mt-0.5">el billete del cliente</div>
          </div>
        ) : (
          <div className="rounded-2xl p-4 bg-surface-container">
            <div className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant">
              Paga con
            </div>
            <div className="font-bold text-sm mt-2 text-on-surface-variant">—</div>
            <div className="text-[10px] text-on-surface-variant/70 mt-0.5">
              no se especificó
            </div>
          </div>
        )}
      </div>

      {/* Vuelto destacado */}
      {hasChange ? (
        <div
          className="relative overflow-hidden rounded-2xl p-4"
          style={{
            background: 'linear-gradient(135deg, #065F46 0%, #10B981 100%)',
            color: '#ffffff',
            boxShadow: '0 12px 28px -10px rgba(5, 150, 105, 0.45)',
          }}
        >
          <div
            aria-hidden="true"
            className="absolute -top-8 -right-8 w-28 h-28 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(255,255,255,0.22) 0%, transparent 60%)',
            }}
          />
          <div className="relative flex items-center gap-3">
            <span
              className="inline-flex items-center justify-center w-11 h-11 rounded-xl"
              style={{ background: 'rgba(255, 255, 255, 0.2)' }}
            >
              <Icon name="shopping_bag" size={22} filled />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold tracking-[0.22em] uppercase opacity-85">
                Vuelto a dar
              </div>
              <div
                className="bleed-text text-3xl font-black font-mono tabular-nums leading-tight"
                style={{ letterSpacing: '-0.02em' }}
              >
                S/ {changeToGive.toFixed(2)}
              </div>
              <div className="text-[11px] opacity-90 mt-0.5">
                debe ir ya en la bolsa
              </div>
            </div>
          </div>
        </div>
      ) : clientPaysWith != null && changeToGive != null ? (
        <div
          className="rounded-2xl p-3 text-center text-sm font-semibold"
          style={{
            background: 'rgba(16, 185, 129, 0.1)',
            color: '#065F46',
            border: '1px solid rgba(16, 185, 129, 0.25)',
          }}
        >
          Sin vuelto · paga justo S/ {amount.toFixed(2)}
        </div>
      ) : (
        <div className="text-xs text-on-surface-variant text-center">
          Confirma con el cliente cuánto pagará al recibir.
        </div>
      )}
    </section>
  )
}
