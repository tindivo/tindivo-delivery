'use client'
import {
  Badge,
  ColorDot,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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

export function OrderDetail({ orderId }: Props) {
  const { data: order, isLoading } = useAdminOrderDetail(orderId)

  const timeline = useMemo<TimelineStep[]>(() => {
    if (!order) return []
    const s = order.status
    return [
      { key: 'created', label: 'Pedido creado', icon: 'receipt_long', done: true },
      {
        key: 'accepted',
        label: 'Motorizado asignado',
        icon: 'two_wheeler',
        done: ['heading_to_restaurant', 'waiting_at_restaurant', 'picked_up', 'delivered'].includes(s),
        current: s === 'heading_to_restaurant',
      },
      {
        key: 'picked_up',
        label: 'Pedido recogido',
        icon: 'shopping_bag',
        done: ['picked_up', 'delivered'].includes(s),
        current: s === 'waiting_at_restaurant',
      },
      {
        key: 'delivered',
        label: 'Entregado',
        icon: 'check_circle',
        done: s === 'delivered',
        current: s === 'picked_up',
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

  // El tracking público vive en la misma app, solo cambia el path.
  const origin = typeof window === 'undefined' ? (process.env.NEXT_PUBLIC_APP_URL ?? '') : window.location.origin
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
            Creado {new Date(order.created_at).toLocaleString('es-PE')}
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
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <Timeline steps={timeline} />
            </CardContent>
          </Card>

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
                <span className="text-2xl font-black">S/ {Number(order.order_amount).toFixed(2)}</span>
              </div>
              <Badge variant={paymentBadge(order.payment_status)}>{paymentLabel(order.payment_status)}</Badge>
              {order.client_pays_with && (
                <div className="text-sm text-on-surface-variant">
                  Paga con <strong>S/ {Number(order.client_pays_with).toFixed(2)}</strong>
                  {order.change_to_give ? <> · Vuelto S/ {Number(order.change_to_give).toFixed(2)}</> : null}
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
                  rel="noopener"
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
