import type { Order } from '../../domain/entities/order'
import type { DriverAssignmentCandidate } from '../../domain/policies/driver-assignment.policy'
import type { DriverId } from '../../domain/value-objects/driver-id'
import type { OrderId } from '../../domain/value-objects/order-id'
import type { OrderStatus } from '../../domain/value-objects/order-status'
import type { RestaurantId } from '../../domain/value-objects/restaurant-id'

// Reexport para que callers que importan `DriverAssignmentCandidate` desde
// el port no necesiten cambiar imports tras unificar el tipo en la policy.
export type { DriverAssignmentCandidate }

export type AssignmentCandidateQuery = {
  restaurantId: string
  estimatedReadyAt: Date
  now: Date
  todayStart: Date
  /** Ventana de agrupación de R1 (de las assignment_rules). */
  groupingWindowMinutes: number
  /**
   * Lista de driver_ids excluidos de la candidatura (porque rechazaron este
   * pedido específico via `order_assignment_rejections`). El cron re-asignará
   * sin reconsiderarlos para el mismo orderId.
   */
  excludedDriverIds?: string[]
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

  /**
   * UPDATE atómico que reclama un pedido de la cola "Urgente". Combina
   * `assignTo` + `acceptBy` en una sola query para resolver la race entre
   * dos drivers tap-eando "Tomar pedido" simultáneamente. WHERE compuesto
   * (status='waiting_driver' AND driver_id IS NULL AND urgent_since IS NOT NULL)
   * garantiza que solo el primero gana — Postgres locking sin race window.
   *
   * Retorna `true` si reclamó la fila, `false` si otro driver ya la tomó.
   */
  claimUrgent(orderId: OrderId, driverId: DriverId, now: Date): Promise<boolean>

  findAvailable(nowIso: string): Promise<Order[]>
  findByRestaurant(restaurantId: RestaurantId, statuses?: OrderStatus[]): Promise<Order[]>
  findByDriver(driverId: DriverId, statuses?: OrderStatus[]): Promise<Order[]>
}
