'use client'
import { customer } from '@/lib/api/client'
import { useQuery } from '@tanstack/react-query'
import { ColorDot, GlassTopBar, Icon, IconButton, Skeleton } from '@tindivo/ui'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useCustomerAuth } from '../hooks/use-customer-auth'

/**
 * Historial de pedidos del cliente. Cada item es link al tracking público
 * `/pedidos/[shortId]`. Los pedidos delivered tienen botón "Pedir de nuevo"
 * que reusa items via /customer/orders/[id]/reorder (clona al carrito).
 */
export function HistoryView() {
  const router = useRouter()
  const { session, loading } = useCustomerAuth()
  const ordersQuery = useQuery({
    queryKey: ['customer', 'orders'],
    queryFn: () => customer.listMyOrders(50),
    enabled: Boolean(session),
  })

  useEffect(() => {
    if (!loading && !session) router.replace('/')
  }, [loading, session, router])

  if (loading || !session) {
    return (
      <div className="min-h-screen">
        <GlassTopBar title="MIS PEDIDOS" subtitle="" />
        <main className="pt-24 px-4 max-w-md mx-auto">
          <Skeleton className="h-40" />
        </main>
      </div>
    )
  }

  const items = ordersQuery.data?.items ?? []

  return (
    <div className="min-h-screen pb-12">
      <GlassTopBar
        title="MIS PEDIDOS"
        subtitle={session.email}
        left={
          <IconButton variant="ghost" onClick={() => router.push('/cuenta')} aria-label="Volver">
            <Icon name="arrow_back" />
          </IconButton>
        }
      />

      <main className="pt-24 px-4 max-w-md mx-auto space-y-3">
        {ordersQuery.isLoading ? (
          <>
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </>
        ) : items.length === 0 ? (
          <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/15 p-8 flex flex-col items-center gap-3 text-center">
            <Icon name="receipt_long" size={48} className="text-on-surface-variant/40" />
            <p className="text-on-surface-variant">Aún no hiciste pedidos</p>
            <Link
              href="/"
              className="text-primary-container font-bold text-sm flex items-center gap-1.5"
            >
              Explorar restaurantes
              <Icon name="arrow_forward" size={16} />
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/pedidos/${order.shortId}`}
                  className="block bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/15 hover:border-outline-variant/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <ColorDot color={order.restaurantAccentColor} />
                        <p className="font-bold text-on-surface truncate">{order.restaurantName}</p>
                      </div>
                      <p className="text-xs text-on-surface-variant font-mono">#{order.shortId}</p>
                    </div>
                    <StatusPill status={order.status} />
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                    <span className="font-bold text-on-surface tabular-nums">
                      S/ {order.orderAmount.toFixed(2)}
                    </span>
                    <span className="text-xs text-on-surface-variant">
                      {new Date(order.createdAt).toLocaleString('es-PE', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    pending_acceptance: { label: 'En espera', bg: 'rgba(245,158,11,0.15)', color: '#92400E' },
    waiting_driver: { label: 'Buscando moto', bg: 'rgba(239,68,68,0.12)', color: '#991B1B' },
    heading_to_restaurant: {
      label: 'Camino al local',
      bg: 'rgba(245,158,11,0.15)',
      color: '#92400E',
    },
    waiting_at_restaurant: {
      label: 'Recogiendo',
      bg: 'rgba(245,158,11,0.15)',
      color: '#92400E',
    },
    picked_up: { label: 'En camino', bg: 'rgba(245,158,11,0.2)', color: '#78350F' },
    delivered: { label: 'Entregado', bg: 'rgba(16,185,129,0.15)', color: '#065F46' },
    cancelled: { label: 'Cancelado', bg: 'rgba(107,114,128,0.15)', color: '#374151' },
  }
  const s = map[status] ?? { label: status, bg: 'rgba(0,0,0,0.06)', color: '#374151' }
  return (
    <span
      className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  )
}
