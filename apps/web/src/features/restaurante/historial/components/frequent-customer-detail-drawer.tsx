'use client'
import { Icon, Skeleton } from '@tindivo/ui'
import { useRouter } from 'next/navigation'
import { useRestaurantFrequentCustomerDetail } from '../hooks/use-restaurant-frequent-customer-detail'

type Props = {
  phone: string
  onClose: () => void
  dateRange: { from: string; to: string }
}

const TZ = 'America/Lima'

function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function formatAvgDaysBetween(days: number | null | undefined): string {
  if (days === null || days === undefined) return 'Primer pedido'
  if (days < 0.5) return 'Múltiples pedidos el mismo día'
  if (days < 1.0) return 'Aproximadamente cada 12 horas'
  if (days < 7.0) return `cada ${days.toFixed(1)} días`
  return `cada ${Math.round(days)} días`
}

function translateDayOfWeek(day: string | null | undefined): string {
  if (!day) return 'Sin datos'
  const mapping: Record<string, string> = {
    monday: 'Lunes',
    tuesday: 'Martes',
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sábado',
    sunday: 'Domingo',
  }
  return mapping[day.trim().toLowerCase()] ?? day
}

function translateTimeRange(range: string | null | undefined): string {
  if (!range) return 'Sin datos'
  const mapping: Record<string, string> = {
    morning: 'Mañana (5 AM - 11 AM)',
    noon: 'Mediodía (11 AM - 3 PM)',
    afternoon: 'Tarde (3 PM - 7 PM)',
    evening: 'Noche (7 PM - 11 PM)',
    night: 'Madrugada (11 PM - 5 AM)',
  }
  return mapping[range.trim().toLowerCase()] ?? range
}

function getCategoryMeta(cat: 'vip' | 'active' | 'dormant' | null | undefined) {
  if (!cat) {
    return {
      label: 'Nuevo',
      bg: 'bg-slate-100 text-slate-600 border-slate-200',
      dot: 'bg-slate-400',
    }
  }
  switch (cat) {
    case 'vip':
      return {
        label: 'VIP',
        bg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        dot: 'bg-emerald-500',
      }
    case 'active':
      return {
        label: 'Activo',
        bg: 'bg-amber-100 text-amber-800 border-amber-200',
        dot: 'bg-amber-500',
      }
    case 'dormant':
      return {
        label: 'Dormido',
        bg: 'bg-rose-100 text-rose-800 border-rose-200',
        dot: 'bg-rose-500',
      }
  }
}

