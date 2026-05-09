import type { AssignmentRules } from './assignment-rules'

/**
 * Política de asignación de pedido → motorizado.
 *
 * Implementa las 6 reglas determinísticas del simulador documentado en
 * `Tindivo-Simulator-Reglas.md`, operando con precedencia estricta:
 *
 *   R3 (filtro cap pedidos)
 *     │
 *     ├─ R1 (matches por mismo restaurante en ventana)
 *     │     │
 *     │     ├─ R2 sobre matches (cap restaurantes, NO cuenta si ya lo tiene)
 *     │     │
 *     │     └─ R4 (least loaded)  → reason='R1_grouping'
 *     │
 *     └─ R2 (cap restaurantes en pool general)
 *           │
 *           └─ R4 (least loaded)  → reason='R4_rotation'
 *
 * Si el filtro inicial vacía el pool, retorna `null` (R5: el caller deja
 * el pedido en cola con driver_id NULL; el cron `assign-pending-orders`
 * reintentará al próximo minuto, drenando FIFO según `appears_in_queue_at`).
 *
 * Notas:
 * - R1 puede sobrepasar R2 cuando el driver ya tiene ese restaurante en
 *   mochila — entonces no cuenta como "agregar restaurante nuevo".
 * - R4 ordena por `totalAssignedDay` (todo lo que el driver "tocó" hoy:
 *   activos + reservados + entregados + cancelados). Tiebreak: menor
 *   `shiftStartedAt` (drivers que entraron antes al turno ganan), y como
 *   determinismo final `driverId` ascendente.
 * - Los prefiltros (driver_restaurants, is_available, horario, is_active)
 *   se aplican en el repositorio ANTES de invocar este policy.
 */

export type DriverAssignmentCandidate = {
  driverId: string
  deliveredToday: number
  activeCount: number
  reservedCount: number
  /** Suma de occupancy_slots de pedidos activos (heading/waiting/picked_up). */
  activeSlots: number
  /** Suma de occupancy_slots de pedidos reservados (waiting_driver con driver_id=this). */
  reservedSlots: number
  cancelledTodayCount: number
  /**
   * Cantidad de rechazos del driver hoy (cualquier pedido). Se suma en
   * `totalAssignedDay` para que un driver que rechaza mucho caiga al fondo
   * del orden de R4 — self-correcting sin necesidad de banear. Verificado en
   * BD: driver Jesús (2b96d299) rechazó 7 pedidos pero seguía siendo "least
   * loaded" porque rechazos no penalizaban.
   */
  rejectedTodayCount: number
  sameRestaurantWindowCount: number
  /** Restaurantes distintos que el driver tiene en mochila (no entregados/cancelados). */
  distinctRestaurantsInBag: string[]
  /** Sello del último paso a is_available=true. Null si nunca seteado. */
  shiftStartedAt: Date | null
  operatingDays: string[]
  shiftStart: string
  shiftEnd: string
}

export type AssignmentReason = 'R1_grouping' | 'R4_rotation'

export type AssignmentDecision = {
  driverId: string
  reason: AssignmentReason
}

export type QueueReason = 'all_drivers_at_cap' | 'restaurant_cap_exceeded'

export type ChooseInput = {
  restaurantId: string
  /**
   * Slots que ocupará este pedido en la mochila del driver. Hoy todos los
   * pedidos nacen con `occupancy_slots=1` (default DB) y solo el driver lo
   * cambia en `markPickedUp`. Pero el policy debe respetar este input para
   * casos futuros donde el restaurante o el flujo declare un slot custom
   * (pedido grande, multi-bolsa, etc.). El `+1` hardcoded anterior subestima
   * R3 si el slot real entrante es >1.
   */
  occupancySlots: number
}

