'use client'
import { useReceivedTransferRequests } from '../hooks/use-received-transfer-requests'
import { ReceivedRequestsBanner } from './received-requests-banner'
import { TeamOrdersList } from './team-orders-list'

/**
 * Wrapper de la pestaña "Equipo" del motorizado. Combina:
 *  - Banner sticky con solicitudes RECIBIDAS pending (otros me piden pedidos)
 *  - Lista de pedidos activos de OTROS drivers en mis restaurantes
 */
export function TeamTab() {
  const requestsQuery = useReceivedTransferRequests()
  // biome-ignore lint/suspicious/noExplicitAny: payload snake_case
  const requests = (requestsQuery.data?.items ?? []) as any[]

  return (
    <div className="space-y-3">
      <ReceivedRequestsBanner items={requests} />
      <TeamOrdersList />
    </div>
  )
}
