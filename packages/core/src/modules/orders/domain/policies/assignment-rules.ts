/**
 * Configuración de las reglas de asignación de pedidos a motorizados.
 *
 * Replica las constantes del simulador documentado (R1..R6) y permite que
 * el admin las edite en runtime desde `app_settings` sin redeploy:
 *
 * - `maxOrdersPerDriver`     — R3: pedidos en mochila simultáneos.
 * - `maxRestaurantsPerDriver` — R2: restaurantes distintos simultáneos.
 * - `groupingWindowMinutes`  — R1: ventana de agrupación por restaurante.
 *
 * Si la persistencia no devuelve config válida, el caller debe aplicar
 * `DEFAULT_ASSIGNMENT_RULES` (defaults del simulador).
 */

export type AssignmentRules = {
  maxOrdersPerDriver: number
  maxRestaurantsPerDriver: number
  groupingWindowMinutes: number
}

export const DEFAULT_ASSIGNMENT_RULES: AssignmentRules = {
  maxOrdersPerDriver: 3,
  maxRestaurantsPerDriver: 2,
  groupingWindowMinutes: 5,
}
