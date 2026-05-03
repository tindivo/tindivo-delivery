'use client'
import type { AdminDailySummaryDriverRow } from '@tindivo/api-client'
import { Card, EmptyState, Icon, Skeleton } from '@tindivo/ui'

const money = (n: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n)

const VEHICLE_ICON: Record<string, string> = {
  moto: 'two_wheeler',
  bicicleta: 'pedal_bike',
  pie: 'directions_walk',
  auto: 'directions_car',
}

/**
 * Breakdown del día por motorizado. Ordenado por entregados desc.
 * "Comisión generada" = revenue que el driver produjo para Tindivo
 * (suma de delivery_fee de sus entregas del día).
 */
export function DriversBreakdown({
  rows,
  isLoading,
}: {
  rows?: AdminDailySummaryDriverRow[]
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
        icon="two_wheeler"
        title="Ningún motorizado activo"
        description="Aparecerán aquí cuando reciban su primer pedido del día."
      />
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] font-bold tracking-[0.16em] uppercase text-on-surface-variant border-b border-outline-variant/15">
              <th className="text-left px-4 py-3">Motorizado</th>
              <th className="text-right px-3 py-3">Total</th>
              <th className="text-right px-3 py-3">Entregados</th>
              <th className="text-right px-3 py-3">En curso</th>
              <th className="text-right px-3 py-3">Cancelados</th>
              <th className="text-right px-4 py-3">Comisión generada</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {rows.map((d) => (
              <tr key={d.driverId} className="hover:bg-surface-container/40">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {d.vehicleType && (
                      <Icon
                        name={VEHICLE_ICON[d.vehicleType] ?? 'two_wheeler'}
                        size={16}
                        className="text-on-surface-variant"
                      />
                    )}
                    <span className="font-semibold text-on-surface truncate">{d.fullName}</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-right tabular-nums font-semibold">{d.total}</td>
                <td className="px-3 py-3 text-right tabular-nums text-emerald-700 font-bold">
                  {d.delivered}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {d.inProgress > 0 ? (
                    <span className="text-amber-700 font-semibold">{d.inProgress}</span>
                  ) : (
                    <span className="text-on-surface-variant">0</span>
                  )}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {d.cancelled > 0 ? (
                    <span className="text-red-700 font-semibold">{d.cancelled}</span>
                  ) : (
                    <span className="text-on-surface-variant">0</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-bold">
                  {money(d.commissionGenerated)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
