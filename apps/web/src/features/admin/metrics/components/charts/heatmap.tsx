'use client'
import { useMemo, useState } from 'react'
import { CHART_COLORS, heatmapQuintileOpacity } from '../../lib/color-tokens'
import { formatInt } from '../../lib/number-format'

type Cell = { dow: number; hour: number; orders: number; delivered: number; cancelled: number }

const DOW_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

/**
 * Heatmap día (0=domingo) × hora (0-23) construido con CSS grid.
 *
 * Las celdas vacías están presentes (gris claro) para que se vea la grilla
 * completa; las que tienen pedidos se tiñen con opacity por quintiles.
 *
 * Hover por celda muestra cuántos pedidos hubo (con desglose entregados/cancelados).
 */
export function Heatmap({ cells, maxOrders }: { cells: Cell[]; maxOrders: number }) {
  const map = useMemo(() => {
    const m = new Map<string, Cell>()
    for (const c of cells) m.set(`${c.dow}:${c.hour}`, c)
    return m
  }, [cells])
  const [hover, setHover] = useState<{ dow: number; hour: number } | null>(null)

  const hoverCell = hover ? map.get(`${hover.dow}:${hover.hour}`) : null

  return (
    <div className="relative">
      <div className="flex">
        {/* Etiquetas Y */}
        <div className="flex w-12 flex-col justify-around pr-2 text-right text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
          {DOW_LABELS.map((d) => (
            <span key={d} className="h-6 leading-6">
              {d}
            </span>
          ))}
        </div>
        {/* Grilla */}
        <div
          className="grid flex-1 gap-[2px]"
          style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}
        >
          {Array.from({ length: 7 * 24 }).map((_, idx) => {
            const dow = Math.floor(idx / 24)
            const hour = idx % 24
            const cellKey = `${dow}:${hour}`
            const c = map.get(cellKey)
            const orders = c?.orders ?? 0
            const ratio = maxOrders > 0 ? orders / maxOrders : 0
            const opacity = heatmapQuintileOpacity(ratio)
            return (
              <button
                key={cellKey}
                type="button"
                aria-label={`${DOW_LABELS[dow]} ${hour}:00 — ${orders} pedidos`}
                onMouseEnter={() => setHover({ dow, hour })}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover({ dow, hour })}
                onBlur={() => setHover(null)}
                className="h-6 rounded-sm transition-transform hover:scale-110"
                style={{
                  background:
                    opacity === 0
                      ? CHART_COLORS.surfaceContainer
                      : `color-mix(in srgb, ${CHART_COLORS.primary} ${Math.round(opacity * 100)}%, white)`,
                }}
              />
            )
          })}
        </div>
      </div>

      {/* Etiquetas X */}
      <div className="mt-1 flex">
        <div className="w-12" />
        <div
          className="grid flex-1 gap-[2px] text-[10px] tabular-nums text-on-surface-variant"
          style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}
        >
          {Array.from({ length: 24 }, (_, h) => h).map((h) => (
            <span key={`x-${h}`} className="text-center">
              {h % 3 === 0 ? `${h}h` : ''}
            </span>
          ))}
        </div>
      </div>

      {/* Tooltip flotante */}
      {hoverCell && (
        <div className="pointer-events-none absolute right-0 top-0 rounded-xl border border-outline-variant/20 bg-white/90 px-3 py-2 text-xs shadow-[0_4px_20px_rgba(0,0,0,0.08)] backdrop-blur">
          <p className="font-bold text-on-surface">
            {DOW_LABELS[hoverCell.dow]} · {hoverCell.hour}:00 - {hoverCell.hour}:59
          </p>
          <p className="tabular-nums text-on-surface-variant">
            <strong className="text-primary">{formatInt(hoverCell.orders)}</strong> pedidos
          </p>
          {hoverCell.delivered > 0 && (
            <p className="tabular-nums text-emerald-700">
              {formatInt(hoverCell.delivered)} entregados
            </p>
          )}
          {hoverCell.cancelled > 0 && (
            <p className="tabular-nums text-rose-700">
              {formatInt(hoverCell.cancelled)} cancelados
            </p>
          )}
        </div>
      )}

      {/* Leyenda */}
      <div className="mt-4 flex items-center gap-2 text-[11px] text-on-surface-variant">
        <span>Menos</span>
        <div className="flex gap-[2px]">
          {[0.18, 0.36, 0.55, 0.74, 0.95].map((o) => (
            <span
              key={o}
              className="h-3 w-5 rounded-sm"
              style={{
                background: `color-mix(in srgb, ${CHART_COLORS.primary} ${Math.round(o * 100)}%, white)`,
              }}
            />
          ))}
        </div>
        <span>Más</span>
      </div>
    </div>
  )
}
