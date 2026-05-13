'use client'
import { Icon, Skeleton } from '@tindivo/ui'
import Link from 'next/link'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useRestaurantsPerformance } from '../hooks/use-restaurants-performance'
import type { TimeRangeState } from '../hooks/use-time-range'
import { CHART_COLORS } from '../lib/color-tokens'
import { formatCurrency, formatDecimal, formatInt, formatPct } from '../lib/number-format'
import { ChartCard } from './charts/chart-card'
import { GlassTooltip } from './charts/glass-tooltip'

// TODO(usuario): definir "cliente leal" para este restaurante. Hoy = >=2
// pedidos del mismo teléfono en el rango. Si el rango es muy corto, sube
// el umbral o usa "X pedidos en últimos 60d" como criterio.
const LOYAL_THRESHOLD = 2

export function TabRestaurants({ range }: { range: TimeRangeState }) {
  const { data, isLoading } = useRestaurantsPerformance(range.queryCurrent)

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

  const rows = [...data.rows].sort((a, b) => b.gmv - a.gmv)
  const totalGmv = rows.reduce((s, r) => s + r.gmv, 0)
  const totalCommission = rows.reduce((s, r) => s + r.commission, 0)
  const totalDelivered = rows.reduce((s, r) => s + r.delivered, 0)
  const totalUniquePhones = rows.reduce((s, r) => s + r.uniquePhones, 0)
  const totalRepeatPhones = rows.reduce((s, r) => s + r.repeatPhones, 0)
  const debtors = rows.filter((r) => r.balanceDue > 0)
  const maxGmv = Math.max(1, ...rows.map((r) => r.gmv))

  const barData = rows
    .filter((r) => r.commission > 0)
    .slice(0, 10)
    .map((r) => ({
      name: r.name,
      commission: r.commission,
      color: `#${r.accentColor}`,
    }))

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <ChartCard
        title="Ranking por GMV"
        subtitle={`${rows.length} restaurantes · ${formatCurrency(totalGmv)} GMV total · ${formatCurrency(totalCommission)} comisión Tindivo`}
        icon="emoji_events"
        className="xl:col-span-2"
      >
        {rows.length === 0 ? (
          <EmptyChart />
        ) : (
          <ul className="space-y-2">
            {rows.map((r, idx) => {
              const share = maxGmv > 0 ? r.gmv / maxGmv : 0
              const cancellationPct = r.total > 0 ? (r.cancelled / r.total) * 100 : 0
              return (
                <li
                  key={r.restaurantId}
                  className="rounded-xl border border-outline-variant/15 bg-surface-container-low/50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-container/30 font-black text-primary">
                      #{idx + 1}
                    </span>
                    <span
                      className="h-9 w-9 shrink-0 rounded-full border-2 border-white shadow"
                      style={{ background: `#${r.accentColor}` }}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-on-surface">{r.name}</p>
                      <p className="text-xs text-on-surface-variant">
                        {formatInt(r.delivered)} entregas ·{' '}
                        {r.cancelled > 0
                          ? `${formatInt(r.cancelled)} cancelados (${formatPct(cancellationPct, 0)}) · `
                          : ''}
                        AOV {formatCurrency(r.aov, { decimals: true })}
                      </p>
                    </div>
                    <div className="hidden text-right md:block">
                      <p className="text-[10px] uppercase tracking-[0.15em] text-on-surface-variant">
                        Comisión
                      </p>
                      <p className="font-black tabular-nums text-primary">
                        {formatCurrency(r.commission)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${share * 100}%`,
                        background: `linear-gradient(90deg, #${r.accentColor}, #${r.accentColor}80)`,
                      }}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-on-surface-variant">
                    <span>
                      GMV: <strong>{formatCurrency(r.gmv)}</strong>
                    </span>
                    <span className="md:hidden">
                      Comisión:{' '}
                      <strong className="text-primary">{formatCurrency(r.commission)}</strong>
                    </span>
                    {r.uniquePhones > 0 && (
                      <span>
                        Clientes: <strong>{formatInt(r.uniquePhones)}</strong>
                        {r.repeatPhones > 0 &&
                          ` (${formatPct((r.repeatPhones / r.uniquePhones) * 100, 0)} repiten)`}
                      </span>
                    )}
                    {r.avgPrepMinutes != null && (
                      <span>
                        Prep: <strong>{formatDecimal(r.avgPrepMinutes)} min</strong>
                      </span>
                    )}
                    {r.balanceDue > 0 && (
                      <span className="font-bold text-rose-700">
                        Debe {formatCurrency(r.balanceDue)}
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
        title="Retención de clientes"
        subtitle={`umbral leal: ${LOYAL_THRESHOLD}+ pedidos en el rango (por teléfono)`}
        icon="favorite"
      >
        {totalUniquePhones === 0 ? (
          <EmptyChart />
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.15em] text-on-surface-variant">
                Clientes únicos
              </p>
              <p className="font-black text-3xl tabular-nums text-on-surface">
                {formatInt(totalUniquePhones)}
              </p>
              <p className="text-xs text-on-surface-variant">
                identificados por teléfono entregados en {formatInt(totalDelivered)} pedidos
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3">
              <p className="text-[11px] uppercase tracking-[0.15em] text-emerald-800">
                Clientes que repiten
              </p>
              <p className="font-black text-2xl tabular-nums text-emerald-800">
                {formatInt(totalRepeatPhones)}{' '}
                <span className="text-base font-bold">
                  ({formatPct((totalRepeatPhones / totalUniquePhones) * 100, 1)})
                </span>
              </p>
              <p className="mt-1 text-[11px] text-emerald-700">
                Benchmark sector: 40-60%. Sube esta tasa con campañas de retención o promos.
              </p>
            </div>
          </div>
        )}
      </ChartCard>

      <ChartCard
        title="Comisión Tindivo por restaurante"
        subtitle="top 10 generadores de comisión"
        icon="payments"
        className="xl:col-span-2"
      >
        {barData.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(220, barData.length * 32)}>
            <BarChart
              data={barData}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 80, bottom: 0 }}
            >
              <CartesianGrid
                stroke={CHART_COLORS.outline}
                strokeDasharray="3 3"
                horizontal={false}
              />
              <XAxis
                type="number"
                stroke={CHART_COLORS.onSurfaceVariant}
                fontSize={11}
                tickFormatter={(v) => `S/${v}`}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke={CHART_COLORS.onSurfaceVariant}
                fontSize={11}
                width={80}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <GlassTooltip
                      title={String(label)}
                      rows={[
                        {
                          label: 'Comisión',
                          value: formatCurrency(Number(payload[0]?.value ?? 0), { decimals: true }),
                          color: String(payload[0]?.payload?.color ?? CHART_COLORS.primary),
                        },
                      ]}
                    />
                  )
                }}
              />
              <Bar dataKey="commission" radius={[0, 8, 8, 0]}>
                {barData.map((d) => (
                  <Bar key={d.name} dataKey="commission" fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Locales con deuda" subtitle="balance_due > 0" icon="account_balance">
        {debtors.length === 0 ? (
          <div className="flex h-60 items-center justify-center text-sm text-on-surface-variant">
            <span className="text-emerald-700">
              <Icon name="check_circle" size={18} filled /> Todos al día
            </span>
          </div>
        ) : (
          <ul className="space-y-2">
            {debtors.map((r) => (
              <li
                key={r.restaurantId}
                className="flex items-center justify-between rounded-xl border border-rose-100 bg-rose-50 p-3"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ background: `#${r.accentColor}` }}
                    aria-hidden
                  />
                  <span className="font-semibold text-on-surface">{r.name}</span>
                </div>
                <span className="font-black tabular-nums text-rose-700">
                  {formatCurrency(r.balanceDue, { decimals: true })}
                </span>
              </li>
            ))}
            <Link
              href="/admin/cobros"
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-on-primary shadow-[0_4px_20px_rgba(180,60,31,0.2)]"
            >
              <Icon name="payments" size={16} /> Gestionar cobros
            </Link>
          </ul>
        )}
      </ChartCard>

      <section className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-5 shadow-[0_4px_20px_rgba(171,53,0,0.04)] md:p-6 xl:col-span-3">
        <h3 className="mb-4 text-sm font-bold text-on-surface">Detalle por restaurante</h3>
        <div className="-mx-5 overflow-x-auto md:-mx-6">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-surface-container-low text-xs font-bold uppercase tracking-[0.12em] text-on-surface-variant">
              <tr>
                <th className="px-5 py-3 text-left md:px-6">Restaurante</th>
                <th className="px-3 py-3 text-right">Pedidos</th>
                <th className="px-3 py-3 text-right">Entregados</th>
                <th className="px-3 py-3 text-right">Cancel %</th>
                <th className="px-3 py-3 text-right">GMV</th>
                <th className="px-3 py-3 text-right">Comisión</th>
                <th className="px-3 py-3 text-right">AOV</th>
                <th className="px-5 py-3 text-right md:px-6">Deuda</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.restaurantId} className="border-t border-outline-variant/10">
                  <td className="px-5 py-3 font-semibold md:px-6">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ background: `#${r.accentColor}` }}
                        aria-hidden
                      />
                      {r.name}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatInt(r.total)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-emerald-700">
                    {formatInt(r.delivered)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {r.total > 0 ? formatPct((r.cancelled / r.total) * 100, 0) : '—'}
                  </td>
                  <td className="px-3 py-3 text-right font-bold tabular-nums">
                    {formatCurrency(r.gmv)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-primary">
                    {formatCurrency(r.commission)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatCurrency(r.aov, { decimals: true })}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums md:px-6">
                    {r.balanceDue > 0 ? (
                      <span className="font-bold text-rose-700">
                        {formatCurrency(r.balanceDue, { decimals: true })}
                      </span>
                    ) : (
                      <span className="text-on-surface-variant">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
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
