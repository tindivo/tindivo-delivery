'use client'
import { EmptyState, OrderCard, Skeleton } from '@tindivo/ui'
import { useDriverHistory } from '../hooks/use-driver-history'

const PREP_MINS: Record<string, number> = { fast: 10, normal: 15, slow: 20 }

function paymentLabel(status: string): string {
  switch (status) {
    case 'prepaid':
      return 'Pagado'
    case 'pending_yape':
      return 'Cobró Yape'
    case 'pending_cash':
      return 'Cobró efectivo'
    default:
      return status
  }
}

export function DriverHistory() {
  const { data, isLoading } = useDriverHistory()

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    )
  }

  const items = data?.items ?? []

  if (items.length === 0) {
    return (
      <EmptyState
        icon="history"
        title="Sin entregas hoy"
        description="Los pedidos que entregues aparecerán aquí."
      />
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {/* biome-ignore lint/suspicious/noExplicitAny: payload dinámico con columnas anidadas */}
      {items.map((order: any) => (
        <li key={order.id}>
          <OrderCard
            shortId={order.short_id}
            restaurantName={order.restaurants?.name ?? 'Restaurante'}
            restaurantAccentColor={order.restaurants?.accent_color ?? 'ab3500'}
            status={order.status}
            orderAmount={Number(order.order_amount)}
            paymentLabel={paymentLabel(order.payment_status)}
            prepTimeMinutes={PREP_MINS[order.prep_time_option]}
          />
        </li>
      ))}
    </ul>
  )
}
