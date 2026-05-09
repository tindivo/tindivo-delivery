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

    const excluded = new Set(query.excludedDriverIds ?? [])
    const assignedDriverIds = (assignedRows ?? [])
      .map((r) => r.driver_id)
      .filter((id) => !excluded.has(id))
    if (assignedDriverIds.length === 0) return []

    const { data: drivers, error: driversError } = await this.sb
      .from('drivers')
      .select(
        'id, operating_days, shift_start, shift_end, driver_availability(is_available, shift_started_at)',
      )
      .eq('is_active', true)
      .in('id', assignedDriverIds)
    if (driversError) throw new PersistenceError(driversError.message, driversError)

    const eligibleDrivers = (drivers ?? [])
      .map((driver) => {
        const availability = Array.isArray(driver.driver_availability)
          ? driver.driver_availability[0]
          : driver.driver_availability
        return {
          driver,
          availability,
        }
      })
      // El toggle `is_available` manda. shift_start/shift_end/operating_days
      // sirven solo como guía para `auto_close_drivers_on_schedule_end`
      // (cierra disponibilidad cuando termina el shift) — no como bloqueo
      // estricto en candidatura. Si un driver enciende manual fuera de su
      // shift, sigue siendo elegible.
      .filter(({ availability }) => availability?.is_available === true)
      .map(({ driver, availability }) => ({
        driverId: driver.id,
        operatingDays: driver.operating_days ?? [],
        shiftStart: driver.shift_start,
        shiftEnd: driver.shift_end,
        shiftStartedAt: availability?.shift_started_at
          ? new Date(availability.shift_started_at)
          : null,
      }))

    if (eligibleDrivers.length === 0) return []

    const driverIds = eligibleDrivers.map((d) => d.driverId)
    const { data: orders, error: ordersError } = await this.sb
      .from('orders')
      .select('driver_id, status, delivered_at, restaurant_id, estimated_ready_at, occupancy_slots')
      .in('driver_id', driverIds)
      .gte('created_at', query.todayStart.toISOString())
    if (ordersError) throw new PersistenceError(ordersError.message, ordersError)

    // Rechazos del día por driver — penaliza R4 para self-correcting.
    // Sin esto, un driver que rechaza N pedidos seguidos sigue siendo "least
    // loaded" y se le re-asigna en loop. Verificado en BD: driver Jesús
    // rechazó 7 pedidos (4 backpack_full + 2 too_far + 1 not_convenient) pero
    // seguía recibiendo asignaciones por R4 (no se contaban en su carga).
    const { data: rejections, error: rejectionsError } = await this.sb
      .from('order_assignment_rejections')
      .select('driver_id')
      .in('driver_id', driverIds)
      .gte('rejected_at', query.todayStart.toISOString())
    if (rejectionsError) throw new PersistenceError(rejectionsError.message, rejectionsError)

    const rejectedTodayByDriver = new Map<string, number>()
    for (const r of rejections ?? []) {
      rejectedTodayByDriver.set(r.driver_id, (rejectedTodayByDriver.get(r.driver_id) ?? 0) + 1)
    }

    const stats = new Map<
      string,
      {
        deliveredToday: number
        activeCount: number
        reservedCount: number
        // Suma de occupancy_slots de pedidos activos. R3 (cap mochila) usa
        // este número, no el count, para soportar pedidos grandes (slots>1)
        // que ocupan más espacio físico aunque sean una fila.
        activeSlots: number
        reservedSlots: number
        cancelledTodayCount: number
        sameRestaurantWindowCount: number
        // Set de restaurant_ids con pedidos activos o reservados en la mochila.
        // Usado para R2 (cap de restaurantes distintos) — sólo cuentan pedidos
        // que el driver "está moviendo", no entregados ni cancelados.
        bag: Set<string>
      }
    >()
    for (const id of driverIds) {
      stats.set(id, {
        deliveredToday: 0,
        activeCount: 0,
        reservedCount: 0,
        activeSlots: 0,
        reservedSlots: 0,
        cancelledTodayCount: 0,
        sameRestaurantWindowCount: 0,
        bag: new Set<string>(),
      })
    }

    const windowMs = query.groupingWindowMinutes * 60_000
    for (const order of orders ?? []) {
      if (!order.driver_id) continue
      const s = stats.get(order.driver_id)
      if (!s) continue

      // Pedidos con default 1 (DB: NOT NULL DEFAULT 1) — el `?? 1` es por
      // si el cliente Supabase elimina el campo en algún select parcial.
      const slots = order.occupancy_slots ?? 1

      if (order.status === 'delivered' && order.delivered_at) {
        s.deliveredToday++
      } else if ((ACTIVE_STATUSES as readonly string[]).includes(order.status)) {
        s.activeCount++
        s.activeSlots += slots
        s.bag.add(order.restaurant_id)
      } else if (order.status === RESERVED_STATUS) {
        s.reservedCount++
        s.reservedSlots += slots
        s.bag.add(order.restaurant_id)
      } else if (order.status === 'cancelled') {
        s.cancelledTodayCount++
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

    return eligibleDrivers.map((driver) => {
      const s = stats.get(driver.driverId)
      return {
        ...driver,
        deliveredToday: s?.deliveredToday ?? 0,
        activeCount: s?.activeCount ?? 0,
        reservedCount: s?.reservedCount ?? 0,
        activeSlots: s?.activeSlots ?? 0,
        reservedSlots: s?.reservedSlots ?? 0,
        cancelledTodayCount: s?.cancelledTodayCount ?? 0,
        rejectedTodayCount: rejectedTodayByDriver.get(driver.driverId) ?? 0,
        sameRestaurantWindowCount: s?.sameRestaurantWindowCount ?? 0,
        distinctRestaurantsInBag: s ? Array.from(s.bag) : [],
      }
    })
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
