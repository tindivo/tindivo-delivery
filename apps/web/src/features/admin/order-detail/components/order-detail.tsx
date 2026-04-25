'use client'
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ColorDot,
  Icon,
  StatusChip,
  Timeline,
  type TimelineStep,
} from '@tindivo/ui'
import Link from 'next/link'
import { useMemo } from 'react'
import { useAdminOrderDetail } from '../hooks/use-admin-order-detail'
import { SendTrackingButton } from './send-tracking-button'

type Props = { orderId: string }

const LIMA_TIME = new Intl.DateTimeFormat('es-PE', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  timeZone: 'America/Lima',
  hour12: false,
})

const LIMA_DATETIME = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Lima',
  hour12: false,
})

function fmtTime(iso: string | null | undefined): string | undefined {
  if (!iso) return undefined
  return LIMA_TIME.format(new Date(iso))
}

function fmtDateTime(iso: string | null | undefined): string | undefined {
  if (!iso) return undefined
  return LIMA_DATETIME.format(new Date(iso))
}

/** Formatea segundos como "Mm Ss" o "Hh Mm Ss". Negativos: "-..." */
function fmtDuration(seconds: number | null | undefined): string | null {
  if (seconds == null || !Number.isFinite(seconds)) return null
  const sign = seconds < 0 ? '-' : ''
  const abs = Math.abs(Math.round(seconds))
  const h = Math.floor(abs / 3600)
  const m = Math.floor((abs % 3600) / 60)
  const s = abs % 60
  if (h > 0) return `${sign}${h}h ${m}m`
  if (m > 0) return `${sign}${m}m ${s}s`
  return `${sign}${s}s`
}

