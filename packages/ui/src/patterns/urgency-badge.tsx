import { Icon } from '../icons/icon'
import { cn } from '../lib/cn'
import {
  type UrgencyTier,
  computeUrgencyTier,
  formatRemaining,
  remainingLabel,
} from '../lib/urgency'

type Props = {
  estimatedReadyAt: string | Date
  now?: Date
  variant?: 'chip' | 'hero'
  className?: string
}

const TIER_STYLES: Record<
  UrgencyTier,
  { bg: string; color: string; border: string; icon: string; label: string }
> = {
  upcoming: {
    bg: 'rgba(16, 185, 129, 0.12)',
    color: '#065F46',
    border: 'rgba(16, 185, 129, 0.28)',
    icon: 'schedule',
    label: 'En cocina',
  },
  pending: {
    bg: 'rgba(234, 179, 8, 0.14)',
    color: '#92400E',
    border: 'rgba(234, 179, 8, 0.32)',
    icon: 'hourglass_top',
    label: 'Listo pronto',
  },
  overdue: {
    bg: 'rgba(186, 26, 26, 0.14)',
    color: '#991B1B',
    border: 'rgba(186, 26, 26, 0.35)',
    icon: 'priority_high',
    label: 'Urgente',
  },
}

/**
 * Badge que muestra tier + countdown del pedido.
 *
 * - `variant="chip"` — pill compacto para esquina de OrderCard.
 * - `variant="hero"` — bloque grande para el header del detalle.
 */
export function UrgencyBadge({
  estimatedReadyAt,
  now = new Date(),
  variant = 'chip',
  className,
}: Props) {
  const tier = computeUrgencyTier(estimatedReadyAt, now)
  const style = TIER_STYLES[tier]
  const countdown = formatRemaining(estimatedReadyAt, now)

  if (variant === 'hero') {
    return (
      <div
        className={cn(
          'relative overflow-hidden rounded-[20px] px-4 py-3',
          tier === 'overdue' && 'tindivo-overdue-glow',
          tier === 'pending' && 'tindivo-pending-pulse',
          className,
        )}
        style={{
          background: style.bg,
          border: `1px solid ${style.border}`,
          color: style.color,
        }}
        aria-label={`${style.label}: ${remainingLabel(estimatedReadyAt, now)}`}
      >
        <div className="flex items-center gap-2.5">
          <Icon name={style.icon} size={22} filled />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold tracking-[0.18em] uppercase opacity-80">
              {style.label}
            </div>
            <div
              className="font-black text-lg font-mono tabular-nums"
              style={{ letterSpacing: '-0.02em' }}
            >
              {countdown}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <span
      className={cn(
        'shrink-0 inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded-full font-mono tabular-nums',
        tier === 'pending' && 'tindivo-pending-pulse',
        className,
      )}
      style={{
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
      }}
      aria-label={`${style.label}: ${remainingLabel(estimatedReadyAt, now)}`}
    >
      <Icon name={style.icon} size={12} filled />
      {countdown}
    </span>
  )
}
