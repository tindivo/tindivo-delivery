'use client'
import { orders } from '@/lib/api/client'
import { useMutation } from '@tanstack/react-query'
import type { TrackingPendingRow } from '@tindivo/api-client'
import { normalizeToE164Pe } from '@tindivo/core'
import { EmptyState, Icon, Skeleton, WaLinkButton } from '@tindivo/ui'
import Link from 'next/link'
import { useTrackingPending } from '../hooks/use-tracking-pending'

function elapsedMinutes(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
}

function urgencyFor(mins: number): {
  bg: string
  border: string
  label: string
  color: string
} {
  if (mins >= 10)
    return {
      bg: 'rgba(186, 26, 26, 0.08)',
      border: 'rgba(186, 26, 26, 0.28)',
      label: 'Urgente',
      color: '#991B1B',
    }
  if (mins >= 5)
    return {
      bg: 'rgba(234, 179, 8, 0.1)',
      border: 'rgba(234, 179, 8, 0.3)',
      label: 'Atiende pronto',
      color: '#92400E',
    }
  return {
    bg: 'rgba(16, 185, 129, 0.08)',
    border: 'rgba(16, 185, 129, 0.25)',
    label: 'Reciente',
    color: '#065F46',
  }
}

export function TrackingPendingList() {
  const { data, isLoading } = useTrackingPending()
  const items = data?.items ?? []

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="bleed-text font-black text-2xl md:text-3xl text-on-surface">
            Envío de tracking
          </h1>
          <p className="text-on-surface-variant text-xs md:text-sm mt-1 max-w-2xl">
            Pedidos en camino al cliente sin link de tracking enviado. Toca{' '}
            <strong>Enviar por WhatsApp</strong> — abre el chat con el mensaje pre-rellenado. Al
            enviar desde WhatsApp queda registrado quién y cuándo lo envió.
          </p>
        </div>
        <Link
          href="/admin/tracking/historial"
          className="shrink-0 inline-flex items-center gap-2 rounded-xl px-3 py-2 md:px-4 bg-surface-container-lowest border border-outline-variant/30 text-xs md:text-sm font-semibold hover:shadow-[0_4px_20px_rgba(171,53,0,0.04)] transition-shadow"
        >
          <Icon name="history" size={18} />
          Ver enviados
        </Link>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon="check_circle"
          title="Todo al día"
          description="No hay pedidos pendientes de enviar tracking. Cuando un driver recoja un pedido aparecerá aquí."
        />
      ) : (
        <ul className="space-y-3">
          {items.map((row) => (
            <TrackingCard key={row.id} row={row} />
          ))}
        </ul>
      )}
    </div>
  )
}

function TrackingCard({ row }: { row: TrackingPendingRow }) {
  const logSent = useMutation({
    mutationFn: () => orders.logTrackingLinkSent(row.id),
  })

  const mins = row.picked_up_at ? elapsedMinutes(row.picked_up_at) : 0
  const urgency = urgencyFor(mins)
  const phoneE164 = normalizeToE164Pe(row.client_phone) ?? row.client_phone

  // Construimos la URL pública del tracking contra el host actual
  // (Vercel expone NEXT_PUBLIC_APP_URL; fallback a window.origin).
  const host =
    typeof window !== 'undefined'
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL ?? 'https://delivery.tindivo.com')
  const trackingUrl = `${host}/pedidos/${row.short_id}`

  const restaurantName = row.restaurants?.name ?? 'tu restaurante'
  const driverFirstName = row.drivers?.full_name?.split(' ')[0] ?? 'el motorizado'

  const message = `Hola! 👋 Tu pedido #${row.short_id} de ${restaurantName} ya está en camino con ${driverFirstName}.\n\nSigue la entrega en vivo aquí:\n${trackingUrl}\n\n¡Gracias por tu compra!`

  return (
    <li
      className="rounded-[20px] p-5 border flex flex-col md:flex-row md:items-center gap-4 md:gap-5"
      style={{ background: urgency.bg, borderColor: urgency.border }}
    >
      {/* Accent bar del restaurante */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <span
          aria-hidden="true"
          className="shrink-0 w-1.5 h-14 rounded-full"
          style={{
            background: `#${row.restaurants?.accent_color ?? 'ab3500'}`,
            boxShadow: `0 0 12px #${row.restaurants?.accent_color ?? 'ab3500'}40`,
          }}
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-on-surface truncate">{restaurantName}</span>
            <span
              className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full"
              style={{
                background: urgency.bg,
                color: urgency.color,
                border: `1px solid ${urgency.border}`,
              }}
            >
              <Icon name="schedule" size={12} />
              {mins} min · {urgency.label}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-on-surface-variant flex-wrap">
            <span className="font-mono">#{row.short_id}</span>
            {row.client_name && (
              <>
                <span>·</span>
                <span className="font-semibold text-on-surface">{row.client_name}</span>
              </>
            )}
            <span>·</span>
            <span>
              <Icon name="two_wheeler" size={12} className="inline align-middle mr-1" />
              {driverFirstName}
            </span>
            <span>·</span>
            <span>S/ {Number(row.order_amount).toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-on-surface-variant">
            <Icon name="call" size={12} />
            <span className="font-mono">+51 {row.client_phone}</span>
            {row.delivery_address && (
              <>
                <span>·</span>
                <span className="truncate">{row.delivery_address}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="shrink-0">
        <WaLinkButton
          phoneE164={phoneE164}
          message={message}
          label="Enviar por WhatsApp"
          onSent={() => logSent.mutate()}
        />
      </div>
    </li>
  )
}
