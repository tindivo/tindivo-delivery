'use client'
import type { Customer } from '@tindivo/contracts'
import { BottomActionBar, Button, Icon, IconButton } from '@tindivo/ui'
import { motion } from 'motion/react'
import { useMemo } from 'react'
import type { CartItem } from '../hooks/use-cart'
import { lineTotal } from '../lib/pricing'

type Props = {
  restaurant: Customer.PublicRestaurantSummary
  cart: CartItem[]
  subtotal: number
  onClose: () => void
  onQuantity: (key: string, delta: number) => void
  onSent: () => void
}

/**
 * Checkout para negocios marketplace SIN delivery (`deliveryEnabled=false`).
 *
 * El cliente arma su carrito normalmente; al "pedir" se abre WhatsApp con
 * mensaje prellenado al numero del negocio. El pedido NO entra al sistema
 * de delivery — la coordinacion la maneja el dueño manualmente via WhatsApp.
 */
export function WhatsappCheckoutSheet({
  restaurant,
  cart,
  subtotal,
  onClose,
  onQuantity,
  onSent,
}: Props) {
  const message = useMemo(
    () => buildMessage(restaurant.name, cart, subtotal),
    [restaurant.name, cart, subtotal],
  )
  const waLink = `https://wa.me/51${restaurant.phone}?text=${encodeURIComponent(message)}`

  function handleSend() {
    window.open(waLink, '_blank', 'noopener,noreferrer')
    onSent()
  }

  return (
    <div className="customer-sheet-overlay">
      <button type="button" aria-label="Cerrar" className="absolute inset-0" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 48, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 30, stiffness: 260 }}
        className="customer-sheet pb-32 md:w-[min(100%,40rem)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-[#fffaf6]/88 p-4 backdrop-blur-xl">
          <div className="mx-auto mb-3 customer-sheet-handle md:hidden" />
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-emerald-700">Coordinar por WhatsApp</p>
              <h2 className="text-2xl font-black leading-tight">{restaurant.name}</h2>
            </div>
            <IconButton variant="subtle" onClick={onClose} aria-label="Cerrar">
              <Icon name="close" />
            </IconButton>
          </div>
        </div>

        <div className="mx-auto max-w-xl space-y-5 px-5">
          <section className="customer-panel-soft space-y-3 rounded-[28px] p-4">
            <h3 className="flex items-center gap-2 text-lg font-black">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <Icon name="shopping_bag" size={20} filled />
              </span>
              Resumen
            </h3>
            {cart.map((item) => (
              <div key={item.key} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{item.menuItem.name}</p>
                  <p className="text-xs text-on-surface-variant">S/ {lineTotal(item).toFixed(2)}</p>
                </div>
                <div className="flex items-center rounded-full bg-surface-container">
                  <button
                    type="button"
                    onClick={() => onQuantity(item.key, -1)}
                    className="flex h-9 w-9 items-center justify-center"
                  >
                    <Icon name="remove" size={18} />
                  </button>
                  <span className="w-7 text-center text-sm font-black">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => onQuantity(item.key, 1)}
                    className="flex h-9 w-9 items-center justify-center"
                  >
                    <Icon name="add" size={18} />
                  </button>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-outline-variant/20 pt-3">
              <span className="font-bold">Total</span>
              <span className="text-2xl font-black text-primary-container">
                S/ {subtotal.toFixed(2)}
              </span>
            </div>
          </section>

          <section
            className="overflow-hidden rounded-[28px] p-5"
            style={{
              background:
                'linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(16,185,129,0.12) 100%)',
              border: '1px solid rgba(16,185,129,0.25)',
            }}
          >
            <div className="flex items-start gap-3">
              <span
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-[0_10px_26px_-12px_rgba(16,185,129,0.65)]"
                style={{
                  background: 'linear-gradient(135deg, #25D366 0%, #128C7E 60%, #075E54 100%)',
                }}
              >
                <Icon name="chat" size={22} filled />
              </span>
              <div className="min-w-0">
                <h3 className="font-black text-on-surface">Este negocio no usa Tindivo Delivery</h3>
                <p className="mt-1 text-sm font-semibold text-on-surface-variant">
                  Al continuar, se abre WhatsApp con tu pedido prellenado al numero del local.
                  Coordina ahi la entrega o el recojo directamente con el negocio.
                </p>
              </div>
            </div>
          </section>

          <section className="customer-panel-soft rounded-[28px] p-4">
            <p className="text-xs font-black uppercase text-on-surface-variant">
              Mensaje que envias
            </p>
            <pre className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-on-surface">
              {message}
            </pre>
          </section>
        </div>

        <BottomActionBar zIndex={80}>
          <Button
            size="lg"
            className="w-full"
            onClick={handleSend}
            style={{
              background: 'linear-gradient(135deg, #25D366 0%, #128C7E 60%, #075E54 100%)',
              color: 'white',
            }}
          >
            <Icon name="chat" filled />
            Abrir WhatsApp con mi pedido
            <Icon name="arrow_forward" />
          </Button>
        </BottomActionBar>
      </motion.div>
    </div>
  )
}

function buildMessage(restaurantName: string, cart: CartItem[], subtotal: number): string {
  const lines: string[] = []
  lines.push(`Hola ${restaurantName}, quiero hacer este pedido por Tindivo:`)
  lines.push('')
  for (const item of cart) {
    const mods = item.modifiers.length
      ? ` (${item.modifiers
          .map((m) => {
            const group = item.menuItem.modifierGroups.find((g) => g.id === m.groupId)
            const option = group?.options.find((o) => o.id === m.optionId)
            return option?.name ?? ''
          })
          .filter(Boolean)
          .join(', ')})`
      : ''
    lines.push(
      `- ${item.quantity}x ${item.menuItem.name}${mods} — S/ ${lineTotal(item).toFixed(2)}`,
    )
    if (item.notes.trim()) lines.push(`   Nota: ${item.notes.trim()}`)
  }
  lines.push('')
  lines.push(`Total: S/ ${subtotal.toFixed(2)}`)
  lines.push('')
  lines.push('Coordinamos por aqui? Gracias!')
  return lines.join('\n')
}
