/**
 * Clasificación de urgencia de un pedido según cuánto falta para estar listo.
 *
 *   ready_at - now > 10 min     → 'upcoming'  (verde)   oculto al driver
 *   0 < ready_at - now <= 10min → 'pending'   (ámbar)   driver puede aceptar
 *   ready_at - now <= 0          → 'overdue'   (rojo)    prioritario, bloqueante
 *
 * Helper neutral frontend + backend: misma función en client tick y server filter.
 */
export type UrgencyTier = 'upcoming' | 'pending' | 'overdue'

export const URGENCY_THRESHOLD_MIN = 10

export function computeUrgencyTier(
  estimatedReadyAt: Date | string,
  now: Date = new Date(),
): UrgencyTier {
  const ready =
    typeof estimatedReadyAt === 'string' ? new Date(estimatedReadyAt) : estimatedReadyAt
  const deltaMin = (ready.getTime() - now.getTime()) / 60000
  if (deltaMin > URGENCY_THRESHOLD_MIN) return 'upcoming'
  if (deltaMin > 0) return 'pending'
  return 'overdue'
}

/**
 * Formato mm:ss (con signo negativo si ya pasó).
 * -02:45 significa "vencido hace 2 min 45 seg"
 */
export function formatRemaining(
  estimatedReadyAt: Date | string,
  now: Date = new Date(),
): string {
  const ready =
    typeof estimatedReadyAt === 'string' ? new Date(estimatedReadyAt) : estimatedReadyAt
  const deltaSec = Math.round((ready.getTime() - now.getTime()) / 1000)
  const absMin = Math.floor(Math.abs(deltaSec) / 60)
  const absSec = Math.abs(deltaSec) % 60
  const sign = deltaSec < 0 ? '-' : ''
  return `${sign}${String(absMin).padStart(2, '0')}:${String(absSec).padStart(2, '0')}`
}

/**
 * Texto humano "En 5 min", "Vence ahora", "Vencido 2 min" según tier.
 */
export function remainingLabel(
  estimatedReadyAt: Date | string,
  now: Date = new Date(),
): string {
  const ready =
    typeof estimatedReadyAt === 'string' ? new Date(estimatedReadyAt) : estimatedReadyAt
  const deltaMin = Math.round((ready.getTime() - now.getTime()) / 60000)
  if (deltaMin > 1) return `En ${deltaMin} min`
  if (deltaMin === 1) return 'En 1 min'
  if (deltaMin === 0) return 'Listo ahora'
  if (deltaMin === -1) return 'Vencido 1 min'
  return `Vencido ${Math.abs(deltaMin)} min`
}
