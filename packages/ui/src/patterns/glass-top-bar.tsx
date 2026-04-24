import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

type Props = {
  left?: ReactNode
  title?: ReactNode
  right?: ReactNode
  className?: string
  subtitle?: string
}

/**
 * Top bar glass disruptivo, estilo "floating card":
 *  - Altura 76px con padding interno generoso (16px vertical, 22px horizontal)
 *  - Bordes inferiores redondeados (24px) → se percibe como card flotante
 *  - Mesh orbs en esquinas opuestas + grid pattern sutil
 *  - Logo con dot pulsante + subtitle con línea accent
 *  - Slots left/right respiran con gap natural
 */
export function GlassTopBar({ left, title, right, className, subtitle }: Props) {
  return (
    <header
      className={cn('fixed top-0 left-0 right-0 z-50 w-full overflow-hidden', className)}
      style={{
        height: '64px',
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.78) 100%)',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        borderBottomLeftRadius: '24px',
        borderBottomRightRadius: '24px',
        borderBottom: '1px solid rgba(255, 107, 53, 0.08)',
        borderLeft: '1px solid rgba(255, 107, 53, 0.05)',
        borderRight: '1px solid rgba(255, 107, 53, 0.05)',
        boxShadow:
          'inset 0 1px 0 rgba(255, 255, 255, 0.95), 0 8px 28px -10px rgba(171, 53, 0, 0.12), 0 4px 12px -4px rgba(171, 53, 0, 0.06)',
      }}
    >
      {/* Orb mesh esquina superior izquierda */}
      <div
        aria-hidden="true"
        className="absolute -top-8 -left-8 w-44 h-44 rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(255, 107, 53, 0.18) 0%, rgba(255, 107, 53, 0) 60%)',
        }}
      />
      {/* Orb mesh esquina inferior derecha */}
      <div
        aria-hidden="true"
        className="absolute -bottom-10 -right-8 w-48 h-48 rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(255, 140, 66, 0.14) 0%, rgba(255, 140, 66, 0) 65%)',
        }}
      />
      {/* Contenedor interno con padding generoso (vertical + horizontal) */}
      <div
        className="relative flex items-center justify-between h-full max-w-7xl mx-auto"
        style={{ padding: '0 22px' }}
      >
        {/* Zona izquierda: slot + logo + subtitle */}
        <div className="flex items-center gap-3 min-w-0">
          {left ? <div className="shrink-0">{left}</div> : null}

          {title ? (
            <div className="flex flex-col justify-center min-w-0" style={{ gap: '3px' }}>
              <div className="relative flex items-center">
                <span
                  className="font-black uppercase"
                  style={{
                    fontSize: '19px',
                    letterSpacing: '-0.05em',
                    lineHeight: 1.05,
                    color: '#ab3500',
                    textShadow:
                      '0 1px 0 rgba(255, 255, 255, 0.6), 0 2px 14px rgba(255, 107, 53, 0.28)',
                  }}
                >
                  {title}
                </span>
                <span
                  aria-hidden="true"
                  className="ml-1.5 w-[7px] h-[7px] rounded-full relative shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%)',
                    boxShadow:
                      '0 0 0 3px rgba(255, 107, 53, 0.18), 0 2px 8px rgba(255, 107, 53, 0.55)',
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full animate-ping"
                    style={{
                      background: '#FF6B35',
                      animationDuration: '2.5s',
                    }}
                  />
                </span>
              </div>
              {subtitle && (
                <span
                  className="text-[9px] font-medium uppercase inline-flex items-center gap-1.5"
                  style={{
                    letterSpacing: '0.28em',
                    color: '#a1a1aa',
                    lineHeight: 1,
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="inline-block w-2 h-px"
                    style={{
                      background:
                        'linear-gradient(90deg, rgba(255,107,53,0.5) 0%, transparent 100%)',
                    }}
                  />
                  {subtitle}
                </span>
              )}
            </div>
          ) : null}
        </div>

        {/* Zona derecha: acciones */}
        {right ? <div className="flex items-center gap-2 shrink-0">{right}</div> : null}
      </div>

      {/* Línea inferior gradient interior — cierre luminoso justo arriba del radius */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-8 right-8 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(255, 107, 53, 0.35) 50%, transparent 100%)',
        }}
      />
    </header>
  )
}
