'use client'
import { Icon, Skeleton } from '@tindivo/ui'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import { useDriversPerformance } from '../hooks/use-drivers-performance'
import type { TimeRangeState } from '../hooks/use-time-range'
import { CHART_COLORS, VEHICLE_COLORS } from '../lib/color-tokens'
import { formatCurrency, formatDecimal, formatInt, formatPct } from '../lib/number-format'
import { ChartCard } from './charts/chart-card'
import { GlassTooltip } from './charts/glass-tooltip'

const VEHICLE_ICONS: Record<string, string> = {
  moto: 'two_wheeler',
  bicicleta: 'pedal_bike',
  pie: 'directions_walk',
  auto: 'directions_car',
}

// TODO(usuario): definir el comparador "driver más eficiente".
// Hoy ordeno por entregas DESC. Alternativas:
// - tiempo prom inverso (rápido pero pocos entregas mal)
// - (entregas / total_assigned) ponderado por volumen
// - (delivered - cancelled * 2) / avgDeliveryMinutes
function rankComparator(
  a: { delivered: number; totalAssigned: number; avgDeliveryMinutes: number | null },
  b: { delivered: number; totalAssigned: number; avgDeliveryMinutes: number | null },
) {
  return b.delivered - a.delivered || b.totalAssigned - a.totalAssigned
}

// TODO(usuario): umbral para alerta de sobre-dependencia de un solo driver.
// 0.6 = "más del 60% en uno solo". Sube/baja según tu tolerancia operativa.
const CONCENTRATION_THRESHOLD = 0.6

