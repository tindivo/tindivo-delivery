'use client'
import { Skeleton } from '@tindivo/ui'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useSalesTimeseries } from '../hooks/use-sales-timeseries'
import type { TimeRangeState } from '../hooks/use-time-range'
import { CHART_COLORS, PAYMENT_COLORS, SOURCE_COLORS } from '../lib/color-tokens'
import { formatCurrency, formatDayShortFromIso, formatInt, formatPct } from '../lib/number-format'
import { rangeDays } from '../lib/range-presets'
import { ChartCard } from './charts/chart-card'
import { GlassTooltip } from './charts/glass-tooltip'

export function TabSales({ range }: { range: TimeRangeState }) {
  const { data, isLoading } = useSalesTimeseries(range.queryCurrent)

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Skeleton className="h-72 rounded-2xl xl:col-span-2" />
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl xl:col-span-2" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    )
  }

  const points = data.points
  const days = rangeDays(range.range)
  const totalGmv = data.totals.gmv

  const paymentData = sumPayments(points)
  const sourceData = points.map((p) => ({
    day: formatDayShortFromIso(p.day),
    Restaurante: p.restaurantOrders,
    Marketplace: p.marketplaceOrders,
  }))
  const projection = monthlyProjection(totalGmv, days)

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <ChartCard
        title="Evolución de ventas y comisión"
        subtitle={`${points.length} días · ${formatCurrency(totalGmv, { decimals: true })} GMV`}
        icon="show_chart"
        className="xl:col-span-2"
      >
        {points.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={points} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gmvFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="commissionFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.primaryContainer} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={CHART_COLORS.primaryContainer} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={CHART_COLORS.outline} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="day"
                tickFormatter={formatDayShortFromIso}
                stroke={CHART_COLORS.onSurfaceVariant}
                fontSize={11}
                tickMargin={8}
              />
              <YAxis
                stroke={CHART_COLORS.onSurfaceVariant}
                fontSize={11}
                tickFormatter={(v) => `S/${v}`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <GlassTooltip
                      title={formatDayShortFromIso(String(label))}
                      rows={[
                        {
                          label: 'GMV',
                          value: formatCurrency(Number(payload[0]?.payload?.gmv ?? 0), {
                            decimals: true,
                          }),
                          color: CHART_COLORS.primary,
                        },
                        {
                          label: 'Comisión',
                          value: formatCurrency(Number(payload[0]?.payload?.commission ?? 0), {
                            decimals: true,
                          }),
                          color: CHART_COLORS.primaryContainer,
                        },
                        {
                          label: 'Pedidos',
                          value: formatInt(Number(payload[0]?.payload?.delivered ?? 0)),
                        },
                      ]}
                    />
                  )
                }}
              />
              <Area
                type="monotone"
                dataKey="gmv"
                stroke={CHART_COLORS.primary}
                strokeWidth={2.5}
                fill="url(#gmvFill)"
              />
              <Area
                type="monotone"
                dataKey="commission"
                stroke={CHART_COLORS.primaryContainer}
                strokeWidth={2}
                fill="url(#commissionFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard
        title="Método de pago"
        subtitle="distribución de pedidos entregados"
        icon="payments"
      >
        {paymentData.every((p) => p.value === 0) ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={paymentData}
                dataKey="value"
                nameKey="name"
                innerRadius={56}
                outerRadius={92}
                paddingAngle={2}
                strokeWidth={2}
              >
                {paymentData.map((entry) => (
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
                          label: 'Pedidos',
                          value: formatInt(Number(p?.value ?? 0)),
                          color: String(p?.payload?.color ?? CHART_COLORS.primary),
                        },
                      ]}
                    />
                  )
                }}
              />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard
        title="Origen del pedido"
        subtitle="Restaurant PWA (staff) vs Marketplace (cliente final)"
        icon="storefront"
        className="xl:col-span-2"
      >
        {sourceData.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={sourceData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid stroke={CHART_COLORS.outline} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" stroke={CHART_COLORS.onSurfaceVariant} fontSize={11} />
              <YAxis stroke={CHART_COLORS.onSurfaceVariant} fontSize={11} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <GlassTooltip
                      title={String(label)}
                      rows={payload.map((p) => ({
                        label: String(p.name),
                        value: formatInt(Number(p.value ?? 0)),
                        color: String(p.color ?? CHART_COLORS.primary),
                      }))}
                    />
                  )
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
              <Bar
                dataKey="Restaurante"
                stackId="orders"
                fill={SOURCE_COLORS.restaurant_pwa}
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="Marketplace"
                stackId="orders"
                fill={SOURCE_COLORS.customer_pwa}
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Proyección del mes" subtitle="estimación lineal" icon="insights">
        {projection.daysOfMonth === 0 ? (
          <EmptyChart />
        ) : (
          <div className="space-y-2">
            <div>
              <p className="text-[11px] uppercase tracking-[0.15em] text-on-surface-variant">
                Mes completo proyectado
              </p>
              <p className="font-black text-3xl tabular-nums text-primary">
                {formatCurrency(projection.projected, { decimals: true })}
              </p>
              <p className="text-xs text-on-surface-variant">
                basado en {formatCurrency(projection.actual, { decimals: true })} en{' '}
                {projection.daysElapsed} de {projection.daysOfMonth} días
              </p>
            </div>
            <div className="rounded-xl bg-surface-container-low p-3">
              <p className="text-[11px] uppercase tracking-[0.15em] text-on-surface-variant">
                Comisión proyectada
              </p>
              <p className="font-black text-xl tabular-nums text-on-surface">
                {formatCurrency(projection.projectedCommission, { decimals: true })}
              </p>
            </div>
            <p className="text-[11px] text-on-surface-variant">
              ⓘ Asume ritmo constante; los fines de semana suelen vender más.
            </p>
          </div>
        )}
      </ChartCard>

      <section className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-5 shadow-[0_4px_20px_rgba(171,53,0,0.04)] md:p-6 xl:col-span-3">
        <h3 className="mb-4 text-sm font-bold text-on-surface">Detalle por día</h3>
        <div className="-mx-5 overflow-x-auto md:-mx-6">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-surface-container-low text-xs font-bold uppercase tracking-[0.12em] text-on-surface-variant">
              <tr>
                <th className="px-5 py-3 text-left md:px-6">Día</th>
                <th className="px-3 py-3 text-right">Pedidos</th>
                <th className="px-3 py-3 text-right">Entregados</th>
                <th className="px-3 py-3 text-right">Cancelados</th>
                <th className="px-3 py-3 text-right">GMV</th>
                <th className="px-3 py-3 text-right">Comisión</th>
                <th className="px-5 py-3 text-right md:px-6">AOV</th>
              </tr>
            </thead>
            <tbody>
              {[...points].reverse().map((p) => (
                <tr key={p.day} className="border-t border-outline-variant/10">
                  <td className="px-5 py-3 font-semibold md:px-6">
                    {formatDayShortFromIso(p.day)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatInt(p.orders)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-emerald-700">
                    {formatInt(p.delivered)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {p.cancelled > 0 ? (
                      <span className="text-rose-700">{formatInt(p.cancelled)}</span>
                    ) : (
                      <span className="text-on-surface-variant">0</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right font-bold tabular-nums">
                    {formatCurrency(p.gmv, { decimals: true })}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-primary">
                    {formatCurrency(p.commission, { decimals: true })}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums md:px-6">
                    {formatCurrency(p.aov, { decimals: true })}
                  </td>
                </tr>
              ))}
              {points.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-on-surface-variant">
                    Sin datos en este rango.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {data.totals.orders > 0 && (
          <p className="mt-3 text-xs text-on-surface-variant">
            Tasa de cancelación del período:{' '}
            <strong>
              {formatPct((data.totals.cancelled / Math.max(1, data.totals.orders)) * 100, 1)}
            </strong>
          </p>
        )}
      </section>
    </div>
  )
}

function sumPayments(
  points: { cashOrders: number; yapeOrders: number; mixedOrders: number; prepaidOrders: number }[],
) {
  let cash = 0
  let yape = 0
  let mixed = 0
  let prepaid = 0
  for (const p of points) {
    cash += p.cashOrders
    yape += p.yapeOrders
    mixed += p.mixedOrders
    prepaid += p.prepaidOrders
  }
  return [
    { name: 'Yape al entregar', value: yape, color: PAYMENT_COLORS.yape },
    { name: 'Efectivo', value: cash, color: PAYMENT_COLORS.cash },
    { name: 'Mixto', value: mixed, color: PAYMENT_COLORS.mixed },
    { name: 'Prepago', value: prepaid, color: PAYMENT_COLORS.prepaid },
  ].filter((s) => s.value > 0)
}

function monthlyProjection(currentGmv: number, rangeDaysCount: number) {
  // Si el rango no encaja con un mes, hago la proyección sobre los días del
  // rango contra los días del mes en curso (en Lima).
  const now = new Date()
  const limaNow = new Date(now.getTime() - 5 * 3600 * 1000)
  const y = limaNow.getUTCFullYear()
  const m = limaNow.getUTCMonth()
  const daysOfMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  const daysElapsed = Math.min(daysOfMonth, Math.max(1, rangeDaysCount))
  const ratio = daysOfMonth / daysElapsed
  return {
    daysOfMonth,
    daysElapsed,
    actual: currentGmv,
    projected: currentGmv * ratio,
    // TODO(usuario): ajustar el ratio comisión/GMV según commission_per_order
    // promedio de tus restaurantes activos. Hoy es heurística constante ~14%.
    projectedCommission: currentGmv * ratio * 0.14,
  }
}

function EmptyChart() {
  return (
    <div className="flex h-60 items-center justify-center text-sm text-on-surface-variant">
      Sin datos en este rango.
    </div>
  )
}
