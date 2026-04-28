'use client'
import { ColorDot, Icon } from '@tindivo/ui'
import { useState } from 'react'

// biome-ignore lint/suspicious/noExplicitAny: payload dinámico snake_case del API
type UpcomingOrder = any

type Props = {
  items: UpcomingOrder[]
  now: Date
}

function minutesFromNow(iso: string, now: Date): number {
  return Math.max(0, Math.round((new Date(iso).getTime() - now.getTime()) / 60000))
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

/**
 * Sección colapsable de "Próximos pedidos" (HU-D-017). Muestra pedidos en
 * tier `upcoming` (> 10 min para estar listos): visibles pero NO aceptables,
 * barra de acento gris para enfatizar que no están listos aún.
 */
export function UpcomingOrdersSection({ items, now }: Props) {
  const [open, setOpen] = useState(false)

  if (items.length === 0) return null

  return (
    <section className="rounded-[20px] border border-outline-variant/20 bg-surface-container-lowest/60 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-4 py-3 text-left active:scale-[0.99] transition-transform"
      >
        <span
          className="inline-flex items-center justify-center w-8 h-8 rounded-full"
          style={{
            background: 'rgba(16, 185, 129, 0.14)',
            color: '#065F46',
          }}
        >
          <Icon name="schedule" size={18} filled />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-on-surface-variant">
            Próximos pedidos
          </div>
          <div className="font-bold text-sm text-on-surface">{items.length} esperando</div>
        </div>
        <span
          className="inline-flex transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }}
        >
          <Icon name="expand_more" size={22} className="text-on-surface-variant" />
        </span>
      </button>

      {open && (
        <ul className="border-t border-outline-variant/15 divide-y divide-outline-variant/10">
          {items.map((order) => {
            const mins = minutesFromNow(order.estimated_ready_at, now)
            const amount = Number(order.order_amount)
            const noCharge = amount === 0
            return (
              <li key={order.id} className="px-4 py-3 flex items-start gap-3">
                {/* Accent gris (no el del restaurante — señal de "no accionable aún") */}
                <span
                  aria-hidden="true"
                  className="shrink-0 mt-1 w-1 h-10 rounded-full"
                  style={{ background: '#D4D4D8' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <ColorDot color={order.restaurants?.accent_color ?? 'ab3500'} size={8} />
                    <span className="font-semibold text-sm text-on-surface truncate">
                      {order.client_name ?? order.restaurants?.name ?? 'Restaurante'}
                    </span>
                  </div>
                  <div className="text-[11px] text-on-surface-variant font-mono mt-0.5 truncate">
                    {order.client_name
                      ? `#${order.short_id} · ${order.restaurants?.name ?? ''}`
                      : `#${order.short_id}`}
                  </div>
                  <div className="text-[11px] text-on-surface-variant mt-1">
                    {noCharge ? 'Solo entregar' : paymentLabel(order.payment_status)}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded-full font-mono tabular-nums"
                    style={{
                      background: 'rgba(16, 185, 129, 0.12)',
                      color: '#065F46',
                      border: '1px solid rgba(16, 185, 129, 0.28)',
                    }}
                  >
                    <Icon name="schedule" size={12} filled />
                    En {mins} min
                  </span>
                  <div className="text-[10px] text-on-surface-variant mt-1">No aceptable aún</div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
