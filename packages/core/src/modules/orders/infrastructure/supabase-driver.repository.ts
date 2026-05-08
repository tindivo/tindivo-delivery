import type { ServerClient } from '@tindivo/supabase'
import { PersistenceError } from '../../../shared/errors/domain-error'
import type {
  DriverRepository,
  EligiblePeer,
  EligiblePeerQuery,
  SinglePeerQuery,
} from '../application/ports/driver.repository'

const ACTIVE_STATUSES = ['heading_to_restaurant', 'waiting_at_restaurant', 'picked_up'] as const
const RESERVED_STATUS = 'waiting_driver'

/**
 * Lee compañeros del mismo restaurante con espacio en mochila para
 * transferencia de pedido. Reusa el patrón de
 * `SupabaseOrderRepository.findAssignmentCandidates` pero NO aplica las
 * reglas R1/R2/R4 de asignación automática — solo filtra elegibilidad básica
 * (asignado al restaurante, activo, disponible) y devuelve stats de mochila
 * para que el use case valide el cap.
 */
export class SupabaseDriverRepository implements DriverRepository {
  constructor(private readonly sb: ServerClient) {}

  async findEligiblePeers(query: EligiblePeerQuery): Promise<EligiblePeer[]> {
    const { data: assignedRows, error: assignedError } = await this.sb
      .from('driver_restaurants')
      .select('driver_id')
      .eq('restaurant_id', query.restaurantId)
    if (assignedError) throw new PersistenceError(assignedError.message, assignedError)

    const assignedIds = (assignedRows ?? [])
      .map((r) => r.driver_id)
      .filter((id) => id !== query.excludeDriverId)
    if (assignedIds.length === 0) return []

    const { data: drivers, error: driversError } = await this.sb
      .from('drivers')
      .select('id, full_name, vehicle_type, driver_availability(is_available)')
      .eq('is_active', true)
      .in('id', assignedIds)
    if (driversError) throw new PersistenceError(driversError.message, driversError)

    const eligibleDrivers = (drivers ?? [])
      .map((driver) => {
        const availability = Array.isArray(driver.driver_availability)
          ? driver.driver_availability[0]
          : driver.driver_availability
        return { driver, isAvailable: availability?.is_available === true }
      })
      .filter(({ isAvailable }) => isAvailable)
      .map(({ driver }) => ({
        driverId: driver.id,
        fullName: driver.full_name,
        vehicleType: driver.vehicle_type,
      }))

    if (eligibleDrivers.length === 0) return []

    const stats = await this.loadSlotsStats(
      eligibleDrivers.map((d) => d.driverId),
      query.todayStart,
    )

    return eligibleDrivers.map((d) => ({
      ...d,
      activeSlots: stats.get(d.driverId)?.activeSlots ?? 0,
      reservedSlots: stats.get(d.driverId)?.reservedSlots ?? 0,
    }))
  }

  async findEligiblePeer(query: SinglePeerQuery): Promise<EligiblePeer | null> {
    const { data: link, error: linkError } = await this.sb
      .from('driver_restaurants')
      .select('driver_id')
      .eq('restaurant_id', query.restaurantId)
      .eq('driver_id', query.driverId)
      .maybeSingle()
    if (linkError) throw new PersistenceError(linkError.message, linkError)
    if (!link) return null

    const { data: driver, error: driverError } = await this.sb
      .from('drivers')
      .select('id, full_name, vehicle_type, driver_availability(is_available)')
      .eq('is_active', true)
      .eq('id', query.driverId)
      .maybeSingle()
    if (driverError) throw new PersistenceError(driverError.message, driverError)
    if (!driver) return null

    const availability = Array.isArray(driver.driver_availability)
      ? driver.driver_availability[0]
      : driver.driver_availability
    if (availability?.is_available !== true) return null

    const stats = await this.loadSlotsStats([driver.id], startOfToday())
    const s = stats.get(driver.id)

    return {
      driverId: driver.id,
      fullName: driver.full_name,
      vehicleType: driver.vehicle_type,
      activeSlots: s?.activeSlots ?? 0,
      reservedSlots: s?.reservedSlots ?? 0,
    }
  }

  /**
   * Suma occupancy_slots por driver entre los pedidos creados desde
   * `todayStart`. Activos = heading/waiting/picked_up; reservados =
   * waiting_driver con driver_id asignado.
   */
  private async loadSlotsStats(
    driverIds: string[],
    todayStart: Date,
  ): Promise<Map<string, { activeSlots: number; reservedSlots: number }>> {
    const stats = new Map<string, { activeSlots: number; reservedSlots: number }>()
    for (const id of driverIds) stats.set(id, { activeSlots: 0, reservedSlots: 0 })
    if (driverIds.length === 0) return stats

    const { data: orders, error } = await this.sb
      .from('orders')
      .select('driver_id, status, occupancy_slots')
      .in('driver_id', driverIds)
      .gte('created_at', todayStart.toISOString())
    if (error) throw new PersistenceError(error.message, error)

    for (const o of orders ?? []) {
      if (!o.driver_id) continue
      const s = stats.get(o.driver_id)
      if (!s) continue
      const slots = o.occupancy_slots ?? 1
      if ((ACTIVE_STATUSES as readonly string[]).includes(o.status)) {
        s.activeSlots += slots
      } else if (o.status === RESERVED_STATUS) {
        s.reservedSlots += slots
      }
    }
    return stats
  }
}

function startOfToday(): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '01'
  return new Date(`${get('year')}-${get('month')}-${get('day')}T00:00:00-05:00`)
}
