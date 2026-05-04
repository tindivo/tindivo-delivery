'use client'
import { useDriverActiveOrders } from './use-driver-active-orders'

// Mantener sincronizado con MAX_DRIVER_CONCURRENT_ORDERS en
// packages/core/src/modules/orders/domain/constants.ts. El backend rechaza
// con DRIVER_CAPACITY_EXCEEDED si se supera; este valor solo deshabilita
// botones en la UI.
export const DRIVER_MAX_CONCURRENT = 4

/**
 * Cuenta los pedidos activos del driver y expone si ya llegó al límite.
 *
 * El límite duro está en el backend (AcceptOrderUseCase devuelve
 * DRIVER_CAPACITY_EXCEEDED — 409). Este hook lo refleja en la UI para
 * deshabilitar botones proactivamente, alineado con HU-D-020.
 */
export function useDriverCapacity() {
  const { data, isLoading } = useDriverActiveOrders()
  const activeCount = data?.items?.length ?? 0
  const isFull = activeCount >= DRIVER_MAX_CONCURRENT

  return {
    activeCount,
    max: DRIVER_MAX_CONCURRENT,
    isFull,
    isLoading,
  }
}
