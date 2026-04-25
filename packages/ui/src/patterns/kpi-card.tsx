import { Icon } from '../icons/icon'
import { cn } from '../lib/cn'

type Props = {
  label: string
  value: string
  hint?: string
  icon?: string
  /** Color visual del card. Default neutral. */
  variant?: 'neutral' | 'success' | 'warning' | 'danger' | 'info'
  className?: string
}

const VARIANTS: Record<
  NonNullable<Props['variant']>,
  { bg: string; border: string; fg: string }
> = {
  neutral: {
    bg: 'rgba(100, 116, 139, 0.06)',
    border: 'rgba(100, 116, 139, 0.22)',
    fg: '#334155',
  },
  success: {
    bg: 'rgba(16, 185, 129, 0.08)',
    border: 'rgba(16, 185, 129, 0.28)',
    fg: '#065F46',
  },
  warning: {
    bg: 'rgba(234, 179, 8, 0.10)',
    border: 'rgba(234, 179, 8, 0.30)',
    fg: '#92400E',
  },
  danger: {
    bg: 'rgba(186, 26, 26, 0.08)',
    border: 'rgba(186, 26, 26, 0.28)',
    fg: '#991B1B',
  },
  info: {
    bg: 'rgba(59, 130, 246, 0.08)',
    border: 'rgba(59, 130, 246, 0.28)',
    fg: '#1E40AF',
  },
}

/**
 * Tarjeta compacta para mostrar un KPI/métrica en dashboards.
 * Diseño minimalista con bordes muy redondeados, fondo claro.
 */
export function KpiCard({ label, value, hint, icon, variant = 'neutral', className }: Props) {
  const v = VARIANTS[variant]
  return (
    <div
      className={cn('rounded-2xl p-4', className)}
      style={{ background: v.bg, border: `1px solid ${v.border}`, color: v.fg }}
    >
      <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.18em] uppercase opacity-85">
        {icon && <Icon name={icon} size={14} />}
        {label}
      </div>
      <div
        className="font-black font-mono tabular-nums mt-1.5"
        style={{ fontSize: '24px', letterSpacing: '-0.02em', lineHeight: 1.05 }}
      >
        {value}
      </div>
      {hint && <div className="text-[11px] opacity-80 mt-1">{hint}</div>}
    </div>
  )
}
