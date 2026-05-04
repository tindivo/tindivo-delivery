import type { ServerClient } from '@tindivo/supabase'
import { PersistenceError } from '../../../shared/errors/domain-error'
import type {
  AssignmentCandidateQuery,
  DriverAssignmentCandidate,
  OrderRepository,
} from '../application/ports/order.repository'
import type { Order } from '../domain/entities/order'
import { RaceCondition } from '../domain/errors/order-errors'
import type { DriverId } from '../domain/value-objects/driver-id'
import type { OrderId } from '../domain/value-objects/order-id'
import type { OrderStatus } from '../domain/value-objects/order-status'
import type { RestaurantId } from '../domain/value-objects/restaurant-id'
import { OrderMapper } from './order.mapper'

const ACTIVE_STATUSES = ['heading_to_restaurant', 'waiting_at_restaurant', 'picked_up'] as const
const RESERVED_STATUS = 'waiting_driver'

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

  async saveAutoAssignment(order: Order, expected: OrderStatus): Promise<void> {
    const row = OrderMapper.toUpdateRow(order)
    const { error, count } = await this.sb
      .from('orders')
      .update(row, { count: 'exact' })
      .eq('id', order.id.value)
      .eq('status', expected.value)
      .is('driver_id', null)
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

  async findAssignmentCandidates(
    query: AssignmentCandidateQuery,
  ): Promise<DriverAssignmentCandidate[]> {
    // Filtrar drivers por restaurante asignado: solo los que tengan una fila
    // en driver_restaurants apuntando a query.restaurantId pueden ser
    // candidatos. Si la tabla está vacía (instalación nueva) o el restaurant
    // no tiene drivers asignados, no habrá candidatos — el admin debe
    // explicitamente asignar la flota desde /admin/drivers/[id].
    const { data: assignedRows, error: assignedError } = await this.sb
      .from('driver_restaurants')
      .select('driver_id')
      .eq('restaurant_id', query.restaurantId)
    if (assignedError) throw new PersistenceError(assignedError.message, assignedError)

    const assignedDriverIds = (assignedRows ?? []).map((r) => r.driver_id)
    if (assignedDriverIds.length === 0) return []

    const { data: drivers, error: driversError } = await this.sb
      .from('drivers')
      .select('id, operating_days, shift_start, shift_end, driver_availability(is_available)')
      .eq('is_active', true)
      .in('id', assignedDriverIds)
    if (driversError) throw new PersistenceError(driversError.message, driversError)

    const eligibleDrivers = (drivers ?? [])
      .filter((driver) => {
        const availability = Array.isArray(driver.driver_availability)
          ? driver.driver_availability[0]
          : driver.driver_availability
        return (
          availability?.is_available === true &&
          isWithinDriverShift(
            driver.operating_days ?? [],
            driver.shift_start,
            driver.shift_end,
            query.now,
          )
        )
      })
      .map((driver) => ({
        driverId: driver.id,
        operatingDays: driver.operating_days ?? [],
        shiftStart: driver.shift_start,
        shiftEnd: driver.shift_end,
      }))

    if (eligibleDrivers.length === 0) return []

    const driverIds = eligibleDrivers.map((d) => d.driverId)
    const { data: orders, error: ordersError } = await this.sb
      .from('orders')
      .select('driver_id, status, delivered_at, restaurant_id, estimated_ready_at')
      .in('driver_id', driverIds)
      .gte('created_at', query.todayStart.toISOString())
    if (ordersError) throw new PersistenceError(ordersError.message, ordersError)

    const stats = new Map<
      string,
      {
        deliveredToday: number
        activeCount: number
        reservedCount: number
        sameRestaurantWindowCount: number
      }
    >()
    for (const id of driverIds) {
      stats.set(id, {
        deliveredToday: 0,
        activeCount: 0,
        reservedCount: 0,
        sameRestaurantWindowCount: 0,
      })
    }

    const windowMs = query.windowMinutes * 60_000
    for (const order of orders ?? []) {
      if (!order.driver_id) continue
      const s = stats.get(order.driver_id)
      if (!s) continue

      if (order.status === 'delivered' && order.delivered_at) {
        s.deliveredToday++
      } else if ((ACTIVE_STATUSES as readonly string[]).includes(order.status)) {
        s.activeCount++
      } else if (order.status === RESERVED_STATUS) {
        s.reservedCount++
      }

      const readyDelta = Math.abs(
        new Date(order.estimated_ready_at).getTime() - query.estimatedReadyAt.getTime(),
      )
      if (
        order.restaurant_id === query.restaurantId &&
        order.status !== 'delivered' &&
        order.status !== 'cancelled' &&
        readyDelta <= windowMs
      ) {
        s.sameRestaurantWindowCount++
      }
    }

    return eligibleDrivers
      .map((driver) => {
        const s = stats.get(driver.driverId)
        return {
          ...driver,
          deliveredToday: s?.deliveredToday ?? 0,
          activeCount: s?.activeCount ?? 0,
          reservedCount: s?.reservedCount ?? 0,
          sameRestaurantWindowCount: s?.sameRestaurantWindowCount ?? 0,
        }
      })
      .filter((driver) => driver.activeCount + driver.reservedCount < query.maxAssignedAndActive)
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

function isWithinDriverShift(
  operatingDays: readonly string[],
  shiftStart: string,
  shiftEnd: string,
  now: Date,
): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Lima',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now)
  const weekday = parts.find((p) => p.type === 'weekday')?.value.toLowerCase() ?? ''
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '00'
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00'
  const day = WEEKDAY_TO_CODE[weekday]
  if (!day || !operatingDays.includes(day)) return false

  const current = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
  const start = shiftStart.slice(0, 5)
  const end = shiftEnd.slice(0, 5)
  if (start <= end) return current >= start && current <= end
  return current >= start || current <= end
}

const WEEKDAY_TO_CODE: Record<string, string> = {
  sun: 'sun',
  mon: 'mon',
  tue: 'tue',
  wed: 'wed',
  thu: 'thu',
  fri: 'fri',
  sat: 'sat',
}