/** Formatea segundos como "mm:ss" (con signo). */
function fmtCountdown(seconds: number | null | undefined): string | null {
  if (seconds == null || !Number.isFinite(seconds)) return null
  const sign = seconds < 0 ? '-' : ''
  const abs = Math.abs(Math.round(seconds))
  const m = Math.floor(abs / 60)
  const s = abs % 60
  return `${sign}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function diffSeconds(toIso: string | null, fromIso: string | null): number | null {
  if (!toIso || !fromIso) return null
  return (new Date(toIso).getTime() - new Date(fromIso).getTime()) / 1000
}

export function OrderDetail({ orderId }: Props) {
  const { data: order, isLoading } = useAdminOrderDetail(orderId)

  const timeline = useMemo<TimelineStep[]>(() => {
    if (!order) return []
    // biome-ignore lint/suspicious/noExplicitAny: payload snake_case del API
    const o = order as any
    const s = order.status

    const acceptedDur = fmtDuration(diffSeconds(o.accepted_at, o.created_at))
    const headingToWaitingDur = fmtDuration(diffSeconds(o.waiting_at, o.heading_at))
    const waitingToReceivedDur = fmtDuration(diffSeconds(o.received_at, o.waiting_at))
    const receivedToPickupDur = fmtDuration(
      diffSeconds(o.picked_up_at, o.received_at ?? o.waiting_at),
    )
    const pickupToDeliveredDur = fmtDuration(diffSeconds(o.delivered_at, o.picked_up_at))
    const totalDur = fmtDuration(diffSeconds(o.delivered_at, o.created_at))
    const acceptCountdown = fmtCountdown(o.accept_countdown_seconds)

    return [
      {
        key: 'created',
        label: 'Pedido creado',
        icon: 'receipt_long',
        done: true,
        timestamp: fmtTime(o.created_at),
      },
      {
        key: 'accepted',
        label: 'Driver acepta',
        icon: 'two_wheeler',
        done: ['heading_to_restaurant', 'waiting_at_restaurant', 'picked_up', 'delivered'].includes(
          s,
        ),
        current: s === 'waiting_driver',
        timestamp: fmtTime(o.accepted_at),
        description: acceptedDur
          ? `Aceptado en ${acceptedDur}${acceptCountdown ? ` · countdown ${acceptCountdown}` : ''}`
          : undefined,
      },
      {
        key: 'waiting',
        label: 'Llegó al local',
        icon: 'storefront',
        done: ['waiting_at_restaurant', 'picked_up', 'delivered'].includes(s),
        current: s === 'heading_to_restaurant',
        timestamp: fmtTime(o.waiting_at),
        description: headingToWaitingDur ? `Viaje al local: ${headingToWaitingDur}` : undefined,
      },
      {
        key: 'received',
        label: 'Recibió el pedido',
        icon: 'shopping_bag',
        done: Boolean(o.received_at) || ['picked_up', 'delivered'].includes(s),
        current: s === 'waiting_at_restaurant' && !o.received_at,
        timestamp: fmtTime(o.received_at),
        description: waitingToReceivedDur ? `Espera en local: ${waitingToReceivedDur}` : undefined,
      },
      {
        key: 'picked_up',
        label: 'Inició entrega',
        icon: 'delivery_dining',
        done: ['picked_up', 'delivered'].includes(s),
        current: s === 'waiting_at_restaurant' && Boolean(o.received_at),
        timestamp: fmtTime(o.picked_up_at),
        description: receivedToPickupDur
          ? `Captura datos cliente: ${receivedToPickupDur}`
          : undefined,
      },
      {
        key: 'delivered',
        label: 'Entregado',
        icon: 'check_circle',
        done: s === 'delivered',
        current: s === 'picked_up',
        timestamp: fmtTime(o.delivered_at),
        description:
          pickupToDeliveredDur && totalDur
            ? `Trayecto al cliente: ${pickupToDeliveredDur} · Total ${totalDur}`
            : pickupToDeliveredDur
              ? `Trayecto al cliente: ${pickupToDeliveredDur}`
              : undefined,
      },
    ]
  }, [order])

  if (isLoading || !order) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Icon name="progress_activity" size={36} className="animate-spin text-primary" />
      </div>
    )
  }

  // biome-ignore lint/suspicious/noExplicitAny: payload snake_case del API
  const o = order as any

  // El tracking público vive en la misma app, solo cambia el path.
  const origin =
    typeof window === 'undefined' ? (process.env.NEXT_PUBLIC_APP_URL ?? '') : window.location.origin
  const trackingUrl = `${origin}/pedidos/${order.short_id}`

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="flex items-center gap-4">
        <Link
          href="/admin"
          className="rounded-full p-2 hover:bg-surface-container-low transition-colors"
        >
          <Icon name="arrow_back" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="font-black text-2xl tracking-tight">Pedido #{order.short_id}</h1>
            <StatusChip status={order.status} />
          </div>
          <p className="text-on-surface-variant text-sm mt-0.5">
            Creado {fmtDateTime(order.created_at)} (Lima)
          </p>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Restaurante</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-3">
              <ColorDot color={order.restaurants.accent_color} size={18} />
              <div>
                <p className="font-bold">{order.restaurants.name}</p>
                <p className="text-sm text-on-surface-variant">{order.restaurants.address}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Línea de tiempo</CardTitle>
            </CardHeader>
            <CardContent>
              <Timeline steps={timeline} />
            </CardContent>
          </Card>

          {(o.prep_extended_at || o.ready_early_at) && (
            <Card>
              <CardHeader>
                <CardTitle>Acciones del restaurante</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {o.prep_extended_at && (
                  <div className="flex items-center gap-2">
                    <Icon name="more_time" size={18} className="text-amber-700" />
                    <span>
                      Extendió <strong>+{o.prep_extension_minutes ?? '?'} min</strong> a las{' '}
                      <span className="font-mono">{fmtTime(o.prep_extended_at)}</span> (Lima)
                    </span>
                  </div>
                )}
                {o.ready_early_at && (
                  <div className="flex items-center gap-2">
                    <Icon name="bolt" size={18} className="text-emerald-700" />
                    <span>
                      Marcó <strong>listo antes</strong> a las{' '}
                      <span className="font-mono">{fmtTime(o.ready_early_at)}</span> (Lima)
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {order.drivers && (
            <Card>
              <CardHeader>
                <CardTitle>Motorizado</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center">
                  <Icon name="two_wheeler" className="text-on-primary-fixed" />
                </div>
                <div>
                  <p className="font-bold">{order.drivers.full_name}</p>
                  <p className="text-sm text-on-surface-variant">
                    {order.drivers.vehicle_type} · +51 {order.drivers.phone}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Pago</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-on-surface-variant">Monto</span>
                <span className="text-2xl font-black">
                  S/ {Number(order.order_amount).toFixed(2)}
                </span>
              </div>
              <Badge variant={paymentBadge(order.payment_status)}>
                {paymentLabel(order.payment_status)}
              </Badge>
              {order.client_pays_with && (
                <div className="text-sm text-on-surface-variant">
                  Paga con <strong>S/ {Number(order.client_pays_with).toFixed(2)}</strong>
                  {order.change_to_give ? (
                    <> · Vuelto S/ {Number(order.change_to_give).toFixed(2)}</>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>

          {order.status === 'picked_up' && order.client_phone && (
            <Card>
              <CardHeader>
                <CardTitle>Enviar tracking al cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <SendTrackingButton
                  orderId={order.id}
                  phone={order.client_phone}
                  shortId={order.short_id}
                  trackingUrl={trackingUrl}
                  restaurantName={order.restaurants.name}
                  driverFirstName={order.drivers?.full_name?.split(' ')[0] ?? 'tu motorizado'}
                  alreadySentAt={order.tracking_link_sent_at}
                />
              </CardContent>
            </Card>
          )}

          {order.delivery_maps_url && (
            <Card>
              <CardHeader>
                <CardTitle>Entrega</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {order.client_phone && (
                  <a
                    href={`tel:+51${order.client_phone}`}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-primary-container"
                  >
                    <Icon name="call" size={16} />
                    +51 {order.client_phone}
                  </a>
                )}
                <a
                  href={order.delivery_maps_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-primary-container"
                >
                  <Icon name="navigation" size={16} />
                  Abrir ubicación
                </a>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function paymentLabel(status: string): string {
  switch (status) {
    case 'prepaid':
      return 'Pagado por adelantado'
    case 'pending_yape':
      return 'Cobrar Yape al entregar'
    case 'pending_cash':
      return 'Cobrar efectivo al entregar'
    default:
      return status
  }
}

function paymentBadge(status: string): 'success' | 'primary' | 'warning' {
  return status === 'prepaid' ? 'success' : status === 'pending_cash' ? 'warning' : 'primary'
}
