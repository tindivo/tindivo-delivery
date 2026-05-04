/**
 * Capacidad máxima de pedidos concurrentes por motorizado (asignados +
 * activos). Centralizado aquí para evitar drift entre auto-asignación y
 * accept manual del driver.
 */
export const MAX_DRIVER_CONCURRENT_ORDERS = 4
