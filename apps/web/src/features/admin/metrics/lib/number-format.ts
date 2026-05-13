/**
 * Formatters numéricos para el dashboard de métricas.
 * Locale fijo 'es-PE' (Perú). Moneda S/ (soles).
 */

const currency = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const currencyDecimals = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const integer = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 })
const oneDecimal = new Intl.NumberFormat('es-PE', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

export function formatCurrency(n: number, opts?: { decimals?: boolean }): string {
  if (!Number.isFinite(n)) return '—'
  return (opts?.decimals ? currencyDecimals : currency).format(n)
}

export function formatInt(n: number): string {
  if (!Number.isFinite(n)) return '—'
  return integer.format(n)
}

export function formatPct(n: number | null | undefined, fractionDigits = 1): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `${n.toFixed(fractionDigits)}%`
}

/**
 * Formatea minutos como "12m" o "1h 5m". null → "—".
 */
export function formatDurationMinutes(min: number | null | undefined): string {
  if (min == null || !Number.isFinite(min)) return '—'
  const m = Math.round(min)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const rest = m % 60
  return rest > 0 ? `${h}h ${rest}m` : `${h}h`
}

export function formatDecimal(n: number | null | undefined, fractionDigits = 1): string {
  if (n == null || !Number.isFinite(n)) return '—'
  if (fractionDigits === 1) return oneDecimal.format(n)
  return new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(n)
}

/**
 * Calcula porcentaje de cambio entre dos valores. Devuelve null si previous=0.
 */
export function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return ((current - previous) / Math.abs(previous)) * 100
}

/**
 * Día en formato corto "12 may" desde un ISO date.
 */
export function formatDayShortFromIso(iso: string): string {
  const d = new Date(iso)
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
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]}`
}