export function TabDrivers({ range }: { range: TimeRangeState }) {
  const { data, isLoading } = useDriversPerformance(range.queryCurrent)

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Skeleton className="h-96 rounded-2xl xl:col-span-2" />
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl xl:col-span-2" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    )
  }

  const rows = [...data.rows].sort(rankComparator)
  const totalDelivered = rows.reduce((s, r) => s + r.delivered, 0)
  const maxDelivered = rows.reduce((m, r) => (r.delivered > m ? r.delivered : m), 0)
  const topShare = totalDelivered > 0 ? (rows[0]?.delivered ?? 0) / totalDelivered : 0
  const isConcentrated = topShare >= CONCENTRATION_THRESHOLD
  const totalRejections = rows.reduce((s, r) => s + r.rejectionsCount, 0)
  const totalCommission = rows.reduce((s, r) => s + r.commissionGenerated, 0)
  const totalCash = rows.reduce((s, r) => s + r.cashCollected, 0)

  const barData = rows
    .filter((r) => r.delivered > 0)
    .slice(0, 10)
    .map((r) => ({
      name: r.fullName.split(' ')[0],
      delivered: r.delivered,
      color: VEHICLE_COLORS[r.vehicleType] ?? CHART_COLORS.primary,
    }))

  const scatterData = rows
    .filter((r) => r.delivered > 0 && r.avgDeliveryMinutes != null)
    .map((r) => ({
      x: r.delivered,
      y: r.avgDeliveryMinutes ?? 0,
      z: r.commissionGenerated,
      name: r.fullName,
      vehicle: r.vehicleType,
    }))

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <ChartCard
        title="Ranking de motorizados"
        subtitle={`${rows.length} activos · ${formatInt(totalDelivered)} entregas · ${formatCurrency(totalCommission)} comisión`}
        icon="leaderboard"
        className="xl:col-span-2"
      >
        {rows.length === 0 ? (
          <EmptyChart />
        ) : (
          <ul className="space-y-2">
            {rows.map((r, idx) => {
              const share = maxDelivered > 0 ? r.delivered / maxDelivered : 0
              const rejPct =
                r.totalAssigned > 0
                  ? (r.rejectionsCount / (r.totalAssigned + r.rejectionsCount)) * 100
                  : 0
              return (
                <li
                  key={r.driverId}
                  className="rounded-xl border border-outline-variant/15 bg-surface-container-low/50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-container/30 font-black text-primary">
                      #{idx + 1}
                    </span>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-on-surface-variant">
                      <Icon name={VEHICLE_ICONS[r.vehicleType] ?? 'two_wheeler'} size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-on-surface">
                        {r.fullName}
                        {!r.isActive && (
                          <span className="ml-2 rounded-full bg-surface-container px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                            inactivo
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        {formatInt(r.delivered)} entregas ·{' '}
                        {r.cancelled > 0 ? `${formatInt(r.cancelled)} cancelados · ` : ''}
                        {formatDecimal(r.avgDeliveryMinutes)} min prom
                      </p>
                    </div>
                    <div className="hidden text-right md:block">
                      <p className="text-[10px] uppercase tracking-[0.15em] text-on-surface-variant">
                        Comisión
                      </p>
                      <p className="font-black tabular-nums text-primary">
                        {formatCurrency(r.commissionGenerated)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-primary-container"
                      style={{ width: `${share * 100}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-on-surface-variant">
                    <span className="md:hidden">
                      <strong className="text-primary">
                        {formatCurrency(r.commissionGenerated)}
                      </strong>{' '}
                      comisión
                    </span>
                    <span>
                      Efectivo cobrado: <strong>{formatCurrency(r.cashCollected)}</strong>
                    </span>
                    {r.rejectionsCount > 0 && (
                      <span>
                        Rechazos: <strong>{formatInt(r.rejectionsCount)}</strong> (
                        {formatPct(rejPct, 0)})
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </ChartCard>

      <ChartCard
        title="Distribución de carga"
        subtitle="cuánto depende el negocio de un solo motorizado"
        icon="balance"
      >
        {totalDelivered === 0 ? (
          <EmptyChart />
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.15em] text-on-surface-variant">
                Top motorizado concentra
              </p>
              <p className="font-black text-4xl tabular-nums text-on-surface">
                {formatPct(topShare * 100, 1)}
              </p>
              <p className="mt-1 text-xs text-on-surface-variant">
                de las {formatInt(totalDelivered)} entregas del período
              </p>
            </div>
            {isConcentrated && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="flex items-center gap-1.5 text-sm font-bold text-amber-800">
                  <Icon name="warning" size={16} filled /> Alta dependencia
                </p>
                <p className="mt-1 text-xs text-amber-700">
                  Si {rows[0]?.fullName.split(' ')[0]} no opera, perderías mucha capacidad.
                  Considera expandir el equipo o redistribuir horarios.
                </p>
              </div>
            )}
            <div className="rounded-xl bg-surface-container-low p-3">
              <p className="text-[11px] uppercase tracking-[0.15em] text-on-surface-variant">
                Efectivo total cobrado en el período
              </p>
              <p className="font-black text-xl tabular-nums text-on-surface">
                {formatCurrency(totalCash, { decimals: true })}
              </p>
              <p className="mt-1 text-[11px] text-on-surface-variant">
                ⓘ Suma de cash_amount entregado a restaurantes vía cash_settlements.
              </p>
            </div>
          </div>
        )}
      </ChartCard>

      <ChartCard
        title="Comparativa de entregas"
        subtitle="bar chart por motorizado"
        icon="bar_chart"
        className="xl:col-span-2"
      >
        {barData.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={barData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid stroke={CHART_COLORS.outline} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" stroke={CHART_COLORS.onSurfaceVariant} fontSize={11} />
              <YAxis stroke={CHART_COLORS.onSurfaceVariant} fontSize={11} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <GlassTooltip
                      title={String(label)}
                      rows={[
                        {
                          label: 'Entregas',
                          value: formatInt(Number(payload[0]?.value ?? 0)),
                          color: String(payload[0]?.payload?.color ?? CHART_COLORS.primary),
                        },
                      ]}
                    />
                  )
                }}
              />
              <Bar dataKey="delivered" radius={[8, 8, 0, 0]}>
                {barData.map((d) => (
                  <Bar key={d.name} dataKey="delivered" fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard
        title="Volumen vs eficiencia"
        subtitle="X: entregas · Y: minutos promedio entrega · tamaño: comisión"
        icon="scatter_plot"
      >
        {scatterData.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ top: 10, right: 10, bottom: 5, left: -10 }}>
              <CartesianGrid stroke={CHART_COLORS.outline} strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="x"
                name="entregas"
                stroke={CHART_COLORS.onSurfaceVariant}
                fontSize={11}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="min"
                unit="m"
                stroke={CHART_COLORS.onSurfaceVariant}
                fontSize={11}
              />
              <ZAxis type="number" dataKey="z" range={[80, 360]} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const p = payload[0]?.payload
                  return (
                    <GlassTooltip
                      title={String(p?.name ?? '')}
                      rows={[
                        { label: 'Entregas', value: formatInt(Number(p?.x ?? 0)) },
                        { label: 'Min prom', value: formatDecimal(Number(p?.y ?? 0)) },
                        { label: 'Comisión', value: formatCurrency(Number(p?.z ?? 0)) },
                      ]}
                    />
                  )
                }}
              />
              <Scatter data={scatterData} fill={CHART_COLORS.primary} />
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard
        title="Rechazos de asignación"
        subtitle="cuántas veces los drivers rechazaron pedidos asignados"
        icon="block"
        className="xl:col-span-3"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-surface-container-low p-4">
            <p className="text-[11px] uppercase tracking-[0.15em] text-on-surface-variant">
              Total rechazos
            </p>
            <p className="font-black text-3xl tabular-nums text-on-surface">
              {formatInt(totalRejections)}
            </p>
            <p className="text-xs text-on-surface-variant">
              {totalRejections === 0
                ? 'Buen flujo de asignación: nadie rechazó pedidos en el período.'
                : 'Tracking individual de calidad operativa por driver.'}
            </p>
          </div>
          <div className="md:col-span-2">
            {rows.filter((r) => r.rejectionsCount > 0).length === 0 ? (
              <p className="rounded-xl bg-surface-container-low p-4 text-sm text-on-surface-variant">
                Sin rechazos en este período. Si esperabas datos aquí, revisa que los drivers usen
                el botón "Rechazar pedido" desde su PWA.
              </p>
            ) : (
              <ul className="space-y-2">
                {rows
                  .filter((r) => r.rejectionsCount > 0)
                  .sort((a, b) => b.rejectionsCount - a.rejectionsCount)
                  .map((r) => (
                    <li
                      key={r.driverId}
                      className="flex items-center justify-between rounded-xl border border-outline-variant/15 bg-white p-3"
                    >
                      <span className="font-semibold">{r.fullName}</span>
                      <span className="font-black tabular-nums text-rose-700">
                        {formatInt(r.rejectionsCount)}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>
      </ChartCard>
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="flex h-60 items-center justify-center text-sm text-on-surface-variant">
      Sin datos en este rango.
    </div>
  )
}
