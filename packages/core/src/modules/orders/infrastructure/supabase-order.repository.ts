import type { ServerClient } from '@tindivo/supabase'
import { PersistenceError } from '../../../shared/errors/domain-error'
import type { OrderRepository } from '../application/ports/order.repository'
import type { Order } from '../domain/entities/order'
import { RaceCondition } from '../domain/errors/order-errors'
import type { DriverId } from '../domain/value-objects/driver-id'
import type { OrderId } from '../domain/value-objects/order-id'
import type { OrderStatus } from '../domain/value-objects/order-status'
import type { RestaurantId } from '../domain/value-objects/restaurant-id'
import { OrderMapper } from './order.mapper'

const ACTIVE_STATUSES = ['heading_to_restaurant', 'waiting_at_restaurant', 'picked_up'] as const

export class SupabaseOrderRepository implements OrderRepository {
  constructor(private readonly sb: ServerClient) {}

  async findById(id: OrderId): Promise<Order | null> {
    const { data, error } = await this.sb
      .from('orders')
      .select('*')
      .eq('id', id.value)
      .maybeSingle()
    if (error) throw new PersistenceError(error.message, error)
    return data ? OrderMapper.toDomain(data) : null
  }

  async insert(order: Order): Promise<void> {
    const row = OrderMapper.toInsertRow(order)
    const { error } = await this.sb.from('orders').insert(row)
    if (error) throw new PersistenceError(error.message, error)
  }

  async save(order: Order, expected: OrderStatus): Promise<void> {
    const row = OrderMapper.toUpdateRow(order)
    const { error, count } = await this.sb
      .from('orders')
      .update(row, { count: 'exact' })
      .eq('id', order.id.value)
      .eq('status', expected.value)
    if (error) throw new PersistenceError(error.message, error)
    if ((count ?? 0) === 0) throw new RaceCondition(order.id.value)
  }

  async countActiveByDriver(driverId: DriverId): Promise<number> {
    const { count, error } = await this.sb
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('driver_id', driverId.value)
      .in('status', [...ACTIVE_STATUSES])
    if (error) throw new PersistenceError(error.message, error)
    return count ?? 0
  }

  async findAvailable(nowIso: string): Promise<Order[]> {
    const { data, error } = await this.sb
      .from('orders')
      .select('*')
      .eq('status', 'waiting_driver')
      .lte('appears_in_queue_at', nowIso)
      .order('appears_in_queue_at', { ascending: true })
    if (error) throw new PersistenceError(error.message, error)
    return (data ?? []).map(OrderMapper.toDomain)
  }

  async findByRestaurant(restaurantId: RestaurantId, statuses?: OrderStatus[]): Promise<Order[]> {
    let q = this.sb
      .from('orders')
      .select('*')
      .eq('restaurant_id', restaurantId.value)
      .order('created_at', { ascending: false })
    if (statuses && statuses.length > 0) {
      q = q.in(
        'status',
        statuses.map((s) => s.value),
      )
    }
    const { data, error } = await q
    if (error) throw new PersistenceError(error.message, error)
    return (data ?? []).map(OrderMapper.toDomain)
  }

  async findByDriver(driverId: DriverId, statuses?: OrderStatus[]): Promise<Order[]> {
    let q = this.sb
      .from('orders')
      .select('*')
      .eq('driver_id', driverId.value)
      .order('created_at', { ascending: false })
    if (statuses && statuses.length > 0) {
      q = q.in(
        'status',
        statuses.map((s) => s.value),
      )
    }
    const { data, error } = await q
    if (error) throw new PersistenceError(error.message, error)
    return (data ?? []).map(OrderMapper.toDomain)
  }
}
