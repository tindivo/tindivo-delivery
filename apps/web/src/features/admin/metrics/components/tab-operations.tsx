'use client'
import { Icon, Skeleton } from '@tindivo/ui'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { useCancellationReasons } from '../hooks/use-cancellation-reasons'
import { useDemandHeatmap } from '../hooks/use-demand-heatmap'
import { useOperationsFunnel } from '../hooks/use-operations-funnel'
import type { TimeRangeState } from '../hooks/use-time-range'
import { CHART_COLORS } from '../lib/color-tokens'
import { formatDecimal, formatDurationMinutes, formatInt, formatPct } from '../lib/number-format'
import { ChartCard } from './charts/chart-card'
import { GlassTooltip } from './charts/glass-tooltip'
import { Heatmap } from './charts/heatmap'

const REASON_LABELS: Record<string, string> = {
  unspecified: 'Sin motivo registrado',
  restaurant_request: 'Pedido por restaurante',
  test_cleanup: 'Limpieza de tests',
  driver_rejected: 'Driver rechazó',
  customer_request: 'Cliente canceló',
  out_of_stock: 'Sin stock',
  timeout: 'Timeout',
}

const REASON_COLORS = ['#94a3b8', '#f26241', '#7c3aed', '#eab308', '#059669', '#2563eb', '#ba1a1a']

// TODO(usuario): definir margen de "on-time delivery" en el SQL (RPC
// admin_operations_funnel). Hoy = delivered_at <= estimated_ready_at + 15 min.
// Si quieres ser más estricto, cambia el `interval '15 minutes'` en la RPC.

