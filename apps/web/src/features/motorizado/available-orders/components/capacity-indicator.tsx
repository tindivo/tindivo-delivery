'use client'
import { Icon } from '@tindivo/ui'

type Props = {
  activeCount: number
  max: number
}

/**
 * Muestra el contador "activos: X / N" del turno. Al llegar al límite, cambia
 * a rojo con mensaje explícito — HU-D-013 y HU-D-020.
 */
export function CapacityIndicator({ activeCount, max }: Props) {
  const isFull = activeCount >= max
  const isNear = activeCount === max - 1

  const palette = isFull
    ? {
        bg: 'linear-gradient(135deg, #991B1B 0%, #BA1A1A 100%)',
        color: '#ffffff',
        border: 'transparent',
        icon: 'block',
      }
    : isNear
      ? {
          bg: 'rgba(234, 179, 8, 0.14)',
          color: '#92400E',
          border: 'rgba(234, 179, 8, 0.32)',
          icon: 'hourglass_top',
        }
      : {
          bg: 'rgba(16, 185, 129, 0.12)',
          color: '#065F46',
          border: 'rgba(16, 185, 129, 0.28)',
          icon: 'delivery_dining',
        }

  return (
    <output
      className="flex items-center gap-3 rounded-[18px] px-4 py-3"
      style={{
        background: palette.bg,
        color: palette.color,
        border: `1px solid ${palette.border}`,
      }}
    >
      <Icon name={palette.icon} size={22} filled />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-85">
          Capacidad
        </div>
        <div className="font-black text-base font-mono tabular-nums" style={{ letterSpacing: '-0.01em' }}>
          {activeCount} / {max} activos
        </div>
        {isFull && (
          <div className="text-[11px] font-semibold mt-0.5 opacity-95">
            Completa una entrega para recibir nuevos
          </div>
        )}
      </div>
    </output>
  )
}
