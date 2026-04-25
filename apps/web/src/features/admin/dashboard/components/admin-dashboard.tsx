'use client'
import { Card, Icon, KpiCard, OrderCard, Skeleton } from '@tindivo/ui'
import Link from 'next/link'
import { useAdminActiveOrders } from '../hooks/use-admin-active-orders'
import { useAdminMetrics } from '../hooks/use-admin-metrics'

export function AdminDashboard() {
  const { data, isLoading } = useAdminActiveOrders()
  const { data: kpis } = useAdminMetrics()
  const items = data?.items ?? []

  const metrics = computeMetrics(items)

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-black text-3xl tracking-tight text-on-surface">Monitor en vivo</h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Pedidos activos en tiempo real — se actualiza automáticamente
          </p>
        </div>
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 bg-surface-container-lowest border border-outline-variant/30 text-sm font-semibold hover:shadow-[0_4px_20px_rgba(171,53,0,0.04)] transition-shadow"
        >
          Ver todos
          <Icon name="arrow_forward" size={18} />
        </Link>
      </header>

      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          label="Esperando motorizado"
          value={metrics.waiting}
          icon="hourglass_top"
          variant="danger"
        />
        <MetricCard
          label="En camino al local"
          value={metrics.headingToRestaurant}
          icon="two_wheeler"
          variant="warning"
        />
        <MetricCard
          label="En entrega"
          value={metrics.inDelivery}
          icon="delivery_dining"
          variant="info"
        />
        <Link href="/admin/tracking" className="block">
          <MetricCard
            label="Por enviar tracking"
            value={metrics.pendingTracking}
            icon="chat"
            variant="primary"
          />
        </Link>
      </div>

      {kpis && (
        <section>
          <h2 className="text-xs font-bold tracking-[0.15em] uppercase text-on-surface-variant mb-3">
            Métricas del día (Lima)
          </h2>
          <div className="grid grid-cols-4 gap-3">
            <KpiCard
              label="Tiempo prom. aceptación"
              value={fmtDur(kpis.avgAcceptSeconds)}
              hint={`${kpis.delivered} entregados`}
              icon="how_to_reg"
              variant="info"
            />
            <KpiCard
              label="Tiempo prom. entrega total"
              value={fmtDur(kpis.avgTotalSeconds)}
              hint={`${kpis.totalOrders} pedidos hoy`}
              icon="schedule"
              variant="success"
            />
            <KpiCard
              label="Aceptados overdue"
              value={
                kpis.acceptedTotal > 0 ? `${kpis.overdueAcceptedCount} (${kpis.overduePct}%)` : '0'
              }
              hint="aceptados con countdown negativo"
              icon="priority_high"
              variant="danger"
            />
            <KpiCard
              label="Extensiones / Listo antes"
              value={`${kpis.extensionsCount} / ${kpis.readyEarlyCount}`}
              hint="acciones del restaurante"
              icon="more_time"
              variant="warning"
            />
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xs font-bold tracking-[0.15em] uppercase text-on-surface-variant mb-3">
          Pedidos activos
        </h2>
        {isLoading ? (
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        ) : items.length === 0 ? (
          <Card className="p-8 text-center text-on-surface-variant">No hay pedidos activos.</Card>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {/* biome-ignore lint/suspicious/noExplicitAny: payload dinámico con columnas anidadas */}
            {items.map((order: any) => (
              <Link key={order.id} href={`/admin/orders/${order.id}`}>
                <OrderCard
                  shortId={order.short_id}
                  restaurantName={order.restaurants?.name ?? 'Restaurante'}
                  restaurantAccentColor={order.restaurants?.accent_color ?? 'ab3500'}
                  status={order.status}
                  orderAmount={Number(order.order_amount)}
                  paymentLabel={paymentLabel(order.payment_status)}
                  prepTimeMinutes={order.prep_minutes}
                  driverName={order.drivers?.full_name?.split(' ')[0] ?? null}
                />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function MetricCard({
  label,
  value,
  icon,
  variant,
}: {
  label: string
  value: number
  icon: string
  variant: 'primary' | 'warning' | 'danger' | 'info'
}) {
  const accent = {
    primary: 'bg-primary-container text-on-primary',
    warning: 'bg-amber-100 text-amber-900',
    danger: 'bg-error-container text-on-error-container',
    info: 'bg-blue-100 text-blue-900',
  }[variant]
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${accent}`}>
          <Icon name={icon} size={24} filled />
        </div>
        <div>
          <p className="text-3xl font-black tracking-tight text-on-surface">{value}</p>
          <p className="text-xs text-on-surface-variant font-semibold uppercase tracking-wide">
            {label}
          </p>
        </div>
      </div>
    </Card>
  )
}

function paymentLabel(status: string): string {
  switch (status) {
    case 'prepaid':
      return 'Pagado'
    case 'pending_yape':
      return 'Yape al entregar'
    case 'pending_cash':
      return 'Efectivo al entregar'
    default:
      return status
  }
}

/** Formatea segundos como "Mm Ss" o "Hh Mm" o "—" si null. */
function fmtDur(seconds: number | null): string {
  if (seconds == null || !Number.isFinite(seconds)) return '—'
  const abs = Math.max(0, Math.round(seconds))
  const h = Math.floor(abs / 3600)
  const m = Math.floor((abs % 3600) / 60)
  const s = abs % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

// biome-ignore lint/suspicious/noExplicitAny: payload dinámico con columnas de orders
function computeMetrics(items: any[]) {
  return {
    waiting: items.filter((o) => o.status === 'waiting_driver').length,
    headingToRestaurant: items.filter((o) => o.status === 'heading_to_restaurant').length,
    inDelivery: items.filter((o) => o.status === 'picked_up').length,
    pendingTracking: items.filter((o) => o.status === 'picked_up' && !o.tracking_link_sent_at)
      .length,
  }
}
