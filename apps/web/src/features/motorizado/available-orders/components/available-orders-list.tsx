'use client'
import { EmptyState, OrderCard, Skeleton, fadeInUp, listItem, staggerContainer } from '@tindivo/ui'
import { AnimatePresence, motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { useAvailableOrders } from '../hooks/use-available-orders'
import { useAcceptOrder } from '../hooks/use-accept-order'

const PREP_MINS: Record<string, number> = { fast: 10, normal: 15, slow: 20 }

export function AvailableOrdersList() {
  const router = useRouter()
  const { data, isLoading } = useAvailableOrders()
  const accept = useAcceptOrder()

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
        icon="inbox"
        title="No hay pedidos disponibles"
        description="Cuando un restaurante cree un pedido aparecerá aquí con sonido."
      />
    )
  }

  return (
    <motion.ul
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="flex flex-col gap-3"
    >
      <AnimatePresence>
        {items.map((order: any) => (
          <motion.li key={order.id} variants={listItem} exit={{ opacity: 0, scale: 0.9 }} layout>
            <OrderCard
              shortId={order.short_id}
              restaurantName={order.restaurants?.name ?? 'Restaurante'}
              restaurantAccentColor={order.restaurants?.accent_color ?? 'ab3500'}
              status={order.status}
              orderAmount={Number(order.order_amount)}
              paymentLabel={paymentLabel(order.payment_status)}
              prepTimeMinutes={PREP_MINS[order.prep_time_option]}
              onClick={() => {
                if (accept.isPending) return
                accept.mutate(order.id, {
                  onSuccess: () => {
                    router.push(`/motorizado/pedidos/${order.id}`)
                  },
                })
              }}
              highlight={accept.variables === order.id && accept.isPending}
            />
          </motion.li>
        ))}
      </AnimatePresence>
    </motion.ul>
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
