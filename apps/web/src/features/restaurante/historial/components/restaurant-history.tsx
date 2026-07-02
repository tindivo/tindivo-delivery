'use client'
import { useRestaurantProfile } from '@/features/restaurante/perfil/hooks/use-restaurant-profile'
import { Button, EmptyState, OrderCard, Skeleton, cn, Icon } from '@tindivo/ui'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useRestaurantHistory } from '../hooks/use-restaurant-history'
import { useRestaurantFrequentCustomers } from '../hooks/use-restaurant-frequent-customers'
import { FrequentCustomerDetailDrawer } from './frequent-customer-detail-drawer'

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
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const profile = useRestaurantProfile()

  const activeTab = (searchParams.get('tab') || 'pedidos') as 'pedidos' | 'clientes'

  function setTab(newTab: 'pedidos' | 'clientes') {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', newTab)
    router.replace(`${pathname}?${params.toString()}`)

    if (newTab === 'clientes' && preset === 'today') {
      setPreset('month')
      setRange(presetRange('month'))
    } else if (newTab === 'pedidos' && preset === 'month') {
      setPreset('today')
      setRange(presetRange('today'))
    }
  }

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [preset, setPreset] = useState<Preset>('today')
  const [range, setRange] = useState<{ from: string; to: string }>(() => presetRange('today'))

  // Clientes frecuentes states
  const [minOrders, setMinOrders] = useState<number>(2)
  const [custSearch, setCustSearch] = useState<string>('')
  const [includeSuspicious, setIncludeSuspicious] = useState<boolean>(false)
  const [custSortBy, setCustSortBy] = useState<'order_count' | 'total_spent' | 'last_order'>('order_count')
  const [custSortDir, setCustSortDir] = useState<'asc' | 'desc'>('desc')
  const [custPage, setCustPage] = useState<number>(1)
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null)

  const { data: custData, isLoading: isLoadingCust } = useRestaurantFrequentCustomers({
    from: range.from,
    to: range.to,
    min_orders: minOrders,
    page: custPage,
    page_size: 25,
    search: custSearch || undefined,
    include_suspicious: includeSuspicious,
    sort_by: custSortBy,
    sort_dir: custSortDir,
  })

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
      {/* Tabs de Navegación Superior */}
      <div className="border-b border-[rgba(225,191,181,0.2)] flex">
        <button
          type="button"
          onClick={() => setTab('pedidos')}
          className="flex-1 py-3 text-center text-sm font-bold tracking-wider transition-all duration-300 relative"
          style={{
            color: activeTab === 'pedidos' ? '#FF6B35' : '#594139',
          }}
        >
          Pedidos
          {activeTab === 'pedidos' && (
            <span
              className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
              style={{
                background: 'linear-gradient(90deg, #FF6B35 0%, #FF8C42 100%)',
              }}
            />
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab('clientes')}
          className="flex-1 py-3 text-center text-sm font-bold tracking-wider transition-all duration-300 relative"
          style={{
            color: activeTab === 'clientes' ? '#FF6B35' : '#594139',
          }}
        >
          Clientes Frecuentes
          {activeTab === 'clientes' && (
            <span
              className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
              style={{
                background: 'linear-gradient(90deg, #FF6B35 0%, #FF8C42 100%)',
              }}
            />
          )}
        </button>
      </div>

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

      {activeTab === 'pedidos' ? (
        <div className="space-y-5">

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
      ) : (
        <div className="space-y-5">
          {/* Header/Filtros de Clientes Frecuentes */}
          <div className="space-y-3">
            {/* Buscador - Fila Completa */}
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Buscar por nombre o teléfono..."
                value={custSearch}
                onChange={(e) => {
                  setCustSearch(e.target.value)
                  setCustPage(1)
                }}
                className="w-full pl-10 pr-10 py-2.5 text-sm font-semibold rounded-2xl border text-on-surface bg-white/70 border-[rgba(225,191,181,0.4)] focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center text-on-surface-variant/60">
                <Icon name="search" size={18} />
              </div>
              {custSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setCustSearch('')
                    setCustPage(1)
                  }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center text-on-surface-variant/60 hover:text-on-surface"
                >
                  <Icon name="close" size={18} />
                </button>
              )}
            </div>

            {/* Selectores + Checkbox - Segunda Fila */}
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <div className="flex gap-2 items-center flex-wrap">
                <div className="flex flex-col gap-1 min-w-[110px]">
                  <select
                    value={minOrders}
                    aria-label="Mínimo de pedidos"
                    onChange={(e) => {
                      setMinOrders(Number(e.target.value))
                      setCustPage(1)
                    }}
                    className="rounded-2xl border px-3 py-2 text-xs font-semibold bg-white/70 border-[rgba(225,191,181,0.4)] text-on-surface focus:outline-none"
                  >
                    <option value={1}>1+ pedido</option>
                    <option value={2}>2+ pedidos</option>
                    <option value={3}>3+ pedidos</option>
                    <option value={5}>5+ pedidos</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1 min-w-[130px]">
                  <select
                    value={custSortBy}
                    aria-label="Ordenar por"
                    onChange={(e) => {
                      setCustSortBy(e.target.value as any)
                      setCustPage(1)
                    }}
                    className="rounded-2xl border px-3 py-2 text-xs font-semibold bg-white/70 border-[rgba(225,191,181,0.4)] text-on-surface focus:outline-none"
                  >
                    <option value="order_count">Nº Pedidos</option>
                    <option value="total_spent">Total Gastado</option>
                    <option value="last_order">Último Pedido</option>
                  </select>
                </div>

                <button
                  type="button"
                  aria-label="Dirección del ordenamiento"
                  onClick={() => {
                    setCustSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
                    setCustPage(1)
                  }}
                  className="p-2.5 rounded-2xl border border-[rgba(225,191,181,0.4)] bg-white/70 text-on-surface hover:bg-white flex items-center justify-center transition-all duration-300"
                >
                  <Icon name={custSortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'} size={18} />
                </button>
              </div>

              {/* Checkbox para sospechosos */}
              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeSuspicious}
                    onChange={(e) => {
                      setIncludeSuspicious(e.target.checked)
                      setCustPage(1)
                    }}
                    className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300 transition-colors"
                  />
                  <span className="text-xs font-bold text-on-surface-variant">
                    Incluir teléfonos sospechosos (ej. 999999999)
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Listado de Clientes */}
          {isLoadingCust ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Skeleton className="h-32 rounded-2xl" />
              <Skeleton className="h-32 rounded-2xl" />
              <Skeleton className="h-32 rounded-2xl" />
              <Skeleton className="h-32 rounded-2xl" />
            </div>
          ) : !custData?.data || custData.data.length === 0 ? (
            <EmptyState
              icon="group"
              title="Sin clientes frecuentes"
              description="No hay clientes que cumplan con los filtros de búsqueda."
            />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {custData.data.map((c) => {
                  const cat =
                    c.category === 'vip'
                      ? { label: 'VIP', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' }
                      : c.category === 'active'
                        ? { label: 'Activo', bg: 'bg-amber-100 text-amber-800 border-amber-200', dot: 'bg-amber-500' }
                        : c.category === 'dormant'
                          ? { label: 'Dormido', bg: 'bg-rose-100 text-rose-800 border-rose-200', dot: 'bg-rose-500' }
                          : { label: 'Nuevo', bg: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' }
                  return (
                    <div
                      key={c.client_phone}
                      onClick={() => setSelectedPhone(c.client_phone)}
                      className="cursor-pointer rounded-2xl border p-4 bg-white/75 hover:bg-white hover:border-primary/40 hover:shadow-lg transition-all duration-300 relative flex flex-col justify-between"
                      style={{ borderColor: 'rgba(225,191,181,0.25)' }}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h4 className="font-black text-on-surface text-base">
                            {c.client_name || 'Sin nombre registrado'}
                          </h4>
                          <p className="text-xs text-on-surface-variant font-bold font-mono">
                            {c.client_phone}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${cat.bg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${cat.dot}`} />
                          {cat.label}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 border-t border-[rgba(225,191,181,0.15)] pt-3 text-xs">
                        <div>
                          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                            Pedidos
                          </p>
                          <p className="font-mono font-black text-on-surface mt-0.5">
                            {c.order_count}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                            Total Gastado
                          </p>
                          <p className="font-mono font-black text-on-surface mt-0.5">
                            S/ {c.total_spent.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                            Último Pedido
                          </p>
                          <p className="font-semibold text-on-surface mt-0.5 text-[11px] truncate">
                            {c.days_since_last_order < 1
                              ? 'Hoy'
                              : c.days_since_last_order < 2
                                ? 'Ayer'
                                : `Hace ${Math.floor(c.days_since_last_order)} días`}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Paginación */}
              {custData.total > 25 && (
                <div className="flex items-center justify-between mt-4 px-2">
                  <button
                    type="button"
                    disabled={custPage <= 1}
                    onClick={() => setCustPage((p) => p - 1)}
                    className="px-4 py-2 text-xs font-bold uppercase rounded-full border border-[rgba(225,191,181,0.4)] bg-white/70 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                  >
                    Anterior
                  </button>
                  <span className="text-xs font-bold text-on-surface-variant">
                    Pág. {custPage} de {Math.ceil(custData.total / 25)}
                  </span>
                  <button
                    type="button"
                    disabled={custPage >= Math.ceil(custData.total / 25)}
                    onClick={() => setCustPage((p) => p + 1)}
                    className="px-4 py-2 text-xs font-bold uppercase rounded-full border border-[rgba(225,191,181,0.4)] bg-white/70 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Drawer de Detalle */}
          {selectedPhone && (
            <FrequentCustomerDetailDrawer
              phone={selectedPhone}
              onClose={() => setSelectedPhone(null)}
              dateRange={{ from: range.from, to: range.to }}
            />
          )}
        </div>
      )}
    </div>
  )
}
