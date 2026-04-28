'use client'
import { Icon, Skeleton, StatusChip } from '@tindivo/ui'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useAdminOrdersHistory } from '../hooks/use-admin-orders-history'

const SAN_JACINTO_DT = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Lima',
  hour12: false,
})

function fmtDateTime(iso: string | null): string {
  if (!iso) return '—'
  return SAN_JACINTO_DT.format(new Date(iso))
}

type StatusFilter = 'all' | 'delivered' | 'cancelled'

export function OrdersHistoryList() {
  const { data, isLoading } = useAdminOrdersHistory()
  const [filter, setFilter] = useState<StatusFilter>('all')
  // biome-ignore lint/suspicious/noExplicitAny: payload dinámico con columnas anidadas
  const allItems = (data?.items ?? []) as any[]

  const items = useMemo(
    () => (filter === 'all' ? allItems : allItems.filter((o) => o.status === filter)),
    [allItems, filter],
  )

  const counts = useMemo(
    () => ({
      all: allItems.length,
      delivered: allItems.filter((o) => o.status === 'delivered').length,
      cancelled: allItems.filter((o) => o.status === 'cancelled').length,
    }),
    [allItems],
  )

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/orders"
          className="rounded-full p-2 hover:bg-surface-container-low transition-colors shrink-0"
          aria-label="Volver"
        >
          <Icon name="arrow_back" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="bleed-text font-black text-2xl md:text-3xl text-on-surface">
            Historial de pedidos
          </h1>
          <p className="text-on-surface-variant text-xs md:text-sm mt-1">
            Pedidos entregados y cancelados (hora San Jacinto).
          </p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <FilterChip
          label={`Todos (${counts.all})`}
          active={filter === 'all'}
          onClick={() => setFilter('all')}
        />
        <FilterChip
          label={`Entregados (${counts.delivered})`}
          active={filter === 'delivered'}
          onClick={() => setFilter('delivered')}
        />
        <FilterChip
          label={`Cancelados (${counts.cancelled})`}
          active={filter === 'cancelled'}
          onClick={() => setFilter('cancelled')}
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl p-10 text-center bg-surface-container-lowest border border-outline-variant/15">
          <Icon name="history" size={32} className="text-on-surface-variant/60" />
          <p className="mt-3 text-on-surface-variant">Sin pedidos en este filtro.</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/15 overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-surface-container-low text-xs uppercase tracking-wider text-on-surface-variant">
              <tr>
                <th className="text-left px-4 py-3">Short ID</th>
                <th className="text-left px-4 py-3">Restaurante</th>
                <th className="text-left px-4 py-3">Motorizado</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-right px-4 py-3">Monto</th>
                <th className="text-right px-4 py-3">Entregado / Cancelado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((o) => (
                <tr
                  key={o.id}
                  className="border-t border-outline-variant/10 hover:bg-surface-container-low/50"
                >
                  <td className="px-4 py-3 text-xs">
                    {o.client_name ? (
                      <div>
                        <div className="font-semibold">{o.client_name}</div>
                        <div className="font-mono text-on-surface-variant/70">#{o.short_id}</div>
                      </div>
                    ) : (
                      <span className="font-mono">#{o.short_id}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold">{o.restaurants?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-on-surface-variant">
                    {o.drivers?.full_name ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusChip status={o.status} />
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {Number(o.order_amount) === 0
                      ? 'No cobrar'
                      : `S/ ${Number(o.order_amount).toFixed(2)}`}
                  </td>
                  <td className="px-4 py-3 text-right text-on-surface-variant text-xs font-mono tabular-nums">
                    {fmtDateTime(o.delivered_at ?? o.cancelled_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="inline-flex items-center gap-1 text-primary font-bold text-xs hover:underline"
                    >
                      Ver
                      <Icon name="chevron_right" size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function FilterChip({
  label,
  active,
  onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold bg-primary-container text-on-primary shadow-[0_4px_20px_rgba(255,107,53,0.2)]'
          : 'inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold bg-surface-container-lowest border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low'
      }
    >
      {label}
    </button>
  )
}
