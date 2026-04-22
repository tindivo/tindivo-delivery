'use client'
import {
  BottomActionBar,
  Button,
  ColorDot,
  ElapsedTimer,
  GlassTopBar,
  Icon,
  IconButton,
  Skeleton,
  StatusChip,
  Timeline,
  UrgencyBadge,
  type TimelineStep,
} from '@tindivo/ui'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useNow } from '@/shared/hooks/use-now'
import { useCancelRestaurantOrder } from '../hooks/use-cancel-order'
import { useMarkReadyEarly } from '../hooks/use-mark-ready-early'
import { useRequestExtension } from '../hooks/use-request-extension'
import { useRestaurantOrderDetail } from '../hooks/use-restaurant-order-detail'

type Props = { orderId: string }

export function RestaurantOrderDetail({ orderId }: Props) {
  const router = useRouter()
  const { data, isLoading } = useRestaurantOrderDetail(orderId)
  const now = useNow(1_000)
  const cancel = useCancelRestaurantOrder(orderId)
  const extend = useRequestExtension(orderId)
  const readyEarly = useMarkReadyEarly(orderId)
  const [showExtension, setShowExtension] = useState(false)

  // biome-ignore lint/suspicious/noExplicitAny: payload dinámico con columnas anidadas
  const order = data as any
  const status = (order?.status ?? 'waiting_driver') as
    | 'waiting_driver'
    | 'heading_to_restaurant'
    | 'waiting_at_restaurant'
    | 'picked_up'
    | 'delivered'
    | 'cancelled'

  const steps = useMemo<TimelineStep[]>(() => {
    if (!order) return []
    const s = status
    return [
      { key: 'created', label: 'Pedido creado', icon: 'receipt_long', done: true },
      {
        key: 'accepted',
        label: 'Driver asignado',
        icon: 'assignment_ind',
        done: [
          'heading_to_restaurant',
          'waiting_at_restaurant',
          'picked_up',
          'delivered',
        ].includes(s),
        current: s === 'waiting_driver',
      },
      {
        key: 'heading',
        label: 'En camino a recoger',
        icon: 'two_wheeler',
        done: ['waiting_at_restaurant', 'picked_up', 'delivered'].includes(s),
        current: s === 'heading_to_restaurant',
      },
      {
        key: 'picked_up',
        label: 'Con el pedido',
        icon: 'shopping_bag',
        done: ['picked_up', 'delivered'].includes(s),
        current: s === 'waiting_at_restaurant',
      },
      {
        key: 'delivered',
        label: 'Entregado al cliente',
        icon: 'check_circle',
        done: s === 'delivered',
        current: s === 'picked_up',
      },
    ]
  }, [order, status])

  if (isLoading || !order) {
    return (
      <div className="min-h-screen">
        <GlassTopBar
          title="PEDIDO"
          subtitle="Restaurante"
          left={
            <IconButton variant="ghost" onClick={() => router.back()} aria-label="Volver">
              <Icon name="arrow_back" />
            </IconButton>
          }
        />
        <main className="pt-24 px-4 max-w-md mx-auto space-y-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-60" />
        </main>
      </div>
    )
  }

  const driver = order.drivers ?? null
  const canCancel = status === 'waiting_driver' || status === 'heading_to_restaurant'
  const canExtend =
    (status === 'waiting_driver' || status === 'heading_to_restaurant') && !order.extension_used
  const canReadyEarly = status === 'waiting_driver' && !order.ready_early_used
  const isActive = !['delivered', 'cancelled'].includes(status)
  const showUrgency = status === 'waiting_driver' && order.estimated_ready_at

  return (
    <div
      className="min-h-screen"
      style={{ paddingBottom: isActive ? 'calc(160px + env(safe-area-inset-bottom))' : '2rem' }}
    >
      <GlassTopBar
        title="PEDIDO"
        subtitle="Restaurante"
        left={
          <IconButton variant="ghost" onClick={() => router.back()} aria-label="Volver">
            <Icon name="arrow_back" />
          </IconButton>
        }
      />

      <main className="pt-24 px-4 max-w-md mx-auto space-y-4">
        {/* Header del pedido */}
        <section className="bg-surface-container-lowest rounded-[24px] p-5 border border-outline-variant/15 shadow-[0_4px_20px_rgba(171,53,0,0.04)]">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ColorDot color={order.restaurants?.accent_color ?? 'ab3500'} />
                <h1 className="font-black text-base text-on-surface">Mi pedido</h1>
              </div>
              <p className="text-xs text-on-surface-variant font-mono">#{order.short_id}</p>
            </div>
            <StatusChip status={status} />
          </div>
          <div className="mt-4 flex items-center gap-4 text-sm">
            {Number(order.order_amount) === 0 ? (
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
                    S/ {Number(order.order_amount).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-on-surface-variant">
                  <Icon name="receipt" size={16} />
                  <span>{paymentLabel(order.payment_status)}</span>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Cronómetros: tiempo en cola + countdown si aplica */}
        {!['delivered', 'cancelled'].includes(status) && (
          <section className="flex items-stretch gap-2">
            {order.created_at && (
              <ElapsedTimer createdAt={order.created_at} now={now} withLabel className="flex-1" />
            )}
            {showUrgency && (
              <UrgencyBadge
                estimatedReadyAt={order.estimated_ready_at}
                now={now}
                variant="hero"
                className="flex-1"
              />
            )}
          </section>
        )}

        {/* Timeline */}
        <section className="bg-surface-container-lowest rounded-[24px] p-5 border border-outline-variant/15 shadow-[0_4px_20px_rgba(171,53,0,0.04)]">
          <Timeline steps={steps} />
        </section>

        {/* Driver asignado */}
        {driver && status !== 'waiting_driver' && (
          <section className="rounded-[24px] p-5 bg-surface-container-lowest border border-outline-variant/15 shadow-[0_4px_20px_rgba(171,53,0,0.04)]">
            <div className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant mb-3">
              Tu motorizado
            </div>
            <div className="flex items-center gap-3">
              <span
                className="inline-flex items-center justify-center w-11 h-11 rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%)',
                  color: '#ffffff',
                }}
              >
                <Icon name={vehicleIcon(driver.vehicle_type)} size={22} filled />
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-on-surface truncate">{driver.full_name}</div>
                <div className="text-xs text-on-surface-variant">
                  {vehicleLabel(driver.vehicle_type)}
                </div>
              </div>
              {driver.phone && (
                <a
                  href={`tel:+51${driver.phone}`}
                  className="shrink-0 inline-flex items-center gap-1.5 text-primary-container font-bold text-xs px-3 py-2 rounded-full"
                  style={{ background: 'rgba(255, 107, 53, 0.1)' }}
                >
                  <Icon name="call" size={14} />
                  Llamar
                </a>
              )}
            </div>
          </section>
        )}

        {/* Ayuda / Info para el usuario según estado */}
        {status === 'waiting_driver' && !driver && (
          <div className="rounded-[20px] p-4 bg-amber-50/80 border border-amber-200/60">
            <div className="flex gap-3">
              <Icon name="tips_and_updates" size={20} className="shrink-0 text-amber-700" filled />
              <div className="text-xs text-amber-900 leading-snug">
                Buscando un motorizado disponible. Te avisaremos cuando alguien acepte tu pedido.
              </div>
            </div>
          </div>
        )}
        {status === 'delivered' && (
          <div className="rounded-[20px] p-4 bg-emerald-50/80 border border-emerald-200/60">
            <div className="flex gap-3">
              <Icon name="check_circle" size={20} className="shrink-0 text-emerald-700" filled />
              <div className="text-xs text-emerald-900 leading-snug">
                Pedido entregado correctamente. ¡Gracias!
              </div>
            </div>
          </div>
        )}
        {status === 'cancelled' && (
          <div className="rounded-[20px] p-4 bg-red-50/80 border border-red-200/60">
            <div className="flex gap-3">
              <Icon name="cancel" size={20} className="shrink-0 text-red-700" filled />
              <div className="text-xs text-red-900 leading-snug">
                Este pedido fue cancelado.
                {order.cancel_reason && (
                  <div className="mt-1 font-semibold">Motivo: {order.cancel_reason}</div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom actions — solo si está activo */}
      {isActive && (
        <BottomActionBar>
          <div className="flex flex-col gap-3">
            {canReadyEarly && (
              <Button
                variant="secondary"
                size="lg"
                className="w-full"
                disabled={readyEarly.isPending}
                onClick={() => readyEarly.mutate()}
              >
                <Icon name="bolt" filled />
                Pedido listo antes
              </Button>
            )}
            {canExtend && (
              <div className="flex gap-2">
                {!showExtension ? (
                  <Button
                    variant="secondary"
                    size="lg"
                    className="w-full"
                    onClick={() => setShowExtension(true)}
                  >
                    <Icon name="schedule" />
                    Necesito más tiempo
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="secondary"
                      size="lg"
                      className="flex-1"
                      disabled={extend.isPending}
                      onClick={() => extend.mutate(5, { onSuccess: () => setShowExtension(false) })}
                    >
                      +5 min
                    </Button>
                    <Button
                      variant="secondary"
                      size="lg"
                      className="flex-1"
                      disabled={extend.isPending}
                      onClick={() => extend.mutate(10, { onSuccess: () => setShowExtension(false) })}
                    >
                      +10 min
                    </Button>
                  </>
                )}
              </div>
            )}
            {canCancel && (
              <Button
                variant="destructive"
                size="lg"
                className="w-full"
                disabled={cancel.isPending}
                onClick={() => {
                  const reason = window.prompt(
                    '¿Por qué cancelas el pedido? (mínimo 3 caracteres)',
                  )
                  if (!reason || reason.trim().length < 3) return
                  cancel.mutate(reason.trim())
                }}
              >
                <Icon name="cancel" />
                Cancelar pedido
              </Button>
            )}
          </div>
        </BottomActionBar>
      )}
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

function vehicleIcon(type?: string): string {
  switch (type) {
    case 'moto':
      return 'two_wheeler'
    case 'bicicleta':
      return 'pedal_bike'
    case 'pie':
      return 'directions_walk'
    case 'auto':
      return 'directions_car'
    default:
      return 'two_wheeler'
  }
}

function vehicleLabel(type?: string): string {
  switch (type) {
    case 'moto':
      return 'Moto'
    case 'bicicleta':
      return 'Bicicleta'
    case 'pie':
      return 'A pie'
    case 'auto':
      return 'Auto'
    default:
      return 'Motorizado'
  }
}
