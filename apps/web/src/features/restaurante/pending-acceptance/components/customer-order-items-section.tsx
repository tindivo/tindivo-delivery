'use client'
import { Icon, Skeleton } from '@tindivo/ui'
import { useOrderItems } from '../hooks/use-order-items'

type Props = {
  orderId: string
  /**
   * Datos del pedido. Si `source !== 'customer_pwa'` no se renderiza nada.
   * Pedidos manuales del restaurante no tienen desglose de items.
   */
  order: { source: 'restaurant_pwa' | 'customer_pwa' | null | undefined }
}

/**
 * Sección reusable que muestra el desglose detallado de un pedido
 * `customer_pwa`: items, modificadores, notas individuales. Lee del
 * endpoint /restaurant/orders/[id]/items via TanStack Query.
 */
export function CustomerOrderItemsSection({ orderId, order }: Props) {
  const isCustomerPwa = order.source === 'customer_pwa'
  const itemsQuery = useOrderItems(orderId, isCustomerPwa)

  if (!isCustomerPwa) return null

  return (
    <section className="bg-surface-container-lowest rounded-[24px] p-5 border border-outline-variant/15">
      <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase text-on-surface-variant mb-3">
        Detalle del pedido del cliente
      </h3>
      {itemsQuery.isLoading ? (
        <Skeleton className="h-24" />
      ) : (itemsQuery.data?.items?.length ?? 0) === 0 ? (
        <p className="text-sm text-on-surface-variant">Sin items registrados.</p>
      ) : (
        <ul className="space-y-3">
          {itemsQuery.data?.items.map((item) => (
            <li key={item.id} className="space-y-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-bold text-on-surface">
                  <span className="text-primary-container mr-2 font-mono">{item.quantity}×</span>
                  {item.itemName}
                </p>
                <p className="text-sm font-bold text-on-surface tabular-nums">
                  S/ {item.lineTotal.toFixed(2)}
                </p>
              </div>
              {item.modifiers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 ml-7">
                  {item.modifiers.map((m, idx) => (
                    <span
                      // biome-ignore lint/suspicious/noArrayIndexKey: modifiers per item are stable
                      key={`${item.id}-${idx}`}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant border border-outline-variant/30"
                    >
                      {m.optionName}
                      {m.priceDelta > 0 && (
                        <span className="ml-1 text-on-surface/60">+{m.priceDelta.toFixed(2)}</span>
                      )}
                    </span>
                  ))}
                </div>
              )}
              {item.notes && (
                <p className="ml-7 text-xs italic text-amber-800 bg-amber-50 rounded-lg px-2 py-1 border border-amber-200/50">
                  <Icon name="comment" size={12} className="inline mr-1 align-middle" />
                  {item.notes}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
