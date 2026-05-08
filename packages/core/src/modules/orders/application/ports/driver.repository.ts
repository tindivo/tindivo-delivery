/**
 * Port para consultar drivers/compañeros disponibles para transferencia.
 *
 * Operaciones del MVP:
 *  - `findEligiblePeers`: lista los compañeros del restaurante con espacio
 *    en mochila. Excluye al driver origen para no aparecer en su propia lista.
 *    Usado por el endpoint GET /api/v1/driver/peers.
 *  - `findEligiblePeer`: revalida un destinatario puntual al ejecutar la
 *    transferencia (race entre el GET /peers y el POST /transfer si el
 *    destinatario apaga su disponibilidad). Devuelve null si ya no aplica.
 */

export type EligiblePeer = {
  driverId: string
  fullName: string
  vehicleType: string
  /** Suma de occupancy_slots de pedidos activos (heading/waiting/picked_up). */
  activeSlots: number
  /** Suma de occupancy_slots de pedidos reservados (waiting_driver con driver_id=peer). */
  reservedSlots: number
}

export type EligiblePeerQuery = {
  restaurantId: string
  excludeDriverId: string
  todayStart: Date
}

export type SinglePeerQuery = {
  driverId: string
  restaurantId: string
}

export interface DriverRepository {
  findEligiblePeers(query: EligiblePeerQuery): Promise<EligiblePeer[]>
  findEligiblePeer(query: SinglePeerQuery): Promise<EligiblePeer | null>
}
