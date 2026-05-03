'use client'
import { Icon } from '@tindivo/ui'
import { formatNextOpenLabel, usePlatformStatus } from '../hooks/use-platform-status'

/**
 * Banner que se muestra cuando la plataforma está fuera de horario operativo.
 * No se renderiza si está abierta o si la query aún no respondió (fail-open).
 */
export function PlatformClosedBanner() {
  const { data } = usePlatformStatus()
  if (!data || data.isOpen) return null

  const nextLabel = formatNextOpenLabel(data.nextOpenAt)
  const message = nextLabel
    ? `Tindivo está cerrado. Abrimos ${nextLabel}.`
    : 'Tindivo está cerrado en este momento.'

  return (
    <div
      className="rounded-2xl border px-4 py-3 flex items-start gap-3"
      style={{
        background: 'rgba(255, 107, 53, 0.08)',
        borderColor: 'rgba(255, 107, 53, 0.35)',
        color: '#7C2D12',
      }}
    >
      <Icon name="schedule" className="mt-0.5" />
      <div className="text-sm font-medium">{message}</div>
    </div>
  )
}
