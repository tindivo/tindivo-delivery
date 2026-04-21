'use client'
import { Icon } from '@tindivo/ui'

type Props = {
  count: number
}

/**
 * Banner rojo pulsante que aparece cuando hay pedidos overdue en el feed.
 * Explicita al driver que debe atender estos primero — los amarillos quedan
 * deshabilitados hasta que se resuelvan los rojos.
 */
export function OverdueBanner({ count }: Props) {
  if (count === 0) return null

  return (
    <div
      role="alert"
      aria-live="polite"
      className="relative overflow-hidden rounded-[22px] tindivo-overdue-glow"
      style={{
        background: 'linear-gradient(135deg, #991B1B 0%, #BA1A1A 55%, #DC2626 100%)',
        color: '#ffffff',
        padding: '14px 16px',
      }}
    >
      <div
        aria-hidden="true"
        className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(255,255,255,0.22) 0%, transparent 60%)',
        }}
      />
      <div className="relative flex items-center gap-3">
        <span
          className="inline-flex items-center justify-center shrink-0"
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '14px',
            background: 'rgba(255,255,255,0.22)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Icon name="priority_high" size={24} filled />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold tracking-[0.22em] uppercase opacity-85">
            Pedidos urgentes
          </div>
          <div className="font-black text-base" style={{ letterSpacing: '-0.01em' }}>
            {count === 1
              ? 'Hay 1 pedido vencido — atiéndelo primero'
              : `Hay ${count} pedidos vencidos — atiéndelos primero`}
          </div>
        </div>
      </div>
    </div>
  )
}
