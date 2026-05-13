'use client'
import { Icon, Skeleton } from '@tindivo/ui'
import { useMetricsSummary } from '../hooks/use-metrics-summary'
import { useSalesTimeseries } from '../hooks/use-sales-timeseries'
import type { TimeRangeState } from '../hooks/use-time-range'
import { CHART_COLORS } from '../lib/color-tokens'
import { deltaPct, formatCurrency, formatInt, formatPct } from '../lib/number-format'
import { DeltaPill } from './charts/delta-pill'
import { Sparkline } from './charts/sparkline'

/**
 * Banda superior con 4 KPIs grandes: GMV, Comisión, Pedidos entregados, AOV.
 * Cada uno muestra Δ% vs período anterior si compare=true, y una sparkline
 * con la serie diaria del rango (cuando hay >1 punto).
 */
export function SummaryBanner({ range }: { range: TimeRangeState }) {
  const current = useMetricsSummary(range.queryCurrent, {
    // refrescar cada 30s solo si el rango incluye hoy (preset="today" o custom hasta hoy)
    refetchInterval: range.preset === 'today' ? 30_000 : false,
  })
  const previous = useMetricsSummary(range.queryPrevious ?? range.queryCurrent, {
    refetchInterval: false,
  })
  const series = useSalesTimeseries(range.queryCurrent)

  const isLoading = current.isLoading
  const summary = current.data
  const prev = range.compare ? previous.data : undefined
  const points = series.data?.points ?? []

  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <BannerCard
        label="GMV"
        value={formatCurrency(summary.gmv, { decimals: true })}
        icon="trending_up"
        delta={prev ? deltaPct(summary.gmv, prev.gmv) : null}
        previousValue={prev ? formatCurrency(prev.gmv) : undefined}
        spark={points.map((p) => ({ v: p.gmv }))}
        sparkColor={CHART_COLORS.primary}
      />
      <BannerCard
        label="Comisión Tindivo"
        value={formatCurrency(summary.commission, { decimals: true })}
        icon="payments"
        delta={prev ? deltaPct(summary.commission, prev.commission) : null}
        previousValue={prev ? formatCurrency(prev.commission) : undefined}
        spark={points.map((p) => ({ v: p.commission }))}
        sparkColor={CHART_COLORS.primaryContainer}
      />
      <BannerCard
        label="Pedidos entregados"
        value={formatInt(summary.delivered)}
        icon="check_circle"
        delta={prev ? deltaPct(summary.delivered, prev.delivered) : null}
        previousValue={prev ? formatInt(prev.delivered) : undefined}
        spark={points.map((p) => ({ v: p.delivered }))}
        sparkColor={CHART_COLORS.success}
        hint={
          summary.cancelled > 0
            ? `${summary.cancelled} cancelados (${formatPct(summary.cancellationPct, 1)})`
            : 'sin cancelaciones'
        }
      />
      <BannerCard
        label="Ticket promedio"
        value={formatCurrency(summary.aov, { decimals: true })}
        icon="receipt_long"
        delta={prev ? deltaPct(summary.aov, prev.aov) : null}
        previousValue={prev ? formatCurrency(prev.aov) : undefined}
        spark={points.map((p) => ({ v: p.aov }))}
        sparkColor={CHART_COLORS.info}
      />
    </div>
  )
}

function BannerCard({
  label,
  value,
  icon,
  delta,
  previousValue,
  hint,
  spark,
  sparkColor,
}: {
  label: string
  value: string
  icon: string
  delta: number | null
  previousValue?: string
  hint?: string
  spark: { v: number }[]
  sparkColor: string
}) {
  return (
    <article className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-4 shadow-[0_4px_20px_rgba(171,53,0,0.04)] md:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-container/30 text-primary">
          <Icon name={icon} size={18} filled />
        </span>
        {delta != null && <DeltaPill delta={delta} previousValue={previousValue} />}
      </div>
      <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.15em] text-on-surface-variant">
        {label}
      </p>
      <p className="mt-1 font-black text-2xl tracking-tight tabular-nums text-on-surface md:text-3xl">
        {value}
      </p>
      {hint && <p className="mt-1 text-[11px] text-on-surface-variant">{hint}</p>}
      {spark.length > 1 && (
        <div className="mt-3">
          <Sparkline data={spark} dataKey="v" color={sparkColor} height={32} />
        </div>
      )}
    </article>
  )
}
