'use client'
import type { PendingAcceptanceOrder } from '@tindivo/api-client'
import { Icon } from '@tindivo/ui'

const TIMEOUT_MINUTES = 5

type Props = {
  order: PendingAcceptanceOrder
  now: Date
  onClick: () => void
}

export function PendingOrderCard({ order, now, onClick }: Props) {
  const startedAt = order.pending_acceptance_at
    ? new Date(order.pending_acceptance_at).getTime()
    : null
  const elapsedSec = startedAt ? Math.floor((now.getTime() - startedAt) / 1000) : 0
  const remainingSec = TIMEOUT_MINUTES * 60 - elapsedSec
  const isUrgent = remainingSec <= 60
  const isOverdue = remainingSec <= 0
  const mm = Math.max(0, Math.floor(remainingSec / 60))
  const ss = Math.max(0, remainingSec % 60)
    .toString()
    .padStart(2, '0')

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-surface-container-lowest rounded-2xl p-4 border border-amber-300/40 hover:border-amber-500 transition-colors flex flex-col gap-3 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-black text-base text-on-surface truncate">
            {order.client_name ?? 'Cliente'}
          </p>
          <p className="text-xs text-on-surface-variant font-mono">#{order.short_id}</p>
        </div>
        <div
          className={`px-3 py-1.5 rounded-full font-mono tabular-nums text-sm font-black ${
            isOverdue
              ? 'bg-red-100 text-red-800 animate-pulse'
              : isUrgent
                ? 'bg-amber-100 text-amber-900'
                : 'bg-amber-50 text-amber-700'
          }`}
          aria-label={isOverdue ? 'Vencido' : `Quedan ${mm}:${ss}`}
        >
          {isOverdue ? 'Venciendo' : `${mm}:${ss}`}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-1.5 font-bold text-on-surface">
          <Icon name="payments" size={16} />
          S/ {Number(order.order_amount).toFixed(2)}
        </div>
        <div className="flex items-center gap-1.5 text-on-surface-variant">
          <Icon name="schedule" size={14} />~{order.prep_minutes} min estimado
        </div>
      </div>

      {order.delivery_address && (
        <p className="text-xs text-on-surface-variant truncate flex items-start gap-1.5">
          <Icon name="location_on" size={14} className="mt-0.5 flex-shrink-0" />
          <span className="truncate">{order.delivery_address}</span>
        </p>
      )}

      <div className="flex items-center justify-end gap-2 text-xs font-bold text-amber-700">
        Toca para revisar y aceptar
        <Icon name="arrow_forward" size={14} />
      </div>
    </button>
  )
}
