'use client'
import { useAdminActiveOrders } from '@/features/admin/dashboard/hooks/use-admin-active-orders'
import { Icon, Skeleton, StatusChip } from '@tindivo/ui'
import Link from 'next/link'

export default function AdminOrdersListPage() {
  const { data, isLoading } = useAdminActiveOrders()
  // biome-ignore lint/suspicious/noExplicitAny: payload dinámico con columnas anidadas (restaurants, drivers)
  const items = (data?.items ?? []) as any[]

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="bleed-text font-black text-3xl text-on-surface">Pedidos</h1>
          <p className="text-on-surface-variant text-sm mt-1">Todos los pedidos activos del día</p>
        </div>
        <Link
          href="/admin/orders/historial"
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 bg-surface-container-lowest border border-outline-variant/30 text-sm font-semibold hover:shadow-[0_4px_20px_rgba(171,53,0,0.04)] transition-shadow"
        >
          <Icon name="history" size={18} />
          Ver historial
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl p-10 text-center bg-surface-container-lowest border border-outline-variant/15">
          <Icon name="inbox" size={32} className="text-on-surface-variant/60" />
          <p className="mt-3 text-on-surface-variant">Sin pedidos activos ahora mismo.</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/15 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low text-xs uppercase tracking-wider text-on-surface-variant">
              <tr>
                <th className="text-left px-4 py-3">Short ID</th>
                <th className="text-left px-4 py-3">Restaurante</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-right px-4 py-3">Monto</th>
                <th className="text-right px-4 py-3">Creado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((o) => (
                <tr
                  key={o.id}
                  className="border-t border-outline-variant/10 hover:bg-surface-container-low/50"
                >
                  <td className="px-4 py-3 font-mono text-xs">#{o.short_id}</td>
                  <td className="px-4 py-3 font-semibold">{o.restaurants?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <StatusChip status={o.status} />
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {Number(o.order_amount) === 0
                      ? 'No cobrar'
                      : `S/ ${Number(o.order_amount).toFixed(2)}`}
                  </td>
                  <td className="px-4 py-3 text-right text-on-surface-variant text-xs">
                    {o.created_at ? new Date(o.created_at).toLocaleTimeString('es-PE') : '—'}
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
