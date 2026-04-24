import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  /** z-index; por defecto 40 para quedar sobre BottomNav (z-30) */
  zIndex?: number
}

/**
 * Barra de acciones fija anclada al viewport bottom.
 *
 * IMPORTANT: usa inline styles para `position: fixed` + offsets porque algunas
 * clases Tailwind v4 (bottom-0 / inset-x-0) no siempre se emiten cuando el
 * componente vive en `packages/ui` y el scan no detecta las utilities por
 * los symlinks de pnpm workspaces. Inline styles = garantía.
 *
 * Debe renderizarse como SIBLING del contenido scrollable, nunca dentro de un
 * <form> o contenedor con ancho limitado — de lo contrario queda contenido.
 */
export function BottomActionBar({ children, zIndex = 40 }: Props) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex,
        padding: '16px',
        paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
        background: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderTop: '1px solid rgba(225, 191, 181, 0.25)',
        boxShadow: '0 -8px 24px -8px rgba(171, 53, 0, 0.08)',
      }}
    >
      <div
        style={{
          maxWidth: '28rem',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {children}
      </div>
    </div>
  )
}
