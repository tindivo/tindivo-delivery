/**
 * Port para gestionar solicitudes de transferencia entre motorizados.
 * Tabla `order_transfer_requests` con TTL 30s en pending.
 *
 * El driver B (solicitante) crea una pending. El driver A (dueño actual)
 * tiene 30s para markAccepted o markRejected. Si no responde, el cron la
 * marca como expired (no se llama desde aquí — es backstop SQL puro).
 */

export type TransferRequestStatus = 'pending' | 'accepted' | 'rejected' | 'expired'

export type TransferRequest = {
  id: string
  orderId: string
  /** Dueño actual del pedido (al que se le solicita) */
  fromDriverId: string
  /** Solicitante (el que quiere el pedido) */
  toDriverId: string
  status: TransferRequestStatus
  createdAt: Date
  expiresAt: Date
  resolvedAt: Date | null
}

export type CreatePendingInput = {
  orderId: string
  fromDriverId: string
  toDriverId: string
}

export interface TransferRequestsRepository {
  /**
   * Crea una solicitud pending. UPSERT idempotente por UNIQUE constraint
   * `(order_id, to_driver_id) WHERE status='pending'`: si ya hay pending
   * del mismo solicitante para el mismo pedido, devuelve la existente.
   */
  createPending(input: CreatePendingInput): Promise<TransferRequest>

  findById(id: string): Promise<TransferRequest | null>

  /** Solicitudes pendientes RECIBIDAS por el driver (es el dueño from). */
  findPendingForOwner(driverId: string): Promise<TransferRequest[]>

  /** Solicitudes pendientes ENVIADAS por el driver (es el solicitante to). */
  findPendingByRequester(driverId: string): Promise<TransferRequest[]>

  markAccepted(id: string, now: Date): Promise<void>
  markRejected(id: string, now: Date): Promise<void>

  /**
   * Cuando una solicitud se acepta, las OTRAS pending del mismo pedido
   * dejan de ser válidas (ya hay nuevo dueño). Las marca como `rejected`
   * con `resolved_at = now`. Idempotente.
   */
  invalidateOtherPendingForOrder(orderId: string, exceptId: string, now: Date): Promise<void>
}
