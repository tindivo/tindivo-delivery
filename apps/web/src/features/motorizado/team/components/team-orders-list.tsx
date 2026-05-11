'use client'
import { useNow } from '@/shared/hooks/use-now'
import {
  Button,
  EmptyState,
  Icon,
  OrderCard,
  Skeleton,
  listItem,
  staggerContainer,
} from '@tindivo/ui'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { useTeamOrders } from '../hooks/use-team-orders'
import { RequestOrderSheet } from './request-order-sheet'

// biome-ignore lint/suspicious/noExplicitAny: payload snake_case del API
type TeamOrder = any

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

function statusLabel(status: string): string {
  switch (status) {
    case 'waiting_driver':
      return 'Pre-asignado'
    case 'heading_to_restaurant':
      return 'En camino al local'
    case 'waiting_at_restaurant':
      return 'En el local'
    case 'picked_up':
      return 'En camino al cliente'
    default:
      return status
  }
}

export function TeamOrdersList() {
  const { data, isLoading } = useTeamOrders()
  const now = useNow(1_000)
  const [selected, setSelected] = useState<TeamOrder | null>(null)

  const items = (data?.items ?? []) as TeamOrder[]

  return (
    <div className="flex flex-col gap-3">
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon="groups"
          title="No hay pedidos del equipo"
          description="Cuando tus compañeros tengan pedidos activos aparecerán aquí. Podrás solicitarlos si necesitas más trabajo."
        />
      ) : (
        <motion.ul
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="flex flex-col gap-3"
        >
          <AnimatePresence>
            {items.map((order) => {
              const driverName = order.drivers?.full_name ?? 'Otro motorizado'
              const hasPending = Boolean(order.has_pending_request)
              return (
                <motion.li key={order.id} variants={listItem} layout exit={{ opacity: 0 }}>
                  <div className="space-y-2">
                    <OrderCard
                      shortId={order.short_id}
                      clientName={order.client_name ?? null}
                      restaurantName={order.restaurants?.name ?? 'Restaurante'}
                      restaurantAccentColor={order.restaurants?.accent_color ?? 'ab3500'}
                      status={order.status}
                      orderAmount={Number(order.order_amount)}
                      paymentLabel={paymentLabel(order.payment_status)}
                      prepTimeMinutes={order.prep_minutes}
                      estimatedReadyAt={order.estimated_ready_at}
                      now={now}
                      driverName={driverName}
                    />
                    {hasPending ? (
                      <Button size="md" variant="secondary" className="w-full" disabled>
                        <Icon name="schedule" size={16} />
                        Esperando a {driverName} (30s)…
                      </Button>
                    ) : (
                      <Button
                        size="md"
                        variant="secondary"
                        className="w-full"
                        onClick={() => setSelected(order)}
                      >
                        <Icon name="swap_horiz" size={16} />
                        Solicitar pedido
                      </Button>
                    )}
                  </div>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </motion.ul>
      )}

      {selected && (
        <RequestOrderSheet
          order={{
            id: selected.id,
            shortId: selected.short_id,
            restaurantName: selected.restaurants?.name ?? 'Restaurante',
            driverFullName: selected.drivers?.full_name ?? 'Otro motorizado',
            orderAmount: Number(selected.order_amount),
            statusLabel: statusLabel(selected.status),
          }}
          onClose={() => setSelected(null)}
          onSuccess={() => setSelected(null)}
        />
      )}
    </div>
  )
}
