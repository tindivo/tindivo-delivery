import type { ServerClient } from '@tindivo/supabase'
import { PersistenceError } from '../../../shared/errors/domain-error'
import type {
  CreatePendingInput,
  TransferRequest,
  TransferRequestStatus,
  TransferRequestsRepository,
} from '../application/ports/transfer-requests.repository'

type Row = {
  id: string
  order_id: string
  from_driver_id: string
  to_driver_id: string
  status: TransferRequestStatus
  created_at: string
  expires_at: string
  resolved_at: string | null
}

function toDomain(row: Row): TransferRequest {
  return {
    id: row.id,
    orderId: row.order_id,
    fromDriverId: row.from_driver_id,
    toDriverId: row.to_driver_id,
    status: row.status,
    createdAt: new Date(row.created_at),
    expiresAt: new Date(row.expires_at),
    resolvedAt: row.resolved_at ? new Date(row.resolved_at) : null,
  }
}

export class SupabaseTransferRequestsRepository implements TransferRequestsRepository {
  constructor(private readonly sb: ServerClient) {}

  async createPending(input: CreatePendingInput): Promise<TransferRequest> {
    // El UNIQUE INDEX `uniq_order_transfer_requests_pending` evita duplicados
    // de pending para el mismo (order, requester). Si choca, leemos la existente
    // y la devolvemos (idempotente desde la perspectiva del use case).
    const insert = await this.sb
      .from('order_transfer_requests')
      .insert({
        order_id: input.orderId,
        from_driver_id: input.fromDriverId,
        to_driver_id: input.toDriverId,
      })
      .select('*')
      .maybeSingle()

    if (insert.error) {
      // 23505 = unique_violation. Devolvemos la pending existente.
      if (insert.error.code === '23505') {
        const existing = await this.sb
          .from('order_transfer_requests')
          .select('*')
          .eq('order_id', input.orderId)
          .eq('to_driver_id', input.toDriverId)
          .eq('status', 'pending')
          .maybeSingle()
        if (existing.error) throw new PersistenceError(existing.error.message, existing.error)
        if (!existing.data)
          throw new PersistenceError(
            'createPending: unique violation pero la fila pending no aparece',
            insert.error,
          )
        return toDomain(existing.data as Row)
      }
      throw new PersistenceError(insert.error.message, insert.error)
    }

    if (!insert.data)
      throw new PersistenceError('createPending: insert no devolvió fila', insert.error)
    return toDomain(insert.data as Row)
  }

  async findById(id: string): Promise<TransferRequest | null> {
    const { data, error } = await this.sb
      .from('order_transfer_requests')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new PersistenceError(error.message, error)
    return data ? toDomain(data as Row) : null
  }

  async findPendingForOwner(driverId: string): Promise<TransferRequest[]> {
    const { data, error } = await this.sb
      .from('order_transfer_requests')
      .select('*')
      .eq('from_driver_id', driverId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true })
    if (error) throw new PersistenceError(error.message, error)
    return (data ?? []).map((r) => toDomain(r as Row))
  }

  async findPendingByRequester(driverId: string): Promise<TransferRequest[]> {
    const { data, error } = await this.sb
      .from('order_transfer_requests')
      .select('*')
      .eq('to_driver_id', driverId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true })
    if (error) throw new PersistenceError(error.message, error)
    return (data ?? []).map((r) => toDomain(r as Row))
  }

  async findExpiredPending(now: Date, limit = 50): Promise<TransferRequest[]> {
    const { data, error } = await this.sb
      .from('order_transfer_requests')
      .select('*')
      .eq('status', 'pending')
      .lt('expires_at', now.toISOString())
      .order('expires_at', { ascending: true })
      .limit(limit)
    if (error) throw new PersistenceError(error.message, error)
    return (data ?? []).map((r) => toDomain(r as Row))
  }

  async markAccepted(id: string, now: Date): Promise<void> {
    const { error } = await this.sb
      .from('order_transfer_requests')
      .update({ status: 'accepted', resolved_at: now.toISOString() })
      .eq('id', id)
      .eq('status', 'pending')
    if (error) throw new PersistenceError(error.message, error)
  }

  async markRejected(id: string, now: Date): Promise<void> {
    const { error } = await this.sb
      .from('order_transfer_requests')
      .update({ status: 'rejected', resolved_at: now.toISOString() })
      .eq('id', id)
      .eq('status', 'pending')
    if (error) throw new PersistenceError(error.message, error)
  }

  async markExpired(id: string, now: Date): Promise<void> {
    const { error } = await this.sb
      .from('order_transfer_requests')
      .update({ status: 'expired', resolved_at: now.toISOString() })
      .eq('id', id)
      .eq('status', 'pending')
    if (error) throw new PersistenceError(error.message, error)
  }

  async invalidateOtherPendingForOrder(
    orderId: string,
    exceptId: string,
    now: Date,
  ): Promise<void> {
    const { error } = await this.sb
      .from('order_transfer_requests')
      .update({ status: 'rejected', resolved_at: now.toISOString() })
      .eq('order_id', orderId)
      .eq('status', 'pending')
      .neq('id', exceptId)
    if (error) throw new PersistenceError(error.message, error)
  }
}
