'use client'
import { useDriverCapacity } from '@/features/motorizado/active-order/hooks/use-driver-capacity'
import { Icon } from '@tindivo/ui'

/**
 * Versión compacta del widget Mochila para el right slot del GlassTopBar.
 * Siempre visible (cualquier tab, cualquier scroll). Muestra solo el ratio
 * `usedSlots/max` con icono y color semántico (verde/amarillo/rojo).
 *
 * La versión completa con detalle textual sigue en `available-orders/components/
 * capacity-indicator.tsx` y se usa donde sobra espacio (lista Disponibles).
 */
export function CapacityIndicatorCompact() {
  const { usedSlots, max, isLoading } = useDriverCapacity()
  if (isLoading) return null

  const isFull = usedSlots >= max
  const isNear = !isFull && usedSlots >= max - 1

  const palette = isFull
    ? {
        bg: 'linear-gradient(135deg, #991B1B 0%, #BA1A1A 100%)',
        color: '#ffffff',
        icon: 'block',
        border: 'transparent',
      }
    : isNear
      ? {
          bg: 'rgba(234, 179, 8, 0.18)',
          color: '#92400E',
          icon: 'hourglass_top',
          border: 'rgba(234, 179, 8, 0.4)',
        }
      : {
          bg: 'rgba(16, 185, 129, 0.16)',
          color: '#065F46',
          icon: 'delivery_dining',
          border: 'rgba(16, 185, 129, 0.36)',
        }

  return (
    <div
      role="status"
      aria-label={`Mochila ${usedSlots} de ${max} slots`}
      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 font-bold text-sm"
      style={{
        background: palette.bg,
        color: palette.color,
        border: `1px solid ${palette.border}`,
      }}
    >
      <Icon name={palette.icon} size={16} filled />
      <span className="font-mono tabular-nums leading-none" style={{ letterSpacing: '-0.01em' }}>
        {usedSlots}/{max}
      </span>
    </div>
  )
}
