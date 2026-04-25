'use client'
import type { RestaurantPendingCashGroup } from '@tindivo/api-client'
import { Icon } from '@tindivo/ui'
import { useState } from 'react'
import { useRestaurantPendingCash } from '../hooks/use-pending-cash'

/**
 * Sección "Pendiente del motorizado" — lista pedidos en efectivo entregados
 * al cliente pero AÚN sin liquidar al restaurante (cash_settlement_id null).
 * Se muestra arriba del listado de settlements activos.
 *
 * Cada motorizado se muestra como card colapsable: header con monto total +
 * cantidad de pedidos + botón llamar; al tocar se expanden los #SHORTID con
 * sus montos individuales.
 */
export function PendingCashSection() {
  const { data, isLoading } = useRestaurantPendingCash()
  const [expandedDriverId, setExpandedDriverId] = useState<string | null>(null)

  const items = data?.items ?? []
  if (isLoading) return null
  if (items.length === 0) return null

  const totalCash = items.reduce((acc, g) => acc + g.totalCash, 0)
  const totalOrders = items.reduce((acc, g) => acc + g.orderCount, 0)

  return (
    <section
      className="rounded-[24px] p-5 border space-y-3"
      style={{
        borderColor: 'rgba(234, 179, 8, 0.32)',
        background: 'linear-gradient(135deg, #fffaf0 0%, #fff5d6 100%)',
      }}
    >
      <header className="flex items-start gap-3">
        <span
          className="inline-flex items-center justify-center w-11 h-11 rounded-xl shrink-0"
          style={{
            background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
            color: '#ffffff',
            boxShadow: '0 6px 16px -4px rgba(217, 119, 6, 0.4)',
          }}
        >
          <Icon name="payments" size={22} filled />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold tracking-[0.22em] uppercase text-amber-800">
            Pendiente del motorizado
          </div>
          <div className="bleed-text text-2xl font-black font-mono tabular-nums text-amber-900">
            S/ {totalCash.toFixed(2)}
          </div>
          <div className="text-[11px] text-amber-800 mt-0.5">
            {totalOrders} {totalOrders === 1 ? 'pedido entregado' : 'pedidos entregados'} ·
            {items.length === 1 ? ' 1 motorizado' : ` ${items.length} motorizados`}
          </div>
        </div>
      </header>

      <ul className="space-y-2">
        {items.map((g) => (
          <DriverGroupCard
            key={g.driverId}
            group={g}
            expanded={expandedDriverId === g.driverId}
            onToggle={() =>
              setExpandedDriverId((prev) => (prev === g.driverId ? null : g.driverId))
            }
          />
        ))}
      </ul>

      <p className="text-[11px] text-amber-800/90 leading-snug">
        El motorizado aún no ha liquidado este efectivo contigo. Cuando él lo "envíe", aparecerá
        abajo en "Por confirmar" para que cuentes el dinero y confirmes la recepción.
      </p>
    </section>
  )
}

function DriverGroupCard({
  group,
  expanded,
  onToggle,
}: {
  group: RestaurantPendingCashGroup
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <li className="rounded-2xl bg-white/80 border border-amber-200/60 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full flex items-center gap-3 px-4 py-3 text-left active:scale-[0.99] transition-transform"
      >
        <span
          className="inline-flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
          style={{ background: 'rgba(217, 119, 6, 0.14)', color: '#92400E' }}
        >
          <Icon name={vehicleIcon(group.vehicleType)} size={18} filled />
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-on-surface truncate">{group.driverName}</div>
          <div className="text-[11px] text-on-surface-variant">
            {group.orderCount} {group.orderCount === 1 ? 'pedido' : 'pedidos'} pendientes
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-black font-mono tabular-nums text-amber-900">
            S/ {group.totalCash.toFixed(2)}
          </div>
          <div className="text-[10px] text-on-surface-variant uppercase tracking-wider mt-0.5 inline-flex items-center gap-1">
            {expanded ? 'Ocultar' : 'Detalle'}
            <span
              className="inline-flex transition-transform"
              style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}
            >
              <Icon name="expand_more" size={14} />
            </span>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-amber-200/50 bg-amber-50/40 px-4 py-3 space-y-2">
          <div className="flex items-center gap-2">
            <a
              href={`tel:+51${group.driverPhone}`}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(217, 119, 6, 0.14)', color: '#92400E' }}
            >
              <Icon name="call" size={14} filled />
              Llamar al {formatPhone(group.driverPhone)}
            </a>
          </div>
          <ul className="divide-y divide-amber-200/40">
            {group.orders.map((o: RestaurantPendingCashGroup['orders'][number]) => (
              <li key={o.id} className="py-2 flex items-center gap-3">
                <span className="text-[11px] font-mono tracking-wider text-on-surface-variant">
                  #{o.shortId}
                </span>
                <span className="flex-1 text-[11px] text-on-surface-variant">
                  {o.deliveredAt ? `Entregado ${formatTime(o.deliveredAt)}` : 'Entregado'}
                </span>
                <span className="text-sm font-bold font-mono tabular-nums text-on-surface">
                  S/ {o.cashOwed.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  )
}

function vehicleIcon(type: string): string {
  switch (type) {
    case 'moto':
      return 'two_wheeler'
    case 'bicicleta':
      return 'pedal_bike'
    case 'pie':
      return 'directions_walk'
    case 'auto':
      return 'directions_car'
    default:
      return 'two_wheeler'
  }
}

function formatPhone(digits: string): string {
  const clean = digits.replace(/\D/g, '')
  if (clean.length !== 9) return clean
  return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6, 9)}`
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Lima',
  })
}
