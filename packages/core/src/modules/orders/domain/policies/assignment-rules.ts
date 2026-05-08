/**
 * Configuración de las reglas de asignación de pedidos a motorizados.
 *
 * Replica las constantes del simulador documentado (R1..R6) y permite que
 * el admin las edite en runtime desde `app_settings` sin redeploy:
 *
 * - `maxOrdersPerDriver`         — R3: cap de slots en mochila por driver.
 *                                  Ahora se interpreta como suma de
 *                                  `occupancy_slots` (un pedido puede valer
 *                                  >1 si el driver lo declara grande).
 * - `maxRestaurantsPerDriver`    — R2: restaurantes distintos simultáneos.
 * - `groupingWindowMinutes`      — R1: ventana de agrupación por restaurante.
 * - `maxOccupancySlotsPerOrder`  — Cap de ocupación que el driver puede
 *                                  declarar en `markPickedUp` (1..N).
 *
 * Si la persistencia no devuelve config válida, el caller debe aplicar
 * `DEFAULT_ASSIGNMENT_RULES` (defaults del simulador).
 */

export type AssignmentRules = {
  maxOrdersPerDriver: number
  maxRestaurantsPerDriver: number
  groupingWindowMinutes: number
  maxOccupancySlotsPerOrder: number
}

export const DEFAULT_ASSIGNMENT_RULES: AssignmentRules = {
  maxOrdersPerDriver: 3,
  maxRestaurantsPerDriver: 2,
  groupingWindowMinutes: 5,
  maxOccupancySlotsPerOrder: 3,
}
