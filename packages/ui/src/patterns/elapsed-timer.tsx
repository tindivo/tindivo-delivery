import { Icon } from '../icons/icon'
import { cn } from '../lib/cn'
import { elapsedLabel, formatElapsed } from '../lib/urgency'

type Props = {
  createdAt: string | Date
  now?: Date
  className?: string
  variant?: 'chip' | 'inline'
  /** Texto pequeño bajo el cronómetro (ej. "Hace 12 min") */
  withLabel?: boolean
  /** Sobrescribe el label superior. Default: "Tiempo en cola". */
  label?: string
}

/**
 * Cronómetro de tiempo transcurrido desde que se creó el pedido.
 * Cuenta hacia arriba (positivo). Útil para SLA visibility:
 * "¿Cuánto lleva este pedido activo?"
 */
export function ElapsedTimer({
  createdAt,
  now = new Date(),
  className,
  variant = 'chip',
  withLabel = false,
  label,
}: Props) {
  const elapsed = formatElapsed(createdAt, now)
  const subLabel = elapsedLabel(createdAt, now)
  const headerLabel = label ?? 'Tiempo en cola'

  if (variant === 'inline') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 text-xs text-on-surface-variant font-mono tabular-nums',
          className,
        )}
      >
        <Icon name="timer" size={14} />
        {elapsed}
      </span>
    )
  }

  return (
    <div
      className={cn('inline-flex flex-col items-start gap-0.5 rounded-xl px-3 py-2', className)}
      style={{
        background: 'rgba(25, 118, 210, 0.08)',
        border: '1px solid rgba(25, 118, 210, 0.22)',
        color: '#1565C0',
      }}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.18em] uppercase">
        <Icon name="timer" size={12} filled />
        {headerLabel}
      </div>
      <div
        className="font-black font-mono tabular-nums"
        style={{ fontSize: '18px', letterSpacing: '-0.02em', lineHeight: 1.1 }}
      >
        {elapsed}
      </div>
      {withLabel && <div className="text-[10px] opacity-85">{subLabel}</div>}
    </div>
  )
}
