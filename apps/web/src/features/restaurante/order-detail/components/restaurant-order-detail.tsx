'use client'
import { useNow } from '@/shared/hooks/use-now'
import {
  BottomActionBar,
  Button,
  ColorDot,
  GlassTopBar,
  Icon,
  IconButton,
  Skeleton,
  StatusChip,
  Timeline,
  type TimelineStep,
  UrgencyBadge,
} from '@tindivo/ui'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { CustomerOrderItemsSection } from '../../pending-acceptance/components/customer-order-items-section'
import { useCancelRestaurantOrder } from '../hooks/use-cancel-order'
import { useMarkReadyEarly } from '../hooks/use-mark-ready-early'
import { useRequestExtension } from '../hooks/use-request-extension'
import { useRestaurantOrderDetail } from '../hooks/use-restaurant-order-detail'
import { EditOrderSheet } from './edit-order-sheet'

type Props = { orderId: string }

export function RestaurantOrderDetail({ orderId }: Props) {
  const router = useRouter()
  const { data, isLoading } = useRestaurantOrderDetail(orderId)
  const now = useNow(1_000)
  const cancel = useCancelRestaurantOrder(orderId)
  const extend = useRequestExtension(orderId)
  const readyEarly = useMarkReadyEarly(orderId)
  const [showExtension, setShowExtension] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  // biome-ignore lint/suspicious/noExplicitAny: payload dinámico con columnas anidadas
  const order = data as any
  const status = (order?.status ?? 'waiting_driver') as
    | 'pending_acceptance'
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
        done: ['heading_to_restaurant', 'waiting_at_restaurant', 'picked_up', 'delivered'].includes(
          s,
        ),
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
  const canEdit =
    status === 'waiting_driver' ||
    status === 'heading_to_restaurant' ||
    status === 'waiting_at_restaurant'
  const canCancel = status === 'waiting_driver' || status === 'heading_to_restaurant'
  const canExtend =
    (status === 'waiting_driver' || status === 'heading_to_restaurant') && !order.extension_used
  const remainingMinutes = order.estimated_ready_at
    ? (new Date(order.estimated_ready_at).getTime() - now.getTime()) / 60_000
    : 0
  const canReadyEarly =
    ['waiting_driver', 'heading_to_restaurant', 'waiting_at_restaurant'].includes(status) &&
    remainingMinutes > 0
  const isActive = !['delivered', 'cancelled'].includes(status)
  // El countdown del prep_time se muestra durante toda la fase activa hasta que
  // el driver recibe el pedido (después ya no aporta info al restaurante).
  const showCountdown =
    !['picked_up', 'delivered', 'cancelled'].includes(status) && order.estimated_ready_at

  // Deuda con Tindivo por este pedido. `delivery_fee` es el snapshot final tras
  // el pickup (base + recargo si la banda es "lejos"); antes del pickup es
  // provisional. En pedidos cancelados no se cobra comisión.
  const commissionFee = Number(order.delivery_fee ?? 0)
  const commissionBand = (order.delivery_distance_band ?? null) as 'near' | 'far' | null
  const commissionBandLabel =
    commissionBand === 'near' ? 'Cerca' : commissionBand === 'far' ? 'Lejos' : null
  const baseCommission = Number(order.base_commission ?? 0)
  const farSurcharge = Number(order.far_surcharge_amount ?? 0)
  const commissionIsFinal = status === 'delivered'

  return (
    <div
      className="min-h-screen"
      style={{
        // En estado activo el BottomActionBar (≈160px) cubre el fondo;
        // en delivered/cancelled NO se renderiza ese bar pero SIGUE existiendo
        // el BottomNav del layout (≈112px). Sin reservar ese espacio el
        // último card se pinta detrás del nav semi-transparente y los labels
        // del nav se ven cortados.
        paddingBottom: isActive
          ? 'calc(160px + env(safe-area-inset-bottom))'
          : 'calc(112px + env(safe-area-inset-bottom))',
      }}
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
        {/* Header dominante del pedido */}
        <section className="bg-surface-container-lowest rounded-[24px] p-5 border border-outline-variant/15 shadow-[0_4px_20px_rgba(171,53,0,0.04)] space-y-4">
          {/* Fila 1: Cliente y Código */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <ColorDot color={order.restaurants?.accent_color ?? 'ab3500'} />
                <h1 className="font-black text-xl text-on-surface leading-tight truncate">
                  {order.client_name ?? 'Mi pedido'}
                </h1>
              </div>
              <p className="text-xs text-on-surface-variant font-mono">#{order.short_id}</p>
            </div>
            {/* Teléfono */}
            {order.customer_phone && (
              <a
                href={`tel:+51${order.customer_phone}`}
                className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold text-primary px-3 py-1.5 rounded-full bg-primary/10 transition-colors hover:bg-primary/20"
              >
                <Icon name="call" size={14} />
                <span className="hidden sm:inline">Llamar</span>
              </a>
            )}
          </div>

          {/* Fila 2: Dirección destacada */}
          {(order.delivery_address || order.delivery_reference) && (
            <div className="pt-3 border-t border-outline-variant/10 space-y-1">
              <span className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">
                Dirección de entrega
              </span>
              <div className="flex items-start gap-2 text-sm text-on-surface">
                <Icon
                  name="location_on"
                  size={18}
                  className="mt-0.5 flex-shrink-0 text-primary"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-on-surface whitespace-normal break-words">
                    {order.delivery_address ?? order.delivery_reference}
                  </p>
                  {order.delivery_address && order.delivery_reference && (
                    <p className="text-xs text-on-surface-variant mt-0.5 whitespace-normal break-words">
                      {order.delivery_reference}
                    </p>
                  )}
                  {order.delivery_maps_url && (
                    <a
                      href={order.delivery_maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-primary mt-1.5 hover:underline"
                    >
                      <Icon name="map" size={14} />
                      Ver en mapa
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Fila 3: Monto y Estado Grande */}
          <div className="pt-3 border-t border-outline-variant/10 flex items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">
                Monto
              </span>
              {Number(order.order_amount) === 0 ? (
                <div className="flex items-center gap-1 font-black text-emerald-600 text-lg">
                  <Icon name="verified" size={18} filled />
                  <span>No cobrar</span>
                </div>
              ) : (
                <div className="font-black text-2xl text-on-surface tabular-nums">
                  S/ {Number(order.order_amount).toFixed(2)}
                </div>
              )}
              {order.payment_status && (
                <div className="text-xs text-on-surface-variant font-medium mt-0.5">
                  {paymentLabel(order.payment_status)}
                </div>
              )}
            </div>

            {/* Estado grande adaptado a resoluciones */}
            <div className="text-right">
              <span className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase block mb-1">
                Estado
              </span>
              <div className="inline-block">
                {status === 'cancelled' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-red-50 text-red-700 border border-red-200">
                    <Icon name="cancel" size={16} filled />
                    CANCELADO
                  </span>
                )}
                {status === 'delivered' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Icon name="check_circle" size={16} filled />
                    ENTREGADO
                  </span>
                )}
                {status === 'picked_up' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <Icon name="delivery_dining" size={16} filled />
                    EN ENTREGA
                  </span>
                )}
                {!['cancelled', 'delivered', 'picked_up'].includes(status) && (
                  remainingMinutes > 0 ? (
                    <div className="flex flex-col items-end gap-1">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-amber-50 text-amber-800 border border-amber-200 shadow-xs">
                        <Icon name="restaurant" size={14} className="text-amber-600" />
                        EN COCINA
                      </span>
                      {order.estimated_ready_at && (
                        <UrgencyBadge estimatedReadyAt={order.estimated_ready_at} now={now} variant="chip" />
                      )}
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black bg-emerald-500 text-white border border-emerald-600 shadow-md shadow-emerald-500/10 animate-pulse">
                      <Icon name="shopping_bag" size={14} filled />
                      LISTO PARA RECOGER
                    </span>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Pago mixto detalles si aplica */}
          {order.payment_status === 'pending_mixed' && (
            <div className="pt-2 flex items-center gap-2 text-xs">
              <span
                className="px-2.5 py-1 rounded-full font-bold font-mono tabular-nums"
                style={{ background: 'rgba(124, 58, 237, 0.1)', color: '#5B21B6' }}
              >
                Yape S/ {Number(order.yape_amount ?? 0).toFixed(2)}
              </span>
              <span
                className="px-2.5 py-1 rounded-full font-bold font-mono tabular-nums"
                style={{ background: 'rgba(255, 107, 53, 0.1)', color: '#9A3412' }}
              >
                Efectivo S/ {Number(order.cash_amount ?? 0).toFixed(2)}
              </span>
            </div>
          )}

          {/* Banner de cambio de método */}
          {Array.isArray(order.payment_changes) && order.payment_changes.length > 0 && (
            <div
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold"
              style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#92400E' }}
            >
              <Icon name="swap_horiz" size={14} />
              <span>
                Método modificado por motorizado ·{' '}
                {formatChangeAt(order.payment_changes[0].occurred_at)}
              </span>
            </div>
          )}
        </section>

        {/* Deuda con Tindivo por este pedido (la comisión) */}
        <section className="bg-surface-container-lowest rounded-[24px] p-5 border border-outline-variant/15 shadow-[0_4px_20px_rgba(171,53,0,0.04)]">
          <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase text-on-surface-variant">
            Deuda con Tindivo
          </h3>
          {status === 'cancelled' ? (
            <p className="mt-2 text-sm text-on-surface-variant italic">
              Sin comisión (pedido cancelado)
            </p>
          ) : (
            <>
              <div className="mt-2 flex items-baseline justify-between gap-3">
                <div>
                  <div className="font-black text-2xl text-primary tabular-nums">
                    S/ {commissionFee.toFixed(2)}
                  </div>
                  <div className="text-[11px] text-on-surface-variant font-semibold mt-0.5">
                    {commissionIsFinal
                      ? 'Comisión cobrada por este pedido'
                      : 'Comisión estimada (se confirma al entregar)'}
                  </div>
                </div>
                {commissionBandLabel && (
                  <span
                    className="px-2.5 py-1 rounded-full text-[11px] font-bold"
                    style={{ background: 'rgba(255,107,53,0.1)', color: '#9A3412' }}
                  >
                    {commissionBandLabel}
                  </span>
                )}
              </div>
              {commissionBand === 'far' && farSurcharge > 0 && (
                <div className="mt-3 pt-3 border-t border-outline-variant/15 text-xs text-on-surface-variant space-y-1">
                  <div className="flex justify-between">
                    <span>Base</span>
                    <span className="font-mono tabular-nums">S/ {baseCommission.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Recargo (lejos)</span>
                    <span className="font-mono tabular-nums">S/ {farSurcharge.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* Detalle del pedido del cliente */}
        <CustomerOrderItemsSection orderId={orderId} order={{ source: order.source }} />

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
          <section
            className="relative overflow-hidden rounded-[24px] p-5"
            style={{
              background: 'linear-gradient(135deg, #065F46 0%, #10B981 100%)',
              color: '#ffffff',
              boxShadow: '0 12px 32px -10px rgba(5, 150, 105, 0.45)',
            }}
          >
            <div
              aria-hidden="true"
              className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
              style={{
                background: 'radial-gradient(circle, rgba(255,255,255,0.22) 0%, transparent 60%)',
              }}
            />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="check_circle" size={22} filled />
                <div className="text-[10px] font-bold tracking-[0.22em] uppercase opacity-85">
                  Entregado al cliente
                </div>
              </div>
              {order.delivered_at && (
                <>
                  <div
                    className="font-black text-2xl font-mono tabular-nums leading-tight"
                    style={{ letterSpacing: '-0.02em' }}
                  >
                    {formatDeliveryTime(order.delivered_at)}
                  </div>
                  <div className="text-xs opacity-85 mt-1">
                    {formatDeliveryDate(order.delivered_at)}
                  </div>
                </>
              )}
              {order.payment_status === 'pending_yape' && (
                <div
                  className="mt-3 rounded-xl px-3 py-2 text-xs font-semibold"
                  style={{ background: 'rgba(255, 255, 255, 0.18)' }}
                >
                  <div className="flex items-start gap-2">
                    <Icon name="qr_code_2" size={16} filled />
                    <span>
                      Pago por Yape: corrobora en tu app que el abono llegó cerca de esta hora.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </section>
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
            {/* Primary Action Button / Element */}
            {remainingMinutes > 0 ? (
              // EN COCINA state: PEDIDO LISTO is the primary button
              <Button
                variant="primary"
                size="lg"
                className="w-full shadow-md"
                disabled={!canReadyEarly || readyEarly.isPending}
                onClick={() => readyEarly.mutate()}
              >
                <Icon name="bolt" filled />
                PEDIDO LISTO
              </Button>
            ) : (
              // LISTO PARA RECOGER state: Information block (no button)
              <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 shadow-sm animate-pulse">
                <span className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white">
                  <Icon name="check" size={14} />
                </span>
                <span className="text-xs font-semibold leading-snug">
                  Pedido listo. El motorizado marcará la entrega cuando llegue al cliente.
                </span>
              </div>
            )}

            {/* Secondary Actions Row */}
            <div className="flex gap-2">
              {canEdit && (
                <Button
                  variant="secondary"
                  size="lg"
                  className="flex-1"
                  onClick={() => setShowEdit(true)}
                >
                  <Icon name="edit" />
                  Editar
                </Button>
              )}
              {canExtend && (
                <div className="flex-1 flex gap-1">
                  {!showExtension ? (
                    <Button
                      variant="secondary"
                      size="lg"
                      className="w-full"
                      onClick={() => setShowExtension(true)}
                    >
                      <Icon name="schedule" />
                      Más tiempo
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
                        onClick={() =>
                          extend.mutate(10, { onSuccess: () => setShowExtension(false) })
                        }
                      >
                        +10 min
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Cancel link at the very bottom */}
            {canCancel && (
              <button
                type="button"
                disabled={cancel.isPending}
                onClick={() => {
                  const reason = window.prompt('¿Por qué cancelas el pedido? (mínimo 3 caracteres)')
                  if (!reason || reason.trim().length < 3) return
                  cancel.mutate(reason.trim())
                }}
                className="text-xs text-on-surface-variant/60 hover:text-red-600 transition-colors font-semibold py-1.5 mx-auto hover:underline"
              >
                Cancelar pedido
              </button>
            )}
          </div>
        </BottomActionBar>
      )}

      {showEdit && canEdit && (
        <EditOrderSheet
          orderId={orderId}
          initial={{
            clientName: order.client_name ?? null,
            paymentStatus: order.payment_status,
            orderAmount: Number(order.order_amount),
            yapeAmount: order.yape_amount != null ? Number(order.yape_amount) : null,
            cashAmount: order.cash_amount != null ? Number(order.cash_amount) : null,
            clientPaysWith: order.client_pays_with != null ? Number(order.client_pays_with) : null,
          }}
          onClose={() => setShowEdit(false)}
        />
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
    case 'pending_mixed':
      return 'Yape + Efectivo'
    default:
      return status
  }
}

function formatChangeAt(iso: string): string {
  return new Date(iso).toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function formatDeliveryTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

function formatDeliveryDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
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
