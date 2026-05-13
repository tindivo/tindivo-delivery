'use client'
import { Icon } from '@tindivo/ui'
import { useState } from 'react'
import type { TimeRangeState } from '../hooks/use-time-range'
import { PRESET_LABELS, type PresetId, formatRangeLabel } from '../lib/range-presets'

const PRESETS: Exclude<PresetId, 'custom'>[] = [
  'today',
  'yesterday',
  'last7',
  'last30',
  'last90',
  'thisMonth',
  'lastMonth',
  'thisYear',
]

export function RangePicker({ state }: { state: TimeRangeState }) {
  const [open, setOpen] = useState(false)

  const currentLabel: string =
    state.preset === 'custom'
      ? formatRangeLabel(state.range)
      : PRESET_LABELS[state.preset as Exclude<PresetId, 'custom'>]

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2 rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-3 py-2 text-sm font-semibold text-on-surface shadow-[0_4px_20px_rgba(171,53,0,0.04)] transition hover:border-primary/30"
        >
          <Icon name="event" size={18} />
          {currentLabel}
          <Icon name={open ? 'expand_less' : 'expand_more'} size={18} />
        </button>
        {open && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
            />
            <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-2xl border border-outline-variant/20 bg-white p-2 shadow-[0_10px_40px_rgba(0,0,0,0.08)]">
              {PRESETS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    state.setPreset(id)
                    setOpen(false)
                  }}
                  className={
                    id === state.preset
                      ? 'flex w-full items-center justify-between rounded-xl bg-primary-container px-3 py-2 text-sm font-bold text-on-primary'
                      : 'flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low'
                  }
                >
                  {PRESET_LABELS[id]}
                  {id === state.preset && <Icon name="check" size={16} />}
                </button>
              ))}
              <CustomDateInput state={state} onApplied={() => setOpen(false)} />
            </div>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={state.toggleCompare}
        className={
          state.compare
            ? 'inline-flex items-center gap-2 rounded-xl border border-primary/50 bg-primary-container/30 px-3 py-2 text-sm font-bold text-primary'
            : 'inline-flex items-center gap-2 rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-3 py-2 text-sm font-semibold text-on-surface-variant hover:border-primary/30'
        }
        aria-pressed={state.compare}
      >
        <Icon name="compare_arrows" size={18} />
        vs período anterior
      </button>
    </div>
  )
}

function CustomDateInput({
  state,
  onApplied,
}: {
  state: TimeRangeState
  onApplied: () => void
}) {
  const [from, setFrom] = useState(() => state.range.from.toISOString().slice(0, 10))
  const [to, setTo] = useState(() => state.range.to.toISOString().slice(0, 10))
  return (
    <div className="mt-2 border-t border-outline-variant/15 px-3 pb-2 pt-3">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.15em] text-on-surface-variant">
        Rango personalizado
      </p>
      <div className="space-y-2">
        <label className="block text-xs text-on-surface-variant">
          Desde
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 w-full rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-2 py-1.5 text-sm"
          />
        </label>
        <label className="block text-xs text-on-surface-variant">
          Hasta
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 w-full rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-2 py-1.5 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            const f = new Date(`${from}T00:00:00-05:00`)
            const t = new Date(`${to}T00:00:00-05:00`)
            t.setUTCHours(t.getUTCHours() + 24)
            if (t > f) {
              state.setCustom(f, t)
              onApplied()
            }
          }}
          className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-bold text-on-primary"
        >
          Aplicar
        </button>
      </div>
    </div>
  )
}
