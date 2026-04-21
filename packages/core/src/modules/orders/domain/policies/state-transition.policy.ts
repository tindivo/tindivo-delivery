import type { OrderStatusValue } from '../value-objects/order-status'

/**
 * Máquina de estados del pedido. Define qué transiciones son válidas.
 *
 *   waiting_driver → heading_to_restaurant | cancelled
 *   heading_to_restaurant → waiting_at_restaurant | cancelled
 *   waiting_at_restaurant → picked_up | cancelled
 *   picked_up → delivered | cancelled
 *   delivered → (terminal)
 *   cancelled → (terminal)
 */
const TRANSITIONS: Record<OrderStatusValue, readonly OrderStatusValue[]> = {
  waiting_driver: ['heading_to_restaurant', 'cancelled'],
  heading_to_restaurant: ['waiting_at_restaurant', 'cancelled'],
  waiting_at_restaurant: ['picked_up', 'cancelled'],
  picked_up: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
}

export const StateTransitionPolicy = {
  canTransition(from: OrderStatusValue, to: OrderStatusValue): boolean {
    return TRANSITIONS[from].includes(to)
  },

  isFinal(status: OrderStatusValue): boolean {
    return TRANSITIONS[status].length === 0
  },
} as const
