'use client'
import { useRestaurantProfile } from '@/features/restaurante/perfil/hooks/use-restaurant-profile'
import { Button, EmptyState, OrderCard, Skeleton, cn } from '@tindivo/ui'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useRestaurantHistory } from '../hooks/use-restaurant-history'

type StatusFilter = 'all' | 'delivered' | 'cancelled'
type Preset = 'today' | 'yesterday' | 'last7' | 'month' | 'custom'

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'delivered', label: 'Entregados' },
  { value: 'cancelled', label: 'Cancelados' },
]

const PRESETS: { value: Exclude<Preset, 'custom'>; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'yesterday', label: 'Ayer' },
  { value: 'last7', label: '7 días' },
  { value: 'month', label: 'Este mes' },
]

const TZ = 'America/Lima'

/** Fecha actual como día-Perú (YYYY-MM-DD). */
function peruToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())
}

/** Desplaza un día-calendario (YYYY-MM-DD) por N días, sin tocar zonas horarias. */
function shiftYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number) as [number, number, number]
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().slice(0, 10)
}

function presetRange(preset: Exclude<Preset, 'custom'>): { from: string; to: string } {
  const today = peruToday()
  switch (preset) {
    case 'today':
      return { from: today, to: today }
    case 'yesterday': {
      const y = shiftYmd(today, -1)
      return { from: y, to: y }
    }
    case 'last7':
      return { from: shiftYmd(today, -6), to: today }
    case 'month':
      // "Este mes" = del día 1 al día de hoy (month-to-date).
      return { from: `${today.slice(0, 7)}-01`, to: today }
  }
}

function formatYmd(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number) as [number, number, number]
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}

function rangeLabel(preset: Preset, range: { from: string; to: string }): string {
  switch (preset) {
    case 'today':
      return 'Hoy'
    case 'yesterday':
      return 'Ayer'
    case 'last7':
      return 'Últimos 7 días'
    case 'month':
      return 'Este mes'
    default:
      return range.from === range.to
        ? formatYmd(range.from)
        : `${formatYmd(range.from)} – ${formatYmd(range.to)}`
  }
}

function paymentLabel(status: string): string {
  switch (status) {
    case 'prepaid':
      return 'Pagado'
    case 'pending_yape':
      return 'Yape'
    case 'pending_cash':
      return 'Efectivo'
    default:
      return status
  }
}

function bandLabel(band: 'near' | 'far' | null | undefined): string | null {
  if (band === 'near') return 'Cerca'
  if (band === 'far') return 'Lejos'
  return null
}

const DATE_INPUT_CLASS =
  'flex-1 min-w-0 rounded-2xl border px-3 py-2.5 text-sm font-semibold text-on-surface bg-white/70 border-[rgba(225,191,181,0.4)] focus:outline-none focus:ring-2 focus:ring-primary/30'

