'use client'
import { useDriverActiveOrders } from './use-driver-active-orders'

// Reflejo client-side del default de assignment_rules.maxOrdersPerDriver
// (DEFAULT_ASSIGNMENT_RULES en packages/core/.../assignment-rules.ts). El
// backend rechaza con DRIVER_CAPACITY_EXCEEDED leyendo el valor real de
// app_settings; este número solo deshabilita botones proactivamente. Si el
// admin ajusta el cap, la UI puede ir levemente desincronizada hasta que
// se refresque, pero el backend siempre tiene la última palabra.
export const DRIVER_MAX_CONCURRENT = 3

/**
 * Cuenta la ocupación del driver (suma de occupancy_slots de pedidos activos)
 * y expone si ya llegó al límite. Anteriormente contaba filas; ahora cuenta
 * slots, alineado con la regla R3 que pasó de "max pedidos" a "max slots".
 *
 * El límite duro está en el backend (AcceptOrderUseCase y AutoAssign aplican
 * la policy). Este hook lo refleja en la UI para deshabilitar botones
 * proactivamente, alineado con HU-D-020. Pedidos sin pickup todavía cuentan
 * como 1 slot (default); al recoger se actualiza al valor declarado.
 */
export function useDriverCapacity() {
  const { data, isLoading } = useDriverActiveOrders()
  // biome-ignore lint/suspicious/noExplicitAny: payload snake_case del API
  const items = (data?.items ?? []) as any[]
  const activeCount = items.length
  const usedSlots = items.reduce((sum, o) => sum + (Number(o?.occupancy_slots) || 1), 0)
  const isFull = usedSlots >= DRIVER_MAX_CONCURRENT

  return {
    activeCount,
    usedSlots,
    max: DRIVER_MAX_CONCURRENT,
    isFull,
    isLoading,
  }
}
