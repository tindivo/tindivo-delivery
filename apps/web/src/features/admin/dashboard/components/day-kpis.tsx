'use client'
import type { AdminDailySummary } from '@tindivo/api-client'
import { KpiCard, Skeleton } from '@tindivo/ui'

const money = (n: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n)

function fmtMin(seconds: number | null): string {
  if (seconds == null || !Number.isFinite(seconds)) return '—'
  const mins = Math.round(seconds / 60)
  return `${mins} min`
}

/**
 * KPIs del día (Lima) — fila superior del dashboard. Mezcla volumen,
 * comerciales y operación en una sola lectura rápida.
 */
export function DayKpis({ data, isLoading }: { data?: AdminDailySummary; isLoading: boolean }) {
  if (isLoading || !data) {
    const skelKeys = ['orders', 'cancelled', 'gmv', 'commission', 'aov', 'time', 'ontime', 'cash']
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {skelKeys.map((k) => (
          <Skeleton key={`kpi-skel-${k}`} className="h-24" />
        ))}
      </div>
    )
  }

  const { totals, commercials, operations, cash } = data

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      <KpiCard
        label="Pedidos del día"
        value={String(totals.orders)}
        hint={`${totals.delivered} entregados · ${totals.inProgress} en curso`}
        icon="receipt_long"
        variant="info"
      />
      <KpiCard
        label="Cancelados"
        value={`${totals.cancelled} (${totals.cancellationPct}%)`}
        hint="del total del día"
        icon="cancel"
        variant={totals.cancellationPct > 15 ? 'danger' : 'warning'}
      />
      <KpiCard
        label="GMV"
        value={money(commercials.gmv)}
        hint={`${totals.delivered} pedidos`}
        icon="payments"
        variant="success"
      />
      <KpiCard
        label="Comisión Tindivo"
        value={money(commercials.commissionRevenue)}
        hint="ingreso del día"
        icon="account_balance_wallet"
        variant="success"
      />
      <KpiCard
        label="Ticket promedio"
        value={commercials.avgOrderValue != null ? money(commercials.avgOrderValue) : '—'}
        hint="GMV / entregados"
        icon="trending_up"
        variant="neutral"
      />
      <KpiCard
        label="Tiempo promedio"
        value={fmtMin(operations.avgTotalSeconds)}
        hint="creación → entrega"
        icon="schedule"
        variant="neutral"
      />
      <KpiCard
        label="A tiempo"
        value={operations.onTimePct != null ? `${operations.onTimePct}%` : '—'}
        hint={`${operations.overdueAcceptedCount} overdue de ${operations.acceptedTotal}`}
        icon="check_circle"
        variant={
          operations.onTimePct == null
            ? 'neutral'
            : operations.onTimePct >= 90
              ? 'success'
              : operations.onTimePct >= 75
                ? 'warning'
                : 'danger'
        }
      />
      <KpiCard
        label="Efectivo en circulación"
        value={money(cash.pendingDeliveredToRestaurant)}
        hint={`${cash.cashOrdersDelivered} pedidos cash entregados`}
        icon="paid"
        variant="warning"
      />
    </div>
  )
}