export const DriverAssignmentPolicy = {
  choose(
    order: ChooseInput,
    candidates: readonly DriverAssignmentCandidate[],
    rules: AssignmentRules,
  ): AssignmentDecision | null {
    if (candidates.length === 0) return null

    // R3: cap de slots en mochila por driver. Suma occupancy_slots de
    // activos + reservados + el slot real entrante. Si el cap es 3 y el
    // driver lleva activeSlots=2 más 1 reservedSlot, ya está en 3 — no
    // entra otro pedido (incluso uno de slot=1).
    const incomingSlots = Math.max(1, order.occupancySlots)
    const r3Pool = candidates.filter(
      (c) => c.activeSlots + c.reservedSlots + incomingSlots <= rules.maxOrdersPerDriver,
    )
    if (r3Pool.length === 0) return null // R5: cola "all_drivers_at_cap"

    // R1: matches con pedido(s) del mismo restaurante en la ventana de
    // agrupación (calculado por el repository: sameRestaurantWindowCount > 0).
    const r1Matches = r3Pool.filter((c) => c.sameRestaurantWindowCount > 0)

    if (r1Matches.length > 0) {
      // R2 aplicada sobre los matches. Si el driver ya tiene el restaurante
      // del pedido en mochila, no se cuenta como "agregar uno nuevo" — esto
      // es lo que permite a R1 "sobrepasar" R2 cuando agrupa al mismo lugar.
      const r2OverR1 = r1Matches.filter((c) =>
        canAddRestaurant(c, order.restaurantId, rules.maxRestaurantsPerDriver),
      )
      if (r2OverR1.length > 0) {
        const winner = pickLeastLoaded(r2OverR1)
        return { driverId: winner.driverId, reason: 'R1_grouping' }
      }
    }

    // R2: cap de restaurantes distintos en el pool general (cuando no hubo
    // match agrupable, o los matches fueron filtrados todos por R2).
    const r2Pool = r3Pool.filter((c) =>
      canAddRestaurant(c, order.restaurantId, rules.maxRestaurantsPerDriver),
    )
    if (r2Pool.length === 0) return null // R5: cola "restaurant_cap_exceeded"

    const winner = pickLeastLoaded(r2Pool)
    return { driverId: winner.driverId, reason: 'R4_rotation' }
  },
} as const

function canAddRestaurant(
  candidate: DriverAssignmentCandidate,
  restaurantId: string,
  maxRestaurants: number,
): boolean {
  if (candidate.distinctRestaurantsInBag.includes(restaurantId)) return true
  return candidate.distinctRestaurantsInBag.length < maxRestaurants
}

function totalAssignedDay(c: DriverAssignmentCandidate): number {
  // Suma de "carga del día" usando slots para activos/reservados (mochila
  // física actual) y count para entregados/cancelados/rechazados (no se
  // reconstruye historial de slots). Esto premia rotación: un driver con
  // un pedido grande (slots=3) tiene mismo "load" que tres slots=1.
  // `rejectedTodayCount` se suma para penalizar drivers que rechazan mucho:
  // su próxima asignación los considera "más cargados" y caen al fondo de
  // R4. Sin esto, el least-loaded loop infinito (driver rechaza → least
  // loaded → mismo driver → rechaza → ...) que vimos en BD con Jesús.
  return (
    c.deliveredToday +
    c.activeSlots +
    c.reservedSlots +
    c.cancelledTodayCount +
    c.rejectedTodayCount
  )
}

function pickLeastLoaded(
  candidates: readonly DriverAssignmentCandidate[],
): DriverAssignmentCandidate {
  // R4 con tiebreaks:
  //   1. menor totalAssignedDay
  //   2. menor shiftStartedAt (driver que entró antes al turno gana)
  //   3. driverId asc (determinismo final)
  // candidates.length >= 1 está garantizado por el caller.
  const sorted = [...candidates].sort((a, b) => {
    const ta = totalAssignedDay(a)
    const tb = totalAssignedDay(b)
    if (ta !== tb) return ta - tb

    const sa = a.shiftStartedAt?.getTime() ?? Number.POSITIVE_INFINITY
    const sb = b.shiftStartedAt?.getTime() ?? Number.POSITIVE_INFINITY
    if (sa !== sb) return sa - sb

    return a.driverId.localeCompare(b.driverId)
  })
  // biome-ignore lint/style/noNonNullAssertion: caller garantiza length >= 1
  return sorted[0]!
}
