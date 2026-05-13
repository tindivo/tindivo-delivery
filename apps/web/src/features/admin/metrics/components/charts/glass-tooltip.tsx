'use client'
import type { ReactNode } from 'react'

/**
 * Tooltip glassmorfista para usar como `content` de los `<Tooltip>` de Recharts.
 * Coincide con .glass-panel del design system.
 */
export function GlassTooltip({
  title,
  rows,
}: {
  title: ReactNode
  rows: { label: ReactNode; value: ReactNode; color?: string }[]
}) {
  return (
    <div className="rounded-xl border border-outline-variant/20 bg-white/85 px-3 py-2 shadow-[0_10px_40px_rgba(0,0,0,0.06)] backdrop-blur-md">
      <div className="mb-1 text-xs font-bold uppercase tracking-[0.15em] text-on-surface-variant">
        {title}
      </div>
      <ul className="space-y-0.5">
        {rows.map((r, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: tooltip rows están fijas por chart
          <li key={i} className="flex items-center gap-2 text-sm">
            {r.color && <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />}
            <span className="text-on-surface-variant">{r.label}</span>
            <span className="ml-auto font-bold tabular-nums text-on-surface">{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
