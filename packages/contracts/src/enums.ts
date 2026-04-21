import { z } from 'zod'

export const UserRole = z.enum(['admin', 'restaurant', 'driver'])
export type UserRole = z.infer<typeof UserRole>

export const OrderStatus = z.enum([
  'waiting_driver',
  'heading_to_restaurant',
  'waiting_at_restaurant',
  'picked_up',
  'delivered',
  'cancelled',
])
export type OrderStatus = z.infer<typeof OrderStatus>

export const PaymentStatus = z.enum(['prepaid', 'pending_yape', 'pending_cash'])
export type PaymentStatus = z.infer<typeof PaymentStatus>

export const PrepTimeOption = z.enum(['fast', 'normal', 'slow'])
export type PrepTimeOption = z.infer<typeof PrepTimeOption>

export const SettlementStatus = z.enum(['pending', 'paid', 'overdue'])
export type SettlementStatus = z.infer<typeof SettlementStatus>

export const CashSettlementStatus = z.enum([
  'pending',
  'delivered',
  'confirmed',
  'disputed',
  'resolved',
])
export type CashSettlementStatus = z.infer<typeof CashSettlementStatus>

export const VehicleType = z.enum(['moto', 'bicicleta', 'pie', 'auto'])
export type VehicleType = z.infer<typeof VehicleType>

export const CancellationReason = z.enum([
  'restaurant_request',
  'admin_intervention',
  'client_cancelled',
  'driver_unavailable',
  'out_of_hours',
  'other',
])
export type CancellationReason = z.infer<typeof CancellationReason>

/**
 * Mapa de opciones de prep time → minutos.
 */
export const PREP_TIME_MINUTES: Record<PrepTimeOption, number> = {
  fast: 10,
  normal: 15,
  slow: 20,
}
