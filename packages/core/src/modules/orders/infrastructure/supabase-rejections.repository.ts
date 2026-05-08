import type { ServerClient } from '@tindivo/supabase'
import { PersistenceError } from '../../../shared/errors/domain-error'
import type { RejectionsRepository } from '../application/ports/rejections.repository'

export class SupabaseRejectionsRepository implements RejectionsRepository {
  constructor(private readonly sb: ServerClient) {}

  async recordRejection(
    orderId: string,
    driverId: string,
    reason: string,
    rejectedAt: Date,
  ): Promise<void> {
    // Idempotente vía PK compuesta (order_id, driver_id). Si por alguna razón
    // llegan dos rechazos del mismo driver, el upsert mantiene el primero
    // y refresca la razón. Útil para tolerar reintentos del cliente.
    const { error } = await this.sb.from('order_assignment_rejections').upsert(
      {
        order_id: orderId,
        driver_id: driverId,
        reason,
        rejected_at: rejectedAt.toISOString(),
      },
      { onConflict: 'order_id,driver_id', ignoreDuplicates: false },
    )
    if (error) throw new PersistenceError(error.message, error)
  }

  async findRejectedDriverIds(orderId: string): Promise<string[]> {
    const { data, error } = await this.sb
      .from('order_assignment_rejections')
      .select('driver_id')
      .eq('order_id', orderId)
    if (error) throw new PersistenceError(error.message, error)
    return (data ?? []).map((r) => r.driver_id)
  }
}
