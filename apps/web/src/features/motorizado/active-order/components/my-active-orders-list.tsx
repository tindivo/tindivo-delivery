'use client'
import { EmptyState, Icon, OrderCard, Skeleton, listItem, staggerContainer } from '@tindivo/ui'
import { AnimatePresence, motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import { useDriverActiveOrders } from '../hooks/use-driver-active-orders'

const STATUS_ORDER: Record<string, number> = {
  waiting_at_restaurant: 0,
  heading_to_restaurant: 1,
  picked_up: 2,
}

// El backend devuelve snake_case desde supabase.from('orders').select('*').
// biome-ignore lint/suspicious/noExplicitAny: payload dinámico snake_case del API
type ActiveOrder = any

function paymentLabel(status: string): string {
  switch (status) {
    case 'prepaid':
      return 'Prepagado'
    case 'pending_yape':
      return 'Yape al entregar'
    case 'pending_cash':
      return 'Efectivo al entregar'
    default:
      return status
  }
}

/**
 * Lista de "Mis pedidos" — los pedidos que el driver ya aceptó y están en
 * progreso. Ordenados por urgencia: esperando en local arriba, luego en
 * camino, luego recogidos — HU-D-026.
 */
export function MyActiveOrdersList() {
  const router = useRouter()
  const { data, isLoading } = useDriverActiveOrders()

  const items = useMemo(() => {
    const list = (data?.items ?? []) as ActiveOrder[]
    return [...list].sort((a, b) => {
      const orderA = STATUS_ORDER[a.status] ?? 99
      const orderB = STATUS_ORDER[b.status] ?? 99
      if (orderA !== orderB) return orderA - orderB
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })
  }, [data])

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon="delivery_dining"
        title="Sin pedidos activos"
        description="Cuando aceptes un pedido aparecerá aquí."
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-[11px] text-on-surface-variant px-1">
        <Icon name="info" size={14} />
        <span>Tap en cualquier tarjeta para continuar el pedido.</span>
      </div>

      <motion.ul
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="flex flex-col gap-3"
      >
        <AnimatePresence>
          {items.map((order) => (
            <motion.li
              key={order.id}
              variants={listItem}
              exit={{ opacity: 0, scale: 0.9 }}
              layout
            >
              <OrderCard
                shortId={order.short_id}
                restaurantName={order.restaurants?.name ?? 'Restaurante'}
                restaurantAccentColor={order.restaurants?.accent_color ?? 'ab3500'}
                status={order.status}
                orderAmount={Number(order.order_amount)}
                paymentLabel={paymentLabel(order.payment_status)}
                estimatedReadyAt={order.estimated_ready_at}
                onClick={() => router.push(`/motorizado/pedidos/${order.id}`)}
              />
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>
    </div>
  )
}
