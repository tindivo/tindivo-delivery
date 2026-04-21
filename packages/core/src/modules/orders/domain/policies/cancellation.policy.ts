import type { OrderStatusValue } from '../value-objects/order-status'

export type Role = 'admin' | 'restaurant' | 'driver'

/**
 * Reglas de negocio sobre quién puede cancelar un pedido y en qué estado.
 *
 * - Admin: puede cancelar en cualquier estado activo.
 * - Restaurante: puede cancelar solo en estados tempranos (antes de que el driver recoja).
 * - Driver: NO puede cancelar (debe reportar al admin para reasignación).
 */
const CANCEL_BY_RESTAURANT: readonly OrderStatusValue[] = [
  'waiting_driver',
  'heading_to_restaurant',
  'waiting_at_restaurant',
]

const CANCEL_BY_ADMIN: readonly OrderStatusValue[] = [
  'waiting_driver',
  'heading_to_restaurant',
  'waiting_at_restaurant',
  'picked_up',
]

export const CancellationPolicy = {
  canCancel(role: Role, currentStatus: OrderStatusValue): boolean {
    switch (role) {
      case 'admin':
        return CANCEL_BY_ADMIN.includes(currentStatus)
      case 'restaurant':
        return CANCEL_BY_RESTAURANT.includes(currentStatus)
      case 'driver':
        return false
    }
  },
} as const
