import type { ReactNode } from 'react'
import { Icon } from '../icons/icon'
import { cn } from '../lib/cn'

type Props = {
  icon: string
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'solar'
  className?: string
  children?: ReactNode
}

const washMap: Record<
  NonNullable<Props['variant']>,
  { glow: string; accent: string; ring: string }
> = {
  success: {
    glow: 'bg-emerald-400/25',
    accent: 'text-emerald-500',
    ring: 'shadow-[0_4px_20px_rgba(16,185,129,0.15),0_20px_50px_rgba(16,185,129,0.08)]',
  },
  warning: {
    glow: 'bg-amber-400/25',
    accent: 'text-amber-500',
    ring: 'shadow-[0_4px_20px_rgba(234,179,8,0.15),0_20px_50px_rgba(234,179,8,0.08)]',
  },
  danger: {
    glow: 'bg-red-400/25',
    accent: 'text-red-500',
    ring: 'shadow-[0_4px_20px_rgba(239,68,68,0.15),0_20px_50px_rgba(239,68,68,0.08)]',
  },
  info: {
    glow: 'bg-primary-container/25',
    accent: 'text-primary-container',
    ring: 'shadow-[0_4px_20px_rgba(255,107,53,0.15),0_20px_50px_rgba(255,107,53,0.08)]',
  },
  solar: {
    glow: 'bg-solar-gradient',
    accent: 'text-white',
    ring: 'solar-glow-xl',
  },
}

/**
 * Hero badge etéreo (ver Mockups/ejemplo.html).
 * Halo exterior `blur-3xl` + card interior con double shadow color+neutral.
 */
export function HeroBadge({ icon, variant = 'info', className, children }: Props) {
  const { glow, accent, ring } = washMap[variant]
  const isSolid = variant === 'solar'

  return (
    <div className={cn('relative flex items-center justify-center w-32 h-32', className)}>
      <div
        className={cn(
          'absolute inset-0 rounded-full blur-3xl opacity-90',
          isSolid ? 'bg-gradient-to-br from-[#ff6b35] to-[#ff8c42]' : glow,
        )}
      />
      <div
        className={cn(
          'relative w-24 h-24 rounded-full flex items-center justify-center',
          'border border-outline-variant/15',
          isSolid ? 'bg-solar-gradient' : 'bg-surface-container-lowest',
          ring,
        )}
      >
        <Icon name={icon} size={56} filled className={accent} />
      </div>
      {children}
    </div>
  )
}
