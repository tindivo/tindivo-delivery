'use client'
import { EmptyState, OrderCard, Skeleton } from '@tindivo/ui'
import { useRouter } from 'next/navigation'
import { useRestaurantOrders } from '../hooks/use-restaurant-orders'

export function ActiveOrders() {
  const router = useRouter()
  const { data, isLoading } = useRestaurantOrders()

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    )
  }

  const items = (data?.items ?? []).filter(
    // biome-ignore lint/suspicious/noExplicitAny: payload dinámico con status
    (o: any) => o.status !== 'delivered' && o.status !== 'cancelled',
  )

  if (items.length === 0) {
    return (
      <EmptyState
        icon="restaurant_menu"
        title="Sin pedidos activos"
        description="Toca ‘PEDIR MOTO’ arriba para crear tu primer pedido."
      />
    )
  }

  return (
    <ul className="space-y-3">
      {/* biome-ignore lint/suspicious/noExplicitAny: payload dinámico con columnas anidadas */}
      {items.map((order: any) => (
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
            onClick={() => router.push(`/restaurante/pedidos/${order.id}`)}
          />
        </li>
      ))}
    </ul>
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
