'use client'
import type { TrackingPendingRow } from '@tindivo/api-client'
import { buildWaMeUrl, normalizeToE164Pe } from '@tindivo/core'
import { EmptyState, Icon, Skeleton, StatusChip } from '@tindivo/ui'
import Link from 'next/link'
import { useState } from 'react'
import { useTrackingSent } from '../hooks/use-tracking-sent'

const SAN_JACINTO_DT = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Lima',
  hour12: false,
})

function fmtDateTime(iso: string | null): string {
  if (!iso) return '—'
  return SAN_JACINTO_DT.format(new Date(iso))
}

function getOrigin(): string {
  if (typeof window !== 'undefined') return window.location.origin
  return process.env.NEXT_PUBLIC_APP_URL ?? 'https://tindivo-beta.vercel.app'
}

function buildTrackingMessage(row: TrackingPendingRow, trackingUrl: string): string {
  const restaurantName = row.restaurants?.name ?? 'tu restaurante'
  const driverFirstName = row.drivers?.full_name?.split(' ')[0] ?? 'el motorizado'
  return `Hola! 👋 Tu pedido #${row.short_id} de ${restaurantName} está en camino con ${driverFirstName}.\n\nSigue la entrega en vivo aquí:\n${trackingUrl}\n\n¡Gracias por tu compra!`
}

export function TrackingSentList() {
  const { data, isLoading } = useTrackingSent()
  const items = data?.items ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/tracking"
          className="rounded-full p-2 hover:bg-surface-container-low transition-colors shrink-0"
          aria-label="Volver"
        >
          <Icon name="arrow_back" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="bleed-text font-black text-2xl md:text-3xl text-on-surface">
            Tracking enviados
          </h1>
          <p className="text-on-surface-variant text-xs md:text-sm mt-1 max-w-2xl">
            Historial de WhatsApps enviados al cliente con el link de tracking (hora San Jacinto).
            Si el cliente perdió el link, puedes reenviarlo o copiarlo.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon="history"
          title="Sin envíos aún"
          description="Cuando el admin envíe el primer WhatsApp de tracking aparecerá aquí."
        />
      ) : (
        <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/15 overflow-x-auto">
          <table className="w-full text-sm min-w-[860px]">
            <thead className="bg-surface-container-low text-xs uppercase tracking-wider text-on-surface-variant">
              <tr>
                <th className="text-left px-4 py-3">Short ID</th>
                <th className="text-left px-4 py-3">Restaurante</th>
                <th className="text-left px-4 py-3">Cliente</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-right px-4 py-3">Enviado</th>
                <th className="text-right px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <TrackingRow key={row.id} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function TrackingRow({ row }: { row: TrackingPendingRow }) {
  const trackingUrl = `${getOrigin()}/pedidos/${row.short_id}`
  const phoneE164 = normalizeToE164Pe(row.client_phone) ?? row.client_phone
  const message = buildTrackingMessage(row, trackingUrl)
  const waUrl = buildWaMeUrl(phoneE164, message)

  return (
    <tr className="border-t border-outline-variant/10 hover:bg-surface-container-low/50">
      <td className="px-4 py-3 font-mono text-xs">#{row.short_id}</td>
      <td className="px-4 py-3 font-semibold">
        <span className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-block w-1.5 h-5 rounded-full"
            style={{ background: `#${row.restaurants?.accent_color ?? 'ab3500'}` }}
          />
          {row.restaurants?.name ?? '—'}
        </span>
      </td>
      <td className="px-4 py-3 text-on-surface-variant font-mono text-xs">
        +51 {row.client_phone}
      </td>
      <td className="px-4 py-3">
        <StatusChip status={row.status as never} />
      </td>
      <td className="px-4 py-3 text-right text-on-surface-variant text-xs font-mono tabular-nums">
        {fmtDateTime(row.tracking_link_sent_at)}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="inline-flex items-center gap-2">
          <CopyLinkButton url={trackingUrl} />
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-bold text-white"
            style={{ background: '#10B981' }}
            aria-label="Reenviar por WhatsApp"
          >
            <Icon name="chat" size={14} filled />
            WhatsApp
          </a>
          <Link
            href={`/admin/orders/${row.id}`}
            className="inline-flex items-center gap-1 text-primary font-bold text-xs hover:underline"
            aria-label="Ver detalle del pedido"
          >
            Ver
            <Icon name="chevron_right" size={14} />
          </Link>
        </div>
      </td>
    </tr>
  )
}

function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      // navigator.clipboard requiere HTTPS o localhost; en producción Vercel está OK.
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      // Fallback: prompt el usuario para copiar manualmente.
      window.prompt('Copia el link de tracking:', url)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-bold border transition-colors ${
        copied
          ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
          : 'bg-surface-container-lowest border-outline-variant/40 text-on-surface hover:bg-surface-container-low'
      }`}
      aria-label="Copiar link de tracking"
    >
      <Icon name={copied ? 'check' : 'content_copy'} size={14} />
      {copied ? 'Copiado' : 'Copiar link'}
    </button>
  )
}
