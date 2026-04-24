import Link from 'next/link'
import type { ReactNode } from 'react'
import { Icon } from '../icons/icon'
import { cn } from '../lib/cn'

type Variant = 'solar' | 'success' | 'info' | 'neutral'

type BaseProps = {
  icon: string
  overline?: string
  title: ReactNode
  trailingIcon?: string
  variant?: Variant
  className?: string
}

type AsLinkProps = BaseProps & { href: string; onClick?: never }
type AsButtonProps = BaseProps & { href?: never; onClick?: () => void }

type Props = AsLinkProps | AsButtonProps

const variantStyles: Record<
  Variant,
  { gradient: string; glow: string; text: string; shine: string; accentRgb: string }
> = {
  solar: {
    gradient: 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 55%, #FFA85C 100%)',
    glow: '0 20px 40px -12px rgba(255, 107, 53, 0.5), 0 8px 20px -6px rgba(171, 53, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.35), inset 0 -2px 0 rgba(171, 53, 0, 0.18)',
    text: '#ffffff',
    shine: 'rgba(255, 255, 255, 0.38)',
    accentRgb: '255, 168, 92',
  },
  success: {
    gradient: 'linear-gradient(135deg, #059669 0%, #10b981 55%, #34d399 100%)',
    glow: '0 20px 40px -12px rgba(16, 185, 129, 0.5), 0 8px 20px -6px rgba(5, 150, 105, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
    text: '#ffffff',
    shine: 'rgba(255, 255, 255, 0.32)',
    accentRgb: '52, 211, 153',
  },
  info: {
    gradient: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 55%, #60a5fa 100%)',
    glow: '0 20px 40px -12px rgba(59, 130, 246, 0.5), 0 8px 20px -6px rgba(37, 99, 235, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
    text: '#ffffff',
    shine: 'rgba(255, 255, 255, 0.32)',
    accentRgb: '96, 165, 250',
  },
  neutral: {
    gradient: 'linear-gradient(135deg, #ffffff 0%, #f9f9f6 100%)',
    glow: '0 8px 20px rgba(171, 53, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
    text: '#1a1c1b',
    shine: 'rgba(255, 255, 255, 0.5)',
    accentRgb: '255, 107, 53',
  },
}

/**
 * SolarCTA — CTA hero con gradient mesh, shine animado, orbs decorativos
 * contenidos y icono glass pulsante.
 */
export function SolarCTA(props: Props) {
  const {
    icon,
    overline,
    title,
    trailingIcon = 'arrow_forward',
    variant = 'solar',
    className,
  } = props
  const s = variantStyles[variant]

  const inner = (
    <>
      {/* Orbs decorativos contenidos dentro del CTA (no salen) */}
      <span
        aria-hidden="true"
        className="absolute top-0 right-0 w-40 h-40 pointer-events-none opacity-70"
        style={{
          background:
            'radial-gradient(circle at top right, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 60%)',
        }}
      />
      <span
        aria-hidden="true"
        className="absolute bottom-0 left-0 w-40 h-40 pointer-events-none opacity-60"
        style={{
          background: `radial-gradient(circle at bottom left, rgba(${s.accentRgb}, 0.45) 0%, rgba(${s.accentRgb}, 0) 65%)`,
        }}
      />

      {/* Shine diagonal — se desliza en hover */}
      <span
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{ borderRadius: 28 }}
      >
        <span
          className="block absolute top-0 bottom-0 w-1/3 transition-transform duration-[1100ms] ease-out group-hover:translate-x-[280%]"
          style={{
            background: `linear-gradient(105deg, transparent 20%, ${s.shine} 50%, transparent 80%)`,
            transform: 'translateX(-200%) skewX(-15deg)',
          }}
        />
      </span>

      {/* Layout horizontal principal */}
      <span className="relative z-10 flex items-center gap-4">
        {/* Icono con halo + glass ring */}
        <span className="relative shrink-0 block">
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full blur-md"
            style={{ background: 'rgba(255, 255, 255, 0.45)' }}
          />
          <span
            className="relative flex items-center justify-center"
            style={{
              width: 60,
              height: 60,
              borderRadius: '9999px',
              background:
                'linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.18) 100%)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1.5px solid rgba(255, 255, 255, 0.55)',
              boxShadow: '0 6px 16px rgba(0, 0, 0, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.65)',
            }}
          >
            <Icon
              name={icon}
              size={28}
              filled
              className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]"
            />
          </span>
        </span>

        {/* Texto */}
        <span className="flex-1 min-w-0 block">
          {overline && (
            <span
              className="block text-[10px] uppercase font-bold opacity-90 mb-1"
              style={{ letterSpacing: '0.22em' }}
            >
              {overline}
            </span>
          )}
          <span
            className="block font-black"
            style={{
              fontSize: '30px',
              letterSpacing: '-0.035em',
              lineHeight: 1,
            }}
          >
            {title}
          </span>
        </span>

        {/* Arrow circle glass */}
        <span
          className="shrink-0 flex items-center justify-center transition-transform duration-300 group-hover:translate-x-1"
          style={{
            width: 38,
            height: 38,
            borderRadius: '9999px',
            background: 'rgba(255, 255, 255, 0.22)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            border: '1px solid rgba(255, 255, 255, 0.32)',
          }}
        >
          <Icon name={trailingIcon} size={20} />
        </span>
      </span>
    </>
  )

  const baseClass = cn(
    'group relative block overflow-hidden isolate',
    'transition-all duration-300',
    'hover:-translate-y-1 hover:shadow-[0_25px_50px_-12px_rgba(255,107,53,0.55)]',
    'active:scale-[0.98] active:translate-y-0',
    className,
  )

  const inlineStyle: React.CSSProperties = {
    borderRadius: '28px',
    padding: '20px 22px',
    minHeight: '100px',
    background: s.gradient,
    color: s.text,
    boxShadow: s.glow,
  }

  if ('href' in props && props.href) {
    return (
      <Link href={props.href} className={baseClass} style={inlineStyle}>
        {inner}
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={props.onClick}
      className={cn(baseClass, 'text-left w-full')}
      style={inlineStyle}
    >
      {inner}
    </button>
  )
}
