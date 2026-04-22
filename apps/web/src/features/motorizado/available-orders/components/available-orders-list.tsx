'use client'
import {
  EmptyState,
  OrderCard,
  Skeleton,
  computeUrgencyTier,
  listItem,
  staggerContainer,
} from '@tindivo/ui'
import { AnimatePresence, motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import { useNow } from '@/shared/hooks/use-now'
import { useAvailableOrders } from '../hooks/use-available-orders'
import { OverdueBanner } from './overdue-banner'

const PREP_MINS: Record<string, number> = { fast: 10, normal: 15, slow: 20 }

export function AvailableOrdersList() {
  const router = useRouter()
  const { data, isLoading } = useAvailableOrders()
  const now = useNow(15_000)

  // biome-ignore lint/suspicious/noExplicitAny: payload dinámico con columnas anidadas
  const items = (data?.items ?? []) as any[]

  // Clasifica pedidos por tier para aplicar priorización overdue-first
  const { overdueCount, overdueIds } = useMemo(() => {
    const ids = new Set<string>()
    for (const o of items) {
      if (
        o.estimated_ready_at &&
        computeUrgencyTier(o.estimated_ready_at, now) === 'overdue'
      ) {
        ids.add(o.id)
      }
    }
    return { overdueCount: ids.size, overdueIds: ids }
  }, [items, now])

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
        icon="inbox"
        title="No hay pedidos disponibles"
        description="Cuando un restaurante esté listo aparecerá aquí con sonido."
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <OverdueBanner count={overdueCount} />

      <motion.ul
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="flex flex-col gap-3"
      >
        <AnimatePresence>
          {items.map((order) => {
            const isOverdue = overdueIds.has(order.id)
            // Si hay overdue en la lista, deshabilitar los no-overdue
            const isLocked = overdueCount > 0 && !isOverdue
            return (
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
                  prepTimeMinutes={PREP_MINS[order.prep_time_option]}
                  estimatedReadyAt={order.estimated_ready_at}
                  now={now}
                  disabled={isLocked}
                  onClick={() => router.push(`/motorizado/pedidos/${order.id}/preview`)}
                />
              </motion.li>
            )
          })}
        </AnimatePresence>
      </motion.ul>
    </div>
  )
}

function paymentLabel(status: string): string {
  switch (status) {
    case 'prepaid':
      return 'Pagado'
    case 'pending_yape':
      return 'Cobrar Yape al entregar'
    case 'pending_cash':
      return 'Cobrar efectivo al entregar'
    default:
      return status
  }
}
