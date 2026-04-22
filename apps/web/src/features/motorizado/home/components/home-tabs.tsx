'use client'
import { cn } from '@tindivo/ui'
import { useEffect, useState } from 'react'
import { useDriverActiveOrdersRealtime } from '@/features/motorizado/active-order/hooks/use-driver-active-orders'
import { useDriverCapacity } from '@/features/motorizado/active-order/hooks/use-driver-capacity'
import { MyActiveOrdersList } from '@/features/motorizado/active-order/components/my-active-orders-list'
import { AvailableOrdersList } from '@/features/motorizado/available-orders/components/available-orders-list'

type Tab = 'available' | 'active'

/**
 * Segmented control de la home del motorizado. Dos vistas principales:
 *  - "Disponibles" — bandeja de pedidos para aceptar (tier pending + overdue,
 *    sección colapsable de upcoming).
 *  - "Mis pedidos (N)" — pedidos ya aceptados que están en progreso.
 *
 * La decisión de tabs internas (vs. agregar 5ta pestaña al bottom nav) se tomó
 * porque (a) mantiene la bottom nav usable con guantes — RNF-D-004; (b) el
 * driver aterriza siempre en la vista donde tiene trabajo; (c) satisface
 * HU-D-026 sin duplicar navegación.
 */
export function HomeTabs() {
  // Montar el realtime sync de driver/orders UNA SOLA VEZ aquí; múltiples
  // componentes leen los datos vía useDriverActiveOrders (TanStack cache).
  useDriverActiveOrdersRealtime()
  const { activeCount } = useDriverCapacity()
  const [tab, setTab] = useState<Tab>('available')

  // Al entrar con pedidos activos, default a "Mis pedidos" — el driver está
  // mitad-en-turno y lo que le interesa es continuar su cola. Solo aplica al
  // primer render; el usuario puede cambiar después sin que lo resetee.
  const [initialized, setInitialized] = useState(false)
  useEffect(() => {
    if (initialized) return
    if (activeCount > 0) setTab('active')
    setInitialized(true)
  }, [activeCount, initialized])

  return (
    <div className="space-y-5">
      <div
        role="tablist"
        aria-label="Vista de pedidos"
        className="relative flex items-center gap-1 p-1 rounded-[18px]"
        style={{
          background: 'rgba(255, 255, 255, 0.7)',
          border: '1px solid rgba(225, 191, 181, 0.25)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <TabButton
          active={tab === 'available'}
          onClick={() => setTab('available')}
          label="Disponibles"
        />
        <TabButton
          active={tab === 'active'}
          onClick={() => setTab('active')}
          label="Mis pedidos"
          badge={activeCount > 0 ? activeCount : undefined}
        />
      </div>

      <div role="tabpanel">
        {tab === 'available' ? <AvailableOrdersList /> : <MyActiveOrdersList />}
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  label,
  badge,
}: {
  active: boolean
  onClick: () => void
  label: string
  badge?: number
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'flex-1 relative flex items-center justify-center gap-2 rounded-[14px] py-2.5 text-sm font-bold',
        'transition-all duration-200 active:scale-[0.97]',
      )}
      style={
        active
          ? {
              background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%)',
              color: '#ffffff',
              boxShadow: '0 8px 18px -4px rgba(255, 107, 53, 0.35)',
            }
          : {
              color: '#71717a',
            }
      }
    >
      <span>{label}</span>
      {badge !== undefined && (
        <span
          aria-label={`${badge} activos`}
          className="inline-flex items-center justify-center font-black text-[10px] font-mono tabular-nums"
          style={{
            minWidth: '20px',
            height: '20px',
            padding: '0 6px',
            borderRadius: '999px',
            background: active ? 'rgba(255, 255, 255, 0.28)' : 'rgba(255, 107, 53, 0.15)',
            color: active ? '#ffffff' : '#AB3500',
          }}
        >
          {badge}
        </span>
      )}
    </button>
  )
}
