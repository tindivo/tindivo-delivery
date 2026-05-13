'use client'
import { Icon } from '@tindivo/ui'
import { formatPct } from '../../lib/number-format'

export function DeltaPill({
  delta,
  previousValue,
  inverted,
}: {
  delta: number | null
  previousValue?: string
  /** Si true, valores negativos son "buenos" (ej: tasa de cancelación bajando). */
  inverted?: boolean
}) {
  if (delta == null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-low px-2 py-0.5 text-[11px] font-semibold text-on-surface-variant">
        <Icon name="remove" size={12} /> sin datos previos
      </span>
    )
  }
  const positive = inverted ? delta < 0 : delta > 0
  const negative = inverted ? delta > 0 : delta < 0
  const tone = positive
    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
    : negative
      ? 'bg-rose-50 text-rose-700 border-rose-100'
      : 'bg-surface-container-low text-on-surface-variant border-outline-variant/40'
  const arrow = delta > 0 ? 'arrow_upward' : delta < 0 ? 'arrow_downward' : 'remove'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold tabular-nums ${tone}`}
      title={previousValue ? `vs ${previousValue}` : undefined}
    >
      <Icon name={arrow} size={12} filled />
      {formatPct(Math.abs(delta), 1)}
    </span>
  )
}
