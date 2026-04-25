'use client'
import { useNow } from '@/shared/hooks/use-now'
import { useOverdueFeedback } from '@/shared/hooks/use-overdue-feedback'
import { EmptyState, OrderCard, Skeleton, computeUrgencyTier } from '@tindivo/ui'
import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import { useRestaurantOrders } from '../hooks/use-restaurant-orders'
import { UrgentCallCard } from './urgent-call-card'

// biome-ignore lint/suspicious/noExplicitAny: payload dinámico snake_case del API
type OrderItem = any

export function ActiveOrders() {
  const router = useRouter()
  const { data, isLoading } = useRestaurantOrders()
  const now = useNow(1_000)

  // Filtra activos y ordena por urgencia: a menor tiempo restante hasta
  // estar listo, más arriba en la lista. Pedidos sin estimated_ready_at van
  // al final (se asume `Infinity` de tiempo restante).
  const { sortedItems, overdueIds, urgentNoDriverCount } = useMemo(() => {
    const items = (data?.items ?? []) as OrderItem[]
    const active = items.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled')

    const withDelta = active.map((o) => {
      const deltaMs = o.estimated_ready_at
        ? new Date(o.estimated_ready_at).getTime() - now.getTime()
        : Number.POSITIVE_INFINITY
      return { order: o, deltaMs }
    })

    withDelta.sort((a, b) => a.deltaMs - b.deltaMs)

    const overdue = new Set<string>()
    let urgentNoDriver = 0
    for (const { order, deltaMs } of withDelta) {
      // Overdue = prep_time vencido. "Urgente sin driver" = overdue + waiting_driver.
      // Solo este último escala a "llamar a Tindivo" y dispara el feedback.
      if (deltaMs <= 0 && order.estimated_ready_at && order.status === 'waiting_driver') {
        overdue.add(order.id)
        urgentNoDriver++
      }
    }

    return {
      sortedItems: withDelta.map((w) => w.order),
      overdueIds: overdue,
      urgentNoDriverCount: urgentNoDriver,
    }
  }, [data, now])

  useOverdueFeedback(overdueIds)

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    )
  }

  if (sortedItems.length === 0) {
    return (
      <EmptyState
        icon="restaurant_menu"
        title="Sin pedidos activos"
        description="Toca ‘PEDIR MOTO’ arriba para crear tu primer pedido."
      />
    )
  }

  return (
    <div className="space-y-3">
      <UrgentCallCard count={urgentNoDriverCount} />
      <ul className="space-y-3">
        {sortedItems.map((order) => {
          // Mostrar countdown live solo para pedidos con prep activo (no entregados/cancelados)
          // y mientras todavía importa (status del flow de cocina/recogida).
          const showCountdown =
            order.estimated_ready_at &&
            ['waiting_driver', 'heading_to_restaurant', 'waiting_at_restaurant'].includes(
              order.status,
            )
          const tier = order.estimated_ready_at
            ? computeUrgencyTier(order.estimated_ready_at, now)
            : null

          return (
            <li key={order.id}>
              <OrderCard
                shortId={order.short_id}
                restaurantName={order.restaurants?.name ?? 'Pedido'}
                restaurantAccentColor={order.restaurants?.accent_color ?? 'ab3500'}
                status={order.status}
                orderAmount={Number(order.order_amount)}
                paymentLabel={paymentLabel(order.payment_status)}
                prepTimeMinutes={order.prep_minutes}
                driverName={order.drivers?.full_name?.split(' ')[0] ?? null}
                // Forzamos `waiting_driver` como prop solo para activar el countdown
                // visual del UrgencyBadge en OrderCard. El status real (status) se
                // sigue mostrando vía StatusChip, así que la UI no miente.
                estimatedReadyAt={showCountdown ? order.estimated_ready_at : undefined}
                now={showCountdown ? now : undefined}
                prominentCode
                highlight={tier === 'overdue' && order.status === 'waiting_driver'}
                onClick={() => router.push(`/restaurante/pedidos/${order.id}`)}
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function paymentLabel(status: string): string {
  switch (status) {
    case 'prepaid':
      return 'Pagado'
    case 'pending_yape':
      return 'Yape al entregar'
    case 'pending_cash':
      return 'Efectivo al entregar'
    default:
      return status
  }
}
