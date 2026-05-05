'use client'
import type { Customer } from '@tindivo/contracts'
import { useCallback, useMemo, useState } from 'react'
import { lineTotal } from '../lib/pricing'

export type CartItem = {
  /** Identificador local del item en el carrito (mismo menuItem puede aparecer varias veces con distintos modificadores). */
  key: string
  menuItem: Customer.MenuItem
  quantity: number
  modifiers: Array<{ groupId: string; optionId: string }>
  notes: string
}

/**
 * Estado del carrito por restaurante. Reset al cambiar de restaurante porque
 * un pedido siempre va a un solo local (regla de negocio: el motorizado
 * recoge en un solo punto).
 */
export function useCart() {
  const [items, setItems] = useState<CartItem[]>([])

  const add = useCallback((item: CartItem) => {
    setItems((current) => [...current, item])
  }, [])

  const updateQuantity = useCallback((key: string, delta: number) => {
    setItems((current) =>
      current.flatMap((item) => {
        if (item.key !== key) return [item]
        const next = item.quantity + delta
        return next > 0 ? [{ ...item, quantity: next }] : []
      }),
    )
  }, [])

  const reset = useCallback(() => setItems([]), [])

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + lineTotal(item), 0), [items])
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)

  return { items, add, updateQuantity, reset, subtotal, totalItems }
}
