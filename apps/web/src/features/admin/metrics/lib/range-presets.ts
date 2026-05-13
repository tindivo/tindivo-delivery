/**
 * Presets de rango temporal en hora Lima (UTC-5, sin DST).
 * Cada preset retorna `{ from, to }` en UTC (ISO) listos para enviar al API.
 *
 * Convención: `to` es exclusivo (medianoche del día siguiente Lima).
 * Ejemplo: "Hoy" = [00:00 Lima, 24:00 Lima) = [05:00 UTC, 05:00 UTC+1d).
 */

const LIMA_OFFSET_MS = 5 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

export type PresetId =
  | 'today'
  | 'yesterday'
  | 'last7'
  | 'last30'
  | 'last90'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisYear'
  | 'custom'

export const PRESET_LABELS: Record<Exclude<PresetId, 'custom'>, string> = {
  today: 'Hoy',
  yesterday: 'Ayer',
  last7: 'Últimos 7 días',
  last30: 'Últimos 30 días',
  last90: 'Últimos 90 días',
  thisMonth: 'Este mes',
  lastMonth: 'Mes pasado',
  thisYear: 'Este año',
}

export type Range = { from: Date; to: Date }

function limaMidnightTodayUtc(): Date {
  const now = new Date()
  const limaNow = new Date(now.getTime() - LIMA_OFFSET_MS)
  const startOfDayUtc = Date.UTC(
    limaNow.getUTCFullYear(),
    limaNow.getUTCMonth(),
    limaNow.getUTCDate(),
  )
  return new Date(startOfDayUtc + LIMA_OFFSET_MS)
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY_MS)
}

function limaMonthBounds(offsetMonths: number): Range {
  const now = new Date()
  const limaNow = new Date(now.getTime() - LIMA_OFFSET_MS)
  const y = limaNow.getUTCFullYear()
  const m = limaNow.getUTCMonth() + offsetMonths
  const fromUtc = Date.UTC(y, m, 1)
  const toUtc = Date.UTC(y, m + 1, 1)
  return {
    from: new Date(fromUtc + LIMA_OFFSET_MS),
    to: new Date(toUtc + LIMA_OFFSET_MS),
  }
}

export function rangeFromPreset(id: PresetId, custom?: Range): Range {
  const todayStart = limaMidnightTodayUtc()
  const tomorrow = addDays(todayStart, 1)
  switch (id) {
    case 'today':
      return { from: todayStart, to: tomorrow }
    case 'yesterday':
      return { from: addDays(todayStart, -1), to: todayStart }
    case 'last7':
      return { from: addDays(todayStart, -6), to: tomorrow }
    case 'last30':
      return { from: addDays(todayStart, -29), to: tomorrow }
    case 'last90':
      return { from: addDays(todayStart, -89), to: tomorrow }
    case 'thisMonth':
      return limaMonthBounds(0)
    case 'lastMonth':
      return limaMonthBounds(-1)
    case 'thisYear': {
      const limaNow = new Date(Date.now() - LIMA_OFFSET_MS)
      const y = limaNow.getUTCFullYear()
      return {
        from: new Date(Date.UTC(y, 0, 1) + LIMA_OFFSET_MS),
        to: addDays(todayStart, 1),
      }
    }
    case 'custom':
      return custom ?? { from: addDays(todayStart, -29), to: tomorrow }
  }
}

/**
 * Calcula el período inmediatamente anterior del mismo tamaño.
 * Si `range` es 7 días, el período anterior son los 7 días previos.
 */
export function previousRange(range: Range): Range {
  const span = range.to.getTime() - range.from.getTime()
  return {
    from: new Date(range.from.getTime() - span),
    to: new Date(range.from.getTime()),
  }
}

/**
 * Serializa `Range` para query string (formato YYYY-MM-DD en hora Lima).
 */
export function rangeToQuery(range: Range): { from: string; to: string } {
  return { from: range.from.toISOString(), to: range.to.toISOString() }
}

/**
 * Texto legible para mostrar al usuario, ej "21 abr → 13 may".
 */
export function formatRangeLabel(range: Range): string {
  return `${formatDayShort(range.from)} → ${formatDayShort(addDays(range.to, -0.0001))}`
}

function formatDayShort(d: Date): string {
  const lima = new Date(d.getTime() - LIMA_OFFSET_MS)
  const months = [
    'ene',
    'feb',
    'mar',
    'abr',
    'may',
    'jun',
    'jul',
    'ago',
    'sep',
    'oct',
    'nov',
    'dic',
  ]
  return `${lima.getUTCDate()} ${months[lima.getUTCMonth()]}`
}

/**
 * Cuántos días enteros abarca el rango. Útil para escalar charts.
 */
export function rangeDays(range: Range): number {
  return Math.round((range.to.getTime() - range.from.getTime()) / DAY_MS)
}