export function TabOperations({ range }: { range: TimeRangeState }) {
  const heatmap = useDemandHeatmap(range.queryCurrent)
  const funnel = useOperationsFunnel(range.queryCurrent)
  const cancel = useCancellationReasons(range.queryCurrent)

  if (heatmap.isLoading || funnel.isLoading || cancel.isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Skeleton className="h-96 rounded-2xl xl:col-span-3" />
        <Skeleton className="h-72 rounded-2xl xl:col-span-2" />
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl xl:col-span-2" />
      </div>
    )
  }

  const funnelData = funnel.data
  const segments = [
    {
      label: 'Asignar driver',
      value: funnelData?.avgMinToAssign,
      color: '#94a3b8',
    },
    {
      label: 'Aceptar',
      value: funnelData?.avgMinToAccept,
      color: '#7c3aed',
    },
    {
      label: 'Ruta al local',
      value: funnelData?.avgMinInRouteToRestaurant,
      color: '#eab308',
    },
    {
      label: 'Espera en local',
      value: funnelData?.avgMinWaitAtRestaurant,
      color: '#f59e0b',
    },
    {
      label: 'Entrega',
      value: funnelData?.avgMinPickupToDeliver,
      color: '#059669',
    },
  ].map((s) => ({ ...s, value: s.value == null || s.value < 0 ? 0 : s.value }))
  const segmentsTotal = segments.reduce((s, x) => s + x.value, 0)

  const reasons = cancel.data
  const reasonsData =
    reasons?.rows.map((r, i) => ({
      name: REASON_LABELS[r.cancelReasonCode] ?? r.cancelReasonCode,
      value: r.count,
      color: REASON_COLORS[i % REASON_COLORS.length] ?? CHART_COLORS.primary,
    })) ?? []

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <ChartCard
        title="Demanda por día y hora"
        subtitle="picos de pedidos en hora Lima"
        icon="local_fire_department"
        className="xl:col-span-3"
      >
        {heatmap.data && heatmap.data.cells.length > 0 ? (
          <Heatmap cells={heatmap.data.cells} maxOrders={heatmap.data.maxOrders} />
        ) : (
          <EmptyChart />
        )}
      </ChartCard>

      <ChartCard
        title="Tiempos del flujo operacional"
        subtitle={`promedio sobre ${formatInt(funnelData?.totalDelivered ?? 0)} entregas`}
        icon="schedule"
        className="xl:col-span-2"
      >
        {(funnelData?.totalDelivered ?? 0) === 0 ? (
          <EmptyChart />
        ) : (
          <div className="space-y-4">
            <p className="text-[11px] uppercase tracking-[0.15em] text-on-surface-variant">
              Total entrega promedio:{' '}
              <strong className="text-on-surface">
                {formatDurationMinutes(funnelData?.avgMinTotal ?? null)}
              </strong>
            </p>
            <div className="flex h-10 w-full overflow-hidden rounded-xl border border-outline-variant/30">
              {segments.map((s) => {
                const w = segmentsTotal > 0 ? (s.value / segmentsTotal) * 100 : 0
                return (
                  <div
                    key={s.label}
                    title={`${s.label}: ${formatDurationMinutes(s.value)}`}
                    className="flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ width: `${w}%`, background: s.color }}
                  >
                    {w > 8 && formatDurationMinutes(s.value)}
                  </div>
                )
              })}
            </div>
            <ul className="grid grid-cols-2 gap-2 md:grid-cols-5">
              {segments.map((s) => (
                <li key={s.label} className="rounded-xl bg-surface-container-low p-2 text-center">
                  <span className="mb-1 block h-1.5 rounded-full" style={{ background: s.color }} />
                  <p className="text-[10px] uppercase tracking-[0.15em] text-on-surface-variant">
                    {s.label}
                  </p>
                  <p className="font-black tabular-nums text-on-surface">
                    {formatDurationMinutes(s.value)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </ChartCard>

      <ChartCard title="On-time delivery" subtitle="tolerancia +15 min" icon="check_circle">
        {(funnelData?.totalDelivered ?? 0) === 0 ? (
          <EmptyChart />
        ) : (
          <div className="space-y-2">
            <p className="font-black text-5xl tabular-nums text-emerald-700">
              {formatPct(funnelData?.onTimePct ?? null, 1)}
            </p>
            <p className="text-xs text-on-surface-variant">
              {formatInt(funnelData?.onTimeCount ?? 0)} de{' '}
              {formatInt(funnelData?.totalDelivered ?? 0)} entregas a tiempo
            </p>
            <div className="mt-3 rounded-xl bg-surface-container-low p-3">
              <p className="text-[11px] uppercase tracking-[0.15em] text-on-surface-variant">
                Percentiles del tiempo total
              </p>
              <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
                <PercentilePill label="P50" value={funnelData?.p50MinTotal ?? null} />
                <PercentilePill label="P90" value={funnelData?.p90MinTotal ?? null} />
                <PercentilePill label="P95" value={funnelData?.p95MinTotal ?? null} />
              </dl>
              <p className="mt-2 text-[10px] text-on-surface-variant">
                P95: 95% de los pedidos se entregan en este tiempo o menos.
              </p>
            </div>
          </div>
        )}
      </ChartCard>

      <ChartCard
        title="Motivos de cancelación"
        subtitle={`${formatInt(reasons?.total ?? 0)} cancelaciones en el rango`}
        icon="cancel"
        right={
          reasons && reasons.unspecifiedPct >= 50 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800">
              <Icon name="warning" size={12} filled /> Datos incompletos
            </span>
          ) : null
        }
      >
        {(reasons?.total ?? 0) === 0 ? (
          <EmptyChart />
        ) : (
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="md:flex-1">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={reasonsData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {reasonsData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const p = payload[0]
                      return (
                        <GlassTooltip
                          title={String(p?.name ?? '')}
                          rows={[
                            {
                              label: 'Cancelaciones',
                              value: formatInt(Number(p?.value ?? 0)),
                              color: String(p?.payload?.color ?? CHART_COLORS.primary),
                            },
                          ]}
                        />
                      )
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="md:flex-1 space-y-1.5">
              {reasonsData.map((r) => (
                <li key={r.name} className="flex items-center gap-2 text-sm">
                  <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />
                  <span className="flex-1 truncate text-on-surface-variant">{r.name}</span>
                  <span className="font-bold tabular-nums text-on-surface">
                    {formatInt(r.value)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {reasons && reasons.unspecifiedPct >= 50 && (
          <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
            <strong>{formatPct(reasons.unspecifiedPct, 1)}</strong> de las cancelaciones no
            registraron un motivo estructurado (cancel_reason_code). Mejorando el flow de
            cancelación con un selector obligatorio podrías analizar mucho mejor estas pérdidas.
          </p>
        )}
      </ChartCard>
    </div>
  )
}

function PercentilePill({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-lg bg-white p-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant">
        {label}
      </p>
      <p className="font-black tabular-nums text-on-surface">
        {value == null ? '—' : formatDecimal(value, 0)}m
      </p>
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="flex h-40 items-center justify-center text-sm text-on-surface-variant">
      Sin datos en este rango.
    </div>
  )
}
