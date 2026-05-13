'use client'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'
import {
  type PresetId,
  type Range,
  previousRange,
  rangeDays,
  rangeFromPreset,
  rangeToQuery,
} from '../lib/range-presets'

export type TimeRangeState = {
  preset: PresetId
  range: Range
  compare: boolean
  previous: Range | null
  days: number
  queryCurrent: { from: string; to: string }
  queryPrevious: { from: string; to: string } | null
  setPreset: (id: PresetId) => void
  setCustom: (from: Date, to: Date) => void
  toggleCompare: () => void
}

const VALID_PRESETS: ReadonlySet<PresetId> = new Set<PresetId>([
  'today',
  'yesterday',
  'last7',
  'last30',
  'last90',
  'thisMonth',
  'lastMonth',
  'thisYear',
  'custom',
])

function isPresetId(value: string | null): value is PresetId {
  return value != null && (VALID_PRESETS as Set<string>).has(value)
}

/**
 * Hook compartido por todos los tabs de métricas. Sincroniza el rango
 * temporal y el toggle "vs período anterior" con la URL (search params)
 * para que el rango sobreviva a recargas y se pueda compartir el link.
 */
export function useTimeRange(): TimeRangeState {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const presetParam = params.get('preset')
  const preset: PresetId = isPresetId(presetParam) ? presetParam : 'last30'

  const fromParam = params.get('from')
  const toParam = params.get('to')
  const compare = params.get('compare') === '1'

  const range: Range = useMemo(() => {
    if (preset === 'custom' && fromParam && toParam) {
      const f = new Date(fromParam)
      const t = new Date(toParam)
      if (!Number.isNaN(f.getTime()) && !Number.isNaN(t.getTime()) && t > f) {
        return { from: f, to: t }
      }
    }
    return rangeFromPreset(preset)
  }, [preset, fromParam, toParam])

  const previous: Range | null = useMemo(
    () => (compare ? previousRange(range) : null),
    [compare, range],
  )

  const writeParams = useCallback(
    (mut: (sp: URLSearchParams) => void) => {
      const next = new URLSearchParams(params.toString())
      mut(next)
      router.replace(`${pathname}?${next.toString()}`, { scroll: false })
    },
    [params, pathname, router],
  )

  const setPreset = useCallback(
    (id: PresetId) => {
      writeParams((sp) => {
        sp.set('preset', id)
        if (id !== 'custom') {
          sp.delete('from')
          sp.delete('to')
        }
      })
    },
    [writeParams],
  )

  const setCustom = useCallback(
    (from: Date, to: Date) => {
      writeParams((sp) => {
        sp.set('preset', 'custom')
        sp.set('from', from.toISOString())
        sp.set('to', to.toISOString())
      })
    },
    [writeParams],
  )

  const toggleCompare = useCallback(() => {
    writeParams((sp) => {
      if (sp.get('compare') === '1') sp.delete('compare')
      else sp.set('compare', '1')
    })
  }, [writeParams])

  return {
    preset,
    range,
    compare,
    previous,
    days: rangeDays(range),
    queryCurrent: rangeToQuery(range),
    queryPrevious: previous ? rangeToQuery(previous) : null,
    setPreset,
    setCustom,
    toggleCompare,
  }
}
