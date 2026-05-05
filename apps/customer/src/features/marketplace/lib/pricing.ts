import type { Customer } from '@tindivo/contracts'
import type { CartItem } from '../hooks/use-cart'

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export function parseMoney(raw: string): number {
  const normalized = raw.replace(',', '.').replace(/[^0-9.]/g, '')
  const value = Number.parseFloat(normalized)
  return Number.isFinite(value) ? roundMoney(value) : 0
}

/**
 * Total de la línea (`unit_price + sum(modifiers)) * quantity`).
 * Mantener consistente con `priceCart()` del backend en
 * `apps/api/app/api/v1/public/customer-orders/route.ts` — el server hace
 * la verdad final y rechaza el pedido si los modificadores no cumplen
 * `min/max_selected`.
 */
export function lineTotal(item: CartItem): number {
  const optionMap = new Map<string, Customer.MenuModifierOption>()
  for (const group of item.menuItem.modifierGroups) {
    for (const option of group.options) optionMap.set(option.id, option)
  }
  const modifiersTotal = item.modifiers.reduce(
    (sum, modifier) => sum + (optionMap.get(modifier.optionId)?.priceDelta ?? 0),
    0,
  )
  return roundMoney((item.menuItem.price + modifiersTotal) * item.quantity)
}
