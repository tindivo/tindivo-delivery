'use client'
import type { Customer } from '@tindivo/contracts'
import { BottomActionBar, Button, Icon, IconButton, Label } from '@tindivo/ui'
import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import type { CartItem } from '../hooks/use-cart'

type Props = {
  item: Customer.MenuItem
  canOrder?: boolean
  phone?: string
  onClose: () => void
  onAdd: (item: CartItem) => void
}

/**
 * Bottom sheet de detalle de producto: cantidad, modificadores y notas.
 *
 * El backdrop es un `<button absolute inset-0>` para detectar tap-out, pero
 * el panel necesita `relative z-10` para crear stacking context propio: sin
 * eso el button absoluto intercepta los clicks dentro del sheet (los stack
 * elements positioned se renderizan encima de los static aunque sean DOM
 * siblings posteriores).
 */
export function ProductSheet({ item, canOrder = true, phone, onClose, onAdd }: Props) {
  const [quantity, setQuantity] = useState(1)
  const [selected, setSelected] = useState<Array<{ groupId: string; optionId: string }>>([])
  const [notes, setNotes] = useState('')

  const optionMap = useMemo(() => {
    const map = new Map<string, Customer.MenuModifierOption>()
    for (const group of item.modifierGroups) {
      for (const option of group.options) map.set(option.id, option)
    }
    return map
  }, [item])
  const modifiersTotal = selected.reduce(
    (sum, modifier) => sum + (optionMap.get(modifier.optionId)?.priceDelta ?? 0),
    0,
  )
  const total = (item.price + modifiersTotal) * quantity
  const valid = item.modifierGroups.every((group) => {
    const count = selected.filter((modifier) => modifier.groupId === group.id).length
    return count >= group.minSelected && count <= group.maxSelected
  })

  function toggle(group: Customer.MenuModifierGroup, option: Customer.MenuModifierOption) {
    setSelected((current) => {
      const exists = current.some((m) => m.groupId === group.id && m.optionId === option.id)
      if (exists) {
        return current.filter((m) => !(m.groupId === group.id && m.optionId === option.id))
      }
      const inGroup = current.filter((m) => m.groupId === group.id)
      if (group.maxSelected === 1) {
        return [
          ...current.filter((m) => m.groupId !== group.id),
          { groupId: group.id, optionId: option.id },
        ]
      }
      if (inGroup.length >= group.maxSelected) return current
      return [...current, { groupId: group.id, optionId: option.id }]
    })
  }

  return (
    <div className="customer-sheet-overlay">
      <button type="button" aria-label="Cerrar" className="absolute inset-0" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 48, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 30, stiffness: 260 }}
        className="customer-sheet pb-32 md:w-[min(100%,42rem)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between bg-[#fffaf6]/86 p-4 backdrop-blur-xl">
          <div className="customer-sheet-handle md:opacity-0" />
          <IconButton variant="subtle" onClick={onClose} aria-label="Cerrar">
            <Icon name="close" />
          </IconButton>
        </div>
        <div className="mx-auto max-w-xl px-5">
          <div className="customer-shimmer mb-5 h-56 overflow-hidden rounded-[30px] bg-primary-fixed shadow-[0_24px_60px_-44px_rgba(119,52,21,0.7)] md:h-72">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="customer-soft-gradient flex h-full w-full items-center justify-center">
                <img src="/icon.svg" alt="" className="h-24 w-24 rounded-[28px] bg-white/88 p-2" />
              </div>
            )}
          </div>
          <h2 className="text-3xl font-black leading-tight tracking-normal text-on-surface md:text-4xl">
            {item.name}
          </h2>
          {item.description && (
            <p className="mt-2 text-base leading-relaxed text-on-surface-variant">
              {item.description}
            </p>
          )}
          <p className="mt-3 text-xl font-black text-primary-container">
            S/ {item.price.toFixed(2)}
          </p>

          <div className="mt-6 space-y-5">
            {item.modifierGroups.map((group) => (
              <section key={group.id} className="customer-panel-soft rounded-[26px] p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-black text-on-surface">{group.name}</h3>
                  <span className="text-xs font-bold uppercase text-on-surface-variant">
                    {group.minSelected > 0 ? 'Obligatorio' : `Hasta ${group.maxSelected}`}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {group.options.map((option) => {
                    const active = selected.some(
                      (m) => m.groupId === group.id && m.optionId === option.id,
                    )
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => toggle(group, option)}
                        className="customer-lift flex w-full items-center justify-between gap-3 rounded-[20px] border border-white/60 bg-white/78 px-4 py-3 text-left"
                      >
                        <span className="font-semibold">{option.name}</span>
                        <span className="flex items-center gap-2 text-sm font-bold">
                          {option.priceDelta > 0
                            ? `+ S/ ${option.priceDelta.toFixed(2)}`
                            : 'Incluido'}
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                              active
                                ? 'bg-primary-container border-primary-container text-white'
                                : 'border-outline-variant'
                            }`}
                          >
                            {active && <Icon name="check" size={13} />}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>
            ))}

            <section className="space-y-2">
              <Label htmlFor="product-notes">Notas para el local</Label>
              <textarea
                id="product-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value.slice(0, 300))}
                rows={3}
                placeholder="Sin cebolla, poco aji, salsa aparte..."
                className="customer-textarea"
              />
            </section>
          </div>
        </div>
        <BottomActionBar zIndex={80}>
          <div className="flex items-center gap-3">
            <div className="customer-glass flex h-14 items-center rounded-full">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="flex h-14 w-12 items-center justify-center"
              >
                <Icon name="remove" />
              </button>
              <span className="w-8 text-center font-black">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="flex h-14 w-12 items-center justify-center"
              >
                <Icon name="add" />
              </button>
            </div>
            <Button
              size="lg"
              className="flex-1"
              disabled={canOrder ? !valid : false}
              onClick={() => {
                if (!canOrder) {
                  if (phone) window.location.href = `tel:+51${phone}`
                  return
                }
                onAdd({
                  key: `${item.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                  menuItem: item,
                  quantity,
                  modifiers: selected,
                  notes,
                })
              }}
            >
              {canOrder ? `Agregar S/ ${total.toFixed(2)}` : 'Contactar negocio'}
            </Button>
          </div>
        </BottomActionBar>
      </motion.div>
    </div>
  )
}
