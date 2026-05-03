import type { Order } from '../../domain/entities/order'
import type { DriverId } from '../../domain/value-objects/driver-id'
import type { OrderId } from '../../domain/value-objects/order-id'
import type { OrderStatus } from '../../domain/value-objects/order-status'
import type { RestaurantId } from '../../domain/value-objects/restaurant-id'

export type DriverAssignmentCandidate = {
  driverId: string
  deliveredToday: number
  activeCount: number
  reservedCount: number
  sameRestaurantWindowCount: number
  operatingDays: string[]
  shiftStart: string
  shiftEnd: string
}

export type AssignmentCandidateQuery = {
  restaurantId: string
  estimatedReadyAt: Date
  now: Date
  todayStart: Date
  windowMinutes: number
  maxAssignedAndActive: number
}

export interface OrderRepository {
  findById(id: OrderId): Promise<Order | null>

  /**
   * Persiste cambios. Usa optimistic concurrency (expectedStatus).
   * Si el status en DB no coincide con expectedStatus, lanza RaceCondition.
   */
  save(order: Order, expectedStatus: OrderStatus): Promise<void>

  /**
   * Persiste una asignación automática. Exige que el pedido siga sin driver
   * para no pisar otra asignación concurrente.
   */
  saveAutoAssignment(order: Order, expectedStatus: OrderStatus): Promise<void>

  /**
   * Inserta pedido nuevo (sin optimistic lock).
   */
  insert(order: Order): Promise<void>

  /**
   * Cuenta pedidos activos del driver (para driver capacity policy).
   */
  countActiveByDriver(driverId: DriverId): Promise<number>

  findAssignmentCandidates(query: AssignmentCandidateQuery): Promise<DriverAssignmentCandidate[]>

  findAvailable(nowIso: string): Promise<Order[]>
  findByRestaurant(restaurantId: RestaurantId, statuses?: OrderStatus[]): Promise<Order[]>
  findByDriver(driverId: DriverId, statuses?: OrderStatus[]): Promise<Order[]>
}
