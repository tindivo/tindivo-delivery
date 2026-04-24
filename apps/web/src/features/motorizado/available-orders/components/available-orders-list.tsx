'use client'
import { useDriverCapacity } from '@/features/motorizado/active-order/hooks/use-driver-capacity'
import { useNow } from '@/shared/hooks/use-now'
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
import { useAvailableOrders } from '../hooks/use-available-orders'
import { CapacityIndicator } from './capacity-indicator'
import { OverdueBanner } from './overdue-banner'
import { UpcomingOrdersSection } from './upcoming-orders-section'

const PREP_MINS: Record<string, number> = { fast: 10, normal: 15, slow: 20 }

// Nota: el backend hace `supabase.from('orders').select('*')` y devuelve columnas
// en snake_case. El tipo generado de Zod es camelCase por convención, pero
// runtime no coincide — por eso casteamos a `any[]` (mismo patrón que otros
// hooks del monorepo).
// biome-ignore lint/suspicious/noExplicitAny: payload dinámico snake_case del API
type OrderItem = any

export function AvailableOrdersList() {
  const router = useRouter()
  const { data, isLoading } = useAvailableOrders()
  const { activeCount, max, isFull } = useDriverCapacity()
  const now = useNow(15_000)

  const items = (data?.items ?? []) as OrderItem[]

  // Clasifica cada pedido en su tier: upcoming (>10min) / pending (1-10min) / overdue (0 o vencido)
  const { actionable, upcoming, overdueIds, overdueCount } = useMemo(() => {
    const overdueSet = new Set<string>()
    const action: OrderItem[] = []
    const upc: OrderItem[] = []

    for (const o of items) {
      if (!o.estimated_ready_at) {
        action.push(o)
        continue
      }
      const tier = computeUrgencyTier(o.estimated_ready_at, now)
      if (tier === 'upcoming') {
        upc.push(o)
      } else {
        if (tier === 'overdue') overdueSet.add(o.id)
        action.push(o)
      }
    }

    return {
      actionable: action,
      upcoming: upc,
      overdueIds: overdueSet,
      overdueCount: overdueSet.size,
    }
  }, [items, now])

  return (
    <div className="flex flex-col gap-3">
      <CapacityIndicator activeCount={activeCount} max={max} />

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : actionable.length === 0 && upcoming.length === 0 ? (
        <EmptyState
          icon="inbox"
          title="No hay pedidos disponibles"
          description="Cuando un restaurante esté listo aparecerá aquí con sonido."
        />
      ) : (
        <>
          <OverdueBanner count={overdueCount} />

          {actionable.length > 0 && (
            <motion.ul
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="flex flex-col gap-3"
            >
              <AnimatePresence>
                {actionable.map((order) => {
                  const isOverdue = overdueIds.has(order.id)
                  // Si hay overdue, los pending quedan bloqueados (priorizar).
                  // Si el driver está al límite 3/3, TODOS bloqueados.
                  const isLocked = isFull || (overdueCount > 0 && !isOverdue)
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
          )}

          <UpcomingOrdersSection items={upcoming} now={now} />
        </>
      )}
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
