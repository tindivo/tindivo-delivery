'use client'
import { customer } from '@/lib/api/client'
import { useQuery } from '@tanstack/react-query'
import { ColorDot, GlassTopBar, Icon, IconButton, Skeleton } from '@tindivo/ui'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useCustomerAuth } from '../hooks/use-customer-auth'

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
    if (!loading && session && !session.roles.includes('customer')) router.replace('/negocio')
  }, [loading, session, router])

  if (loading || !session) {
    return (
      <div className="customer-page">
        <GlassTopBar title="Mis pedidos" />
        <main className="mx-auto max-w-md px-4 pt-24">
          <Skeleton className="h-40" />
        </main>
      </div>
    )
  }

  const items = ordersQuery.data?.items ?? []

  return (
    <div className="customer-page pb-12">
      <GlassTopBar
        title="Mis pedidos"
        subtitle={session.email}
        left={
          <IconButton variant="ghost" onClick={() => router.push('/cuenta')} aria-label="Volver">
            <Icon name="arrow_back" />
          </IconButton>
        }
      />

      <main className="mx-auto max-w-3xl space-y-5 px-4 pt-24">
        <section className="customer-soft-gradient customer-shimmer customer-fade-up rounded-[36px] p-5 text-white md:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase text-white/82">Historial</p>
              <h1 className="mt-2 text-3xl font-black leading-tight md:text-4xl">
                Tus pedidos Tindivo
              </h1>
              <p className="mt-2 text-sm font-bold leading-relaxed text-white/88">
                Revisa estado, total y tracking desde una sola lista.
              </p>
            </div>
            <span className="customer-glass flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] text-[#4b210f]">
              <Icon name="receipt_long" size={30} filled />
            </span>
          </div>
        </section>

        {ordersQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-28 rounded-[28px]" />
            <Skeleton className="h-28 rounded-[28px]" />
          </div>
        ) : items.length === 0 ? (
          <div className="customer-panel-soft flex flex-col items-center gap-4 rounded-[34px] p-8 text-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-primary-fixed text-on-primary-fixed">
              <Icon name="restaurant" size={40} filled />
            </span>
            <div>
              <h2 className="text-2xl font-black text-on-surface">Aun no hay pedidos</h2>
              <p className="mt-1 text-sm font-semibold text-on-surface-variant">
                Cuando pidas por delivery, el tracking quedara aqui.
              </p>
            </div>
            <Link
              href="/"
              className="customer-lift inline-flex items-center gap-2 rounded-full bg-primary-container px-5 py-3 text-sm font-black text-white"
            >
              Explorar restaurantes
              <Icon name="arrow_forward" size={16} />
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((order, index) => (
              <li
                key={order.id}
                className="customer-reveal"
                style={{ animationDelay: `${index * 35}ms` }}
              >
                <Link
                  href={`/pedidos/${order.shortId}`}
                  className="customer-lift customer-panel-soft block rounded-[28px] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <ColorDot color={order.restaurantAccentColor} />
                        <p className="truncate font-black text-on-surface">
                          {order.restaurantName}
                        </p>
                      </div>
                      <p className="font-mono text-xs font-bold text-on-surface-variant">
                        #{order.shortId}
                      </p>
                    </div>
                    <StatusPill status={order.status} />
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 rounded-[22px] bg-white/62 px-3 py-2 text-sm">
                    <span className="font-black text-primary-container tabular-nums">
                      S/ {order.orderAmount.toFixed(2)}
                    </span>
                    <span className="text-xs font-bold text-on-surface-variant">
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
  const map: Record<string, { label: string; bg: string; color: string; icon: string }> = {
    pending_acceptance: {
      label: 'En espera',
      bg: 'rgba(245,158,11,0.15)',
      color: '#92400E',
      icon: 'hourglass_top',
    },
    waiting_driver: {
      label: 'Buscando moto',
      bg: 'rgba(239,68,68,0.12)',
      color: '#991B1B',
      icon: 'two_wheeler',
    },
    heading_to_restaurant: {
      label: 'Camino al local',
      bg: 'rgba(245,158,11,0.15)',
      color: '#92400E',
      icon: 'route',
    },
    waiting_at_restaurant: {
      label: 'Recogiendo',
      bg: 'rgba(245,158,11,0.15)',
      color: '#92400E',
      icon: 'restaurant',
    },
    picked_up: {
      label: 'En camino',
      bg: 'rgba(245,158,11,0.2)',
      color: '#78350F',
      icon: 'delivery_dining',
    },
    delivered: {
      label: 'Entregado',
      bg: 'rgba(16,185,129,0.15)',
      color: '#065F46',
      icon: 'check_circle',
    },
    cancelled: {
      label: 'Cancelado',
      bg: 'rgba(107,114,128,0.15)',
      color: '#374151',
      icon: 'cancel',
    },
  }
  const s = map[status] ?? { label: status, bg: 'rgba(0,0,0,0.06)', color: '#374151', icon: 'info' }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black"
      style={{ background: s.bg, color: s.color }}
    >
      <Icon name={s.icon} size={14} filled />
      {s.label}
    </span>
  )
}
