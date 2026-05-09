'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export type BottomNavItem = {
  href: string
  label: string
  icon: string
  /**
   * Badge numérico opcional sobre el ícono. Usar para indicar cantidad de
   * elementos pendientes (ej: cantidad de restaurantes con efectivo por
   * devolver). 0/null/undefined → no se renderiza.
   */
  badge?: number | null
}

type Props = {
  items: BottomNavItem[]
}

/**
 * Bottom navigation — estilo mockup nav.html con ajustes de designer:
 *  - rounded-t-[32px] solo en esquinas superiores
 *  - Ancho 100%, pegado al fondo
 *  - pt-4 pb-3 (más aire arriba, menos abajo que el mockup crudo — mejor balance)
 *  - Todos los items con `flex-1` para alineación vertical perfecta
 *  - `gap-1` entre items para respiración
 *  - Pill activa se "destaca" por color + shadow, no por tamaño
 */
export function BottomNav({ items }: Props) {
  const pathname = usePathname()

  // Elegir el item cuyo href coincide con la ruta actual más específicamente
  // (el href más largo gana). Esto evita que el item "home" (/motorizado) se
  // marque como activo cuando estamos en una subruta (/motorizado/efectivo).
  let activeHref: string | null = null
  for (const item of items) {
    const matches = pathname === item.href || pathname.startsWith(`${item.href}/`)
    if (matches && (!activeHref || item.href.length > activeHref.length)) {
      activeHref = item.href
    }
  }

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed bottom-0 left-0 w-full z-30 flex items-stretch gap-1 px-3 backdrop-blur-2xl"
      style={{
        background: 'rgba(255, 255, 255, 0.82)',
        borderTopLeftRadius: '32px',
        borderTopRightRadius: '32px',
        boxShadow: '0 -4px 30px rgba(18, 38, 32, 0.08)',
        paddingTop: '14px',
        paddingBottom: 'calc(14px + env(safe-area-inset-bottom))',
      }}
    >
      {items.map((item) => {
        const active = item.href === activeHref
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className="flex-1 flex flex-col items-center justify-center transition-all active:scale-90 duration-300"
            style={
              active
                ? {
                    backgroundImage: 'linear-gradient(135deg, #F26241 0%, #FF9B63 100%)',
                    color: '#ffffff',
                    borderRadius: '22px',
                    padding: '10px 6px',
                    boxShadow:
                      '0 8px 18px -2px rgba(242, 98, 65, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
                  }
                : {
                    color: '#7a857f',
                    padding: '10px 6px',
                  }
            }
          >
            <span className="relative inline-flex items-center justify-center">
              <span
                className="material-symbols-outlined"
                aria-hidden="true"
                style={{
                  fontSize: '24px',
                  lineHeight: 1,
                  fontVariationSettings: active
                    ? "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24"
                    : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
                }}
              >
                {item.icon}
              </span>
              {typeof item.badge === 'number' && item.badge > 0 && (
                <span
                  aria-label={`${item.badge} pendientes`}
                  className="absolute -top-1.5 -right-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-black leading-none rounded-full"
                  style={{
                    background: active ? '#ffffff' : '#F26241',
                    color: active ? '#F26241' : '#ffffff',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
                    border: active ? '1.5px solid #F26241' : '1.5px solid #ffffff',
                  }}
                >
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </span>
            <span
              className="text-[10px] font-semibold uppercase whitespace-nowrap"
              style={{
                letterSpacing: '0.08em',
                marginTop: '5px',
                opacity: active ? 1 : 0.75,
              }}
            >
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
