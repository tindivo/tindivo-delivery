'use client'
import { useNow } from '@/shared/hooks/use-now'
import { Skeleton } from '@tindivo/ui'
import { useState } from 'react'
import { usePendingAcceptanceOrders } from '../hooks/use-pending-acceptance-orders'
import { AcceptOrderSheet } from './accept-order-sheet'
import { PendingOrderCard } from './pending-order-card'

/**
 * Sección "En espera" — pedidos del cliente que están esperando que el
 * restaurante acepte y defina prep_time real. Se renderiza ARRIBA de
 * "Pedidos activos" porque requieren acción inmediata (countdown 5min
 * antes de auto-cancel).
 */
export function PendingAcceptanceList() {
  const { data, isLoading } = usePendingAcceptanceOrders()
  const now = useNow(1_000)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const items = data?.items ?? []

  if (isLoading && items.length === 0) {
    return <Skeleton className="h-32" />
  }

  if (items.length === 0) return null

  return (
    <section
      aria-label="Pedidos en espera de aceptación"
      className="rounded-3xl border-2 border-amber-300/60 bg-amber-50/60 px-4 py-5 space-y-4"
    >
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500 text-white font-black text-xs"
            aria-hidden="true"
          >
            {items.length}
          </span>
          <div>
            <h2 className="text-[11px] font-bold tracking-[0.2em] uppercase text-amber-900">
              En espera de aceptación
            </h2>
            <p className="text-xs text-amber-800/80">
              Acepta el pedido y define cuánto demoras en preparar
            </p>
          </div>
        </div>
      </header>

      <ul className="space-y-3">
        {items.map((order) => (
          <li key={order.id}>
            <PendingOrderCard
              order={order}
              now={now}
              onClick={() => setSelectedOrderId(order.id)}
            />
          </li>
        ))}
      </ul>

      {selectedOrderId && (
        <AcceptOrderSheet
          orderId={selectedOrderId}
          order={items.find((o) => o.id === selectedOrderId) ?? null}
          onClose={() => setSelectedOrderId(null)}
        />
      )}
    </section>
  )
}
