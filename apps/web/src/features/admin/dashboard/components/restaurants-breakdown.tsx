'use client'
import type { AdminDailySummaryRestaurantRow } from '@tindivo/api-client'
import { Card, ColorDot, EmptyState, Skeleton } from '@tindivo/ui'

const money = (n: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n)

/**
 * Breakdown del día por restaurante. Ordenado por volumen de pedidos.
 * "Comisión" = lo que el restaurante debe pagar a Tindivo por los pedidos
 * entregados hoy (delivery_fee snapshotted en cada order).
 */
export function RestaurantsBreakdown({
  rows,
  isLoading,
}: {
  rows?: AdminDailySummaryRestaurantRow[]
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
      </div>
    )
  }

  if (!rows || rows.length === 0) {
    return (
      <EmptyState
        icon="restaurant"
        title="Sin actividad"
        description="Cuando los restaurantes empiecen a pedir aparecerá el desglose aquí."
      />
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] font-bold tracking-[0.16em] uppercase text-on-surface-variant border-b border-outline-variant/15">
              <th className="text-left px-4 py-3">Restaurante</th>
              <th className="text-right px-3 py-3">Total</th>
              <th className="text-right px-3 py-3">Entregados</th>
              <th className="text-right px-3 py-3">Cancelados</th>
              <th className="text-right px-3 py-3">GMV</th>
              <th className="text-right px-4 py-3">Comisión Tindivo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {rows.map((r) => (
              <tr key={r.restaurantId} className="hover:bg-surface-container/40">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <ColorDot color={r.accentColor} size={10} label={r.name} />
                    <span className="font-semibold text-on-surface truncate">{r.name}</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-right tabular-nums font-semibold">{r.total}</td>
                <td className="px-3 py-3 text-right tabular-nums">{r.delivered}</td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {r.cancelled > 0 ? (
                    <span className="text-red-700 font-semibold">{r.cancelled}</span>
                  ) : (
                    <span className="text-on-surface-variant">0</span>
                  )}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">{money(r.gmv)}</td>
                <td className="px-4 py-3 text-right tabular-nums font-bold text-on-surface">
                  {money(r.commission)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
