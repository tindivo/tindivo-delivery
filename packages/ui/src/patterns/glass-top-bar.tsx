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
 *  - Velo de gradiente sutil sin ruido visual
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
        borderBottom: '1px solid rgba(180, 60, 31, 0.08)',
        borderLeft: '1px solid rgba(180, 60, 31, 0.05)',
        borderRight: '1px solid rgba(180, 60, 31, 0.05)',
        boxShadow:
          'inset 0 1px 0 rgba(255, 255, 255, 0.95), 0 8px 28px -10px rgba(18, 38, 32, 0.14), 0 4px 12px -4px rgba(18, 38, 32, 0.08)',
      }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(110deg, rgba(242,98,65,0.12), transparent 36%, rgba(20,184,166,0.07))',
        }}
      />
      {/* Contenedor interno con padding generoso (vertical + horizontal) */}
      <div
        className="relative mx-auto flex h-full max-w-7xl items-center justify-between"
        style={{ padding: '0 22px' }}
      >
        {/* Zona izquierda: slot + logo + subtitle */}
        <div className="flex min-w-0 items-center gap-3">
          {left ? <div className="shrink-0">{left}</div> : null}

          {title ? (
            <div className="flex min-w-0 flex-col justify-center" style={{ gap: '3px' }}>
              <div className="relative flex items-center">
                <span
                  className="font-black uppercase"
                  style={{
                    fontSize: '19px',
                    letterSpacing: 0,
                    lineHeight: 1.05,
                    color: '#b43c1f',
                    textShadow:
                      '0 1px 0 rgba(255, 255, 255, 0.6), 0 2px 14px rgba(242, 98, 65, 0.2)',
                  }}
                >
                  {title}
                </span>
                <span
                  aria-hidden="true"
                  className="ml-1.5 w-[7px] h-[7px] rounded-full relative shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #F26241 0%, #FF9B63 100%)',
                    boxShadow:
                      '0 0 0 3px rgba(242, 98, 65, 0.16), 0 2px 8px rgba(242, 98, 65, 0.42)',
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full animate-ping"
                    style={{
                      background: '#F26241',
                      animationDuration: '2.5s',
                    }}
                  />
                </span>
              </div>
              {subtitle && (
                <span
                  className="inline-flex max-w-[150px] items-center gap-1.5 truncate whitespace-nowrap text-xs font-semibold uppercase sm:max-w-none"
                  style={{
                    letterSpacing: 0,
                    color: '#7a857f',
                    lineHeight: 1,
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="inline-block w-2 h-px"
                    style={{
                      background:
                        'linear-gradient(90deg, rgba(242,98,65,0.5) 0%, transparent 100%)',
                    }}
                  />
                  {subtitle}
                </span>
              )}
            </div>
          ) : null}
        </div>

        {/* Zona derecha: acciones */}
        {right ? <div className="flex shrink-0 items-center gap-2">{right}</div> : null}
      </div>

      {/* Línea inferior gradient interior — cierre luminoso justo arriba del radius */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-8 right-8 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(242, 98, 65, 0.28) 50%, transparent 100%)',
        }}
      />
    </header>
  )
}