export function FrequentCustomerDetailDrawer({ phone, onClose, dateRange }: Props) {
  const router = useRouter()
  const { data, isLoading } = useRestaurantFrequentCustomerDetail(phone, dateRange)

  const catMeta = data ? getCategoryMeta(data.category) : null

  return (
    <div className="fixed inset-0 z-50 flex justify-end md:items-stretch items-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div className="relative w-full max-h-[85vh] md:max-h-none md:w-[480px] bg-white rounded-t-3xl md:rounded-t-none md:rounded-l-3xl shadow-2xl z-10 flex flex-col overflow-hidden animate-slide-in">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[rgba(225,191,181,0.2)] flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Icon name="person" size={24} />
            </div>
            <div>
              <h3 className="font-black text-on-surface text-lg">Detalle del Cliente</h3>
              <p className="text-xs text-on-surface-variant font-mono font-bold">{phone}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-[rgba(225,191,181,0.3)] bg-white hover:bg-slate-100 transition-colors flex items-center justify-center text-on-surface-variant/80"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : !data ? (
            <div className="py-12 text-center text-sm font-semibold text-on-surface-variant">
              No se pudieron cargar los datos de este cliente.
            </div>
          ) : (
            <>
              {/* Client Profile Card */}
              <div
                className="rounded-2xl p-4 border flex items-center justify-between bg-white/70"
                style={{ borderColor: 'rgba(225,191,181,0.25)' }}
              >
                <div>
                  <h4 className="font-black text-on-surface text-xl">
                    {data.client_name || 'Sin nombre registrado'}
                  </h4>
                  <p className="text-xs text-on-surface-variant/80 font-semibold mt-0.5">
                    Cliente registrado en Tindivo
                  </p>
                </div>
                {catMeta && (
                  <span
                    className={`text-xs font-black tracking-wider uppercase px-3 py-1 rounded-full border flex items-center gap-1.5 ${catMeta.bg}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${catMeta.dot}`} />
                    {catMeta.label}
                  </span>
                )}
              </div>

              {/* KPI Metrics Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div
                  className="rounded-2xl p-4 border bg-white/70 flex flex-col justify-between"
                  style={{ borderColor: 'rgba(225,191,181,0.25)' }}
                >
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                    Total Pedidos
                  </p>
                  <p className="font-mono font-black text-2xl text-on-surface mt-1">
                    {data.summary.order_count}
                  </p>
                </div>
                <div
                  className="rounded-2xl p-4 border bg-white/70 flex flex-col justify-between"
                  style={{ borderColor: 'rgba(225,191,181,0.25)' }}
                >
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                    Total Gastado
                  </p>
                  <p className="font-mono font-black text-2xl text-primary mt-1">
                    S/ {data.summary.total_spent.toFixed(2)}
                  </p>
                </div>
                <div
                  className="rounded-2xl p-4 border bg-white/70 flex flex-col justify-between"
                  style={{ borderColor: 'rgba(225,191,181,0.25)' }}
                >
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                    Ticket Promedio
                  </p>
                  <p className="font-mono font-black text-xl text-on-surface mt-1">
                    S/ {data.summary.avg_ticket.toFixed(2)}
                  </p>
                </div>
                <div
                  className="rounded-2xl p-4 border bg-white/70 flex flex-col justify-between"
                  style={{ borderColor: 'rgba(225,191,181,0.25)' }}
                >
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                    Frecuencia de Compra
                  </p>
                  <p className="font-bold text-sm text-on-surface mt-1 leading-snug">
                    {formatAvgDaysBetween(data.summary.avg_days_between_orders)}
                  </p>
                </div>
              </div>

              {/* Behavior Profile */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-on-surface-variant/80">
                  Hábitos de Consumo
                </h4>
                <div
                  className="rounded-2xl border p-4 bg-white/70 space-y-3.5"
                  style={{ borderColor: 'rgba(225,191,181,0.25)' }}
                >
                  {/* Favorite Day */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-on-surface-variant">
                      <Icon name="calendar_today" size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                        Día Favorito
                      </p>
                      <p className="text-sm font-semibold text-on-surface mt-0.5">
                        {translateDayOfWeek(data.behavior.favorite_day_of_week)}{' '}
                        <span className="text-xs text-on-surface-variant font-medium">
                          ({data.behavior.favorite_day_count} pedidos)
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Favorite Hour */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-on-surface-variant">
                      <Icon name="schedule" size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                        Horario Preferido
                      </p>
                      <p className="text-sm font-semibold text-on-surface mt-0.5">
                        {translateTimeRange(data.behavior.favorite_time_range)}{' '}
                        <span className="text-xs text-on-surface-variant font-medium">
                          ({data.behavior.favorite_time_range_count} pedidos)
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Ticket vs Restaurant Avg */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-on-surface-variant">
                      <Icon name="compare_arrows" size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                        Ticket vs Promedio Restaurante
                      </p>
                      <p className="text-sm font-semibold text-on-surface mt-0.5 flex items-center gap-2">
                        <span>S/ {data.summary.avg_ticket.toFixed(2)}</span>
                        <span className="text-xs text-on-surface-variant font-medium">
                          vs S/ {data.behavior.restaurant_avg_ticket.toFixed(2)}
                        </span>
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                            data.behavior.ticket_vs_restaurant === 'above'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : data.behavior.ticket_vs_restaurant === 'below'
                                ? 'bg-rose-50 text-rose-700 border-rose-100'
                                : 'bg-amber-50 text-amber-700 border-amber-100'
                          }`}
                        >
                          {data.behavior.ticket_vs_restaurant === 'above'
                            ? 'Alto'
                            : data.behavior.ticket_vs_restaurant === 'below'
                              ? 'Bajo'
                              : 'Promedio'}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Orders */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-on-surface-variant/80">
                  Últimos Pedidos
                </h4>
                <ul className="flex flex-col gap-2">
                  {data.recent_orders.map((o) => (
                    <li
                      key={o.id}
                      onClick={() => {
                        onClose()
                        router.push(`/restaurante/pedidos/${o.id}`)
                      }}
                      className="cursor-pointer flex items-center justify-between p-3.5 rounded-2xl border border-[rgba(225,191,181,0.2)] bg-slate-50/50 hover:bg-slate-50 hover:border-primary/30 transition-all duration-300"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-200/60 flex items-center justify-center text-on-surface-variant">
                          <Icon name="receipt" size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-on-surface leading-none">
                            #{o.short_id}
                          </p>
                          <p className="text-[10px] text-on-surface-variant font-bold mt-1">
                            {formatDateTime(o.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm text-on-surface">
                          S/ {o.order_amount.toFixed(2)}
                        </span>
                        <Icon
                          name="chevron_right"
                          size={18}
                          className="text-on-surface-variant/60"
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
