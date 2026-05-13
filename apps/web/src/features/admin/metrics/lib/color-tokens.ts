/**
 * Paleta de colores para Recharts que respeta los design tokens de Tindivo.
 *
 * Estos colores DEBEN coincidir con los de packages/config/tailwind/theme.css.
 * Si cambian los tokens, sincronizar aquí también.
 */

export const CHART_COLORS = {
  primary: '#b43c1f',
  primaryContainer: '#f26241',
  primaryFixed: '#ffe1d5',
  surface: '#fbfaf7',
  surfaceContainer: '#eeece7',
  outline: '#d9ded7',
  onSurface: '#17201c',
  onSurfaceVariant: '#53605c',
  success: '#059669',
  successLight: '#d1fae5',
  warning: '#eab308',
  warningLight: '#fef3c7',
  danger: '#ba1a1a',
  dangerLight: '#fde0e0',
  info: '#2563eb',
  infoLight: '#dbeafe',
} as const

export const PAYMENT_COLORS = {
  prepaid: '#059669',
  yape: '#7c3aed',
  cash: '#eab308',
  mixed: '#f26241',
} as const

export const SOURCE_COLORS = {
  restaurant_pwa: '#b43c1f',
  customer_pwa: '#2563eb',
} as const

export const VEHICLE_COLORS: Record<string, string> = {
  moto: '#b43c1f',
  bicicleta: '#059669',
  pie: '#2563eb',
  auto: '#7c3aed',
}

/**
 * Escala de heatmap por quintiles. cellOpacity recibe un valor 0-1
 * (ratio orders/max) y devuelve un opacity discreto para que las
 * diferencias se vean incluso en valles bajos.
 */
export function heatmapQuintileOpacity(ratio: number): number {
  if (ratio <= 0) return 0
  if (ratio < 0.2) return 0.18
  if (ratio < 0.4) return 0.36
  if (ratio < 0.6) return 0.55
  if (ratio < 0.8) return 0.74
  return 0.95
}