export function RestaurantHistory() {
  const router = useRouter()
  const profile = useRestaurantProfile()

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [preset, setPreset] = useState<Preset>('today')
  const [range, setRange] = useState<{ from: string; to: string }>(() => presetRange('today'))

  const today = peruToday()

  function applyPreset(p: Exclude<Preset, 'custom'>) {
    setPreset(p)
    setRange(presetRange(p))
  }
  function setFrom(value: string) {
    if (!value) return
    setPreset('custom')
    setRange((r) => ({ from: value, to: value > r.to ? value : r.to }))
  }
  function setTo(value: string) {
    if (!value) return
    setPreset('custom')
    setRange((r) => ({ from: r.from > value ? value : r.from, to: value }))
  }

  const statusParam = statusFilter === 'all' ? undefined : statusFilter
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useRestaurantHistory(
    range,
    statusParam,
  )

  const accent = profile.data?.accentColor ?? 'ab3500'

  const pages = data?.pages ?? []
  // biome-ignore lint/suspicious/noExplicitAny: payload dinámico con columnas snake_case
  const items = useMemo(() => pages.flatMap((p) => p.items as any[]), [pages])
  const summary = pages[0]?.summary ?? { deliveredCount: 0, totalCommission: 0 }

  return (
    <div className="space-y-5">
      {/* Selector de fecha — atajos */}
      <div className="space-y-3">
        <div className="flex gap-2">
          {PRESETS.map((p) => {
            const active = preset === p.value
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => applyPreset(p.value)}
                className="flex-1 text-[12px] font-bold tracking-wider uppercase px-2 py-2.5 rounded-full transition-all duration-300 active:scale-95"
                style={{
                  background: active
                    ? 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%)'
                    : 'rgba(255, 255, 255, 0.7)',
                  color: active ? '#ffffff' : '#594139',
                  border: active ? 'none' : '1px solid rgba(225, 191, 181, 0.3)',
                  boxShadow: active ? '0 4px 12px rgba(255, 107, 53, 0.35)' : 'none',
                }}
              >
                {p.label}
              </button>
            )
          })}
        </div>

        {/* Rango personalizado */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            aria-label="Desde"
            value={range.from}
            max={range.to || today}
            onChange={(e) => setFrom(e.target.value)}
            className={DATE_INPUT_CLASS}
          />
          <span className="text-on-surface-variant text-sm font-bold">–</span>
          <input
            type="date"
            aria-label="Hasta"
            value={range.to}
            min={range.from}
            max={today}
            onChange={(e) => setTo(e.target.value)}
            className={DATE_INPUT_CLASS}
          />
        </div>
      </div>

      {/* Resumen del periodo — refleja siempre los entregados del rango */}
      {summary.deliveredCount > 0 && (
        <section
          className="rounded-2xl p-4 border"
          style={{
            background:
              'linear-gradient(135deg, rgba(255,107,53,0.10) 0%, rgba(255,140,66,0.06) 100%)',
            borderColor: 'rgba(255,107,53,0.25)',
          }}
        >
          <div className="text-[10px] font-bold tracking-[0.22em] uppercase text-on-surface-variant">
            {rangeLabel(preset, range)}
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-3">
            <div className="font-black text-2xl text-on-surface">
              {summary.deliveredCount} {summary.deliveredCount === 1 ? 'entregado' : 'entregados'}
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold tracking-wider uppercase text-on-surface-variant">
                Comisión Tindivo
              </div>
              <div className="font-black text-xl text-primary">
                S/ {summary.totalCommission.toFixed(2)}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Filtro por estado (servidor) */}
      <div className="flex gap-2">
        {STATUS_FILTERS.map((f) => {
          const active = statusFilter === f.value
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                'flex-1 text-[12px] font-bold tracking-wider uppercase px-3 py-2.5 rounded-full transition-all duration-300 active:scale-95',
              )}
              style={{
                background: active
                  ? 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%)'
                  : 'rgba(255, 255, 255, 0.7)',
                color: active ? '#ffffff' : '#594139',
                border: active ? 'none' : '1px solid rgba(225, 191, 181, 0.3)',
                boxShadow: active ? '0 4px 12px rgba(255, 107, 53, 0.35)' : 'none',
              }}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon="history"
          title="Sin pedidos"
          description="No hay pedidos finalizados en el rango de fechas elegido."
        />
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {items.map((order) => {
              const fee = Number(order.delivery_fee ?? 0)
              const band = bandLabel(order.delivery_distance_band)
              const showCommission = order.status === 'delivered' && fee > 0
              return (
                <li key={order.id} className="space-y-1">
                  <OrderCard
                    shortId={order.short_id}
                    clientName={order.client_name ?? null}
                    restaurantName={profile.data?.name ?? 'Mi restaurante'}
                    restaurantAccentColor={accent}
                    status={order.status}
                    orderAmount={Number(order.order_amount)}
                    paymentLabel={paymentLabel(order.payment_status)}
                    prepTimeMinutes={order.prep_minutes}
                    driverName={order.drivers?.full_name ?? null}
                    onClick={() => router.push(`/restaurante/pedidos/${order.id}`)}
                  />
                  {showCommission ? (
                    <div
                      className="px-4 py-2 rounded-2xl text-xs flex items-center justify-between"
                      style={{
                        background: 'rgba(255,107,53,0.06)',
                        border: '1px solid rgba(255,107,53,0.15)',
                      }}
                    >
                      <span className="text-on-surface-variant font-semibold">
                        Comisión Tindivo
                      </span>
                      <span className="font-mono font-black text-on-surface tabular-nums">
                        S/ {fee.toFixed(2)}
                        {band && (
                          <span className="text-on-surface-variant font-bold"> · {band}</span>
                        )}
                      </span>
                    </div>
                  ) : order.status === 'cancelled' ? (
                    <div
                      className="px-4 py-2 rounded-2xl text-[11px] text-on-surface-variant/70 italic"
                      style={{ background: 'rgba(0,0,0,0.02)' }}
                    >
                      Sin comisión (cancelado)
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>

          {hasNextPage && (
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              disabled={isFetchingNextPage}
              onClick={() => fetchNextPage()}
            >
              {isFetchingNextPage ? 'Cargando…' : 'Cargar más'}
            </Button>
          )}
        </>
      )}
    </div>
  )
}
