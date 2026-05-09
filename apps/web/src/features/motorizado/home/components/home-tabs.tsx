'use client'
import { MyActiveOrdersList } from '@/features/motorizado/active-order/components/my-active-orders-list'
import { useDriverActiveOrdersRealtime } from '@/features/motorizado/active-order/hooks/use-driver-active-orders'
import { useDriverCapacity } from '@/features/motorizado/active-order/hooks/use-driver-capacity'
import { AvailableOrdersList } from '@/features/motorizado/available-orders/components/available-orders-list'
import { TeamTab } from '@/features/motorizado/team/components/team-tab'
import { useReceivedTransferRequests } from '@/features/motorizado/team/hooks/use-received-transfer-requests'
import { cn } from '@tindivo/ui'
import { useEffect, useState } from 'react'

type Tab = 'available' | 'active' | 'team'

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
  // Solicitudes pendientes RECIBIDAS — alimenta el badge del tab Equipo y
  // el default-priority si hay alguna esperando respuesta.
  const receivedRequestsQuery = useReceivedTransferRequests()
  const receivedRequestsCount = receivedRequestsQuery.data?.items?.length ?? 0
  const [tab, setTab] = useState<Tab>('active')

  // Default tab al primer render según prioridad:
  //  1. Hay solicitudes recibidas pending → 'team' (tiene 30s para responder)
  //  2. Tiene pedidos activos → 'active'
  //  3. Sino → 'available' (cola fría)
  const [initialized, setInitialized] = useState(false)
  useEffect(() => {
    if (initialized) return
    if (receivedRequestsCount > 0) setTab('team')
    else if (activeCount > 0) setTab('active')
    else setTab('available')
    setInitialized(true)
  }, [activeCount, receivedRequestsCount, initialized])

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
          active={tab === 'active'}
          onClick={() => setTab('active')}
          label="Mis pedidos"
          badge={activeCount > 0 ? activeCount : undefined}
        />
        <TabButton
          active={tab === 'available'}
          onClick={() => setTab('available')}
          label="En espera"
        />
        <TabButton
          active={tab === 'team'}
          onClick={() => setTab('team')}
          label="Equipo"
          badge={receivedRequestsCount > 0 ? receivedRequestsCount : undefined}
          urgentBadge={receivedRequestsCount > 0}
        />
      </div>

      <div role="tabpanel">
        {tab === 'available' ? (
          <AvailableOrdersList />
        ) : tab === 'active' ? (
          <MyActiveOrdersList />
        ) : (
          <TeamTab />
        )}
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  label,
  badge,
  urgentBadge,
}: {
  active: boolean
  onClick: () => void
  label: string
  badge?: number
  /** Si true, el badge se renderiza rojo (alerta urgente) en vez de naranja. */
  urgentBadge?: boolean
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
              background: 'linear-gradient(135deg, #F26241 0%, #FF9B63 100%)',
              color: '#ffffff',
              boxShadow: '0 8px 18px -4px rgba(242, 98, 65, 0.3)',
            }
          : {
              color: '#71717a',
            }
      }
    >
      <span>{label}</span>
      {badge !== undefined && (
        <span
          aria-label={`${badge} ${urgentBadge ? 'solicitudes' : 'activos'}`}
          className={cn(
            'inline-flex items-center justify-center font-black text-[10px] font-mono tabular-nums',
            urgentBadge && !active && 'animate-pulse',
          )}
          style={{
            minWidth: '20px',
            height: '20px',
            padding: '0 6px',
            borderRadius: '999px',
            background: active
              ? 'rgba(255, 255, 255, 0.28)'
              : urgentBadge
                ? 'linear-gradient(135deg, #991B1B 0%, #BA1A1A 100%)'
                : 'rgba(242, 98, 65, 0.14)',
            color: active ? '#ffffff' : urgentBadge ? '#ffffff' : '#B43C1F',
            boxShadow: urgentBadge && !active ? '0 4px 12px rgba(186, 26, 26, 0.35)' : undefined,
          }}
        >
          {badge}
        </span>
      )}
    </button>
  )
}
