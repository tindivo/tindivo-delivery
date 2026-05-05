'use client'
import { customer } from '@/lib/api/client'
import { useQuery } from '@tanstack/react-query'
import type { Customer } from '@tindivo/contracts'
import { BottomActionBar, Button, GlassTopBar, Icon } from '@tindivo/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useCart } from '../hooks/use-cart'
import { CheckoutSheet } from './checkout-sheet'
import { ProductSheet } from './product-sheet'
import { RestaurantMarketplace } from './restaurant-marketplace'
import { RestaurantMenu } from './restaurant-menu'

/**
 * Orquestador principal de la PWA cliente. Mantiene el estado del carrito y
 * coordina los 4 estados de la UI: marketplace de locales, menú de un local,
 * detalle de producto y checkout.
 */
export function CustomerApp() {
  const router = useRouter()
  const restaurants = useQuery({
    queryKey: ['customer', 'restaurants'],
    queryFn: () => customer.listRestaurants(),
  })
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const menu = useQuery({
    queryKey: ['customer', 'menu', restaurantId],
    queryFn: () => customer.getMenu(restaurantId as string),
    enabled: Boolean(restaurantId),
  })
  const cart = useCart()
  const [selectedItem, setSelectedItem] = useState<Customer.MenuItem | null>(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const selectedRestaurant = menu.data?.restaurant

  return (
    <div
      className="min-h-screen bg-surface"
      style={{ paddingBottom: cart.items.length ? 132 : 32 }}
    >
      <GlassTopBar
        title="TINDIVO"
        subtitle="Pide en San Jacinto"
        right={
          <button
            type="button"
            onClick={() => setCheckoutOpen(true)}
            disabled={cart.items.length === 0}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-lowest border border-outline-variant/30 disabled:opacity-40"
            aria-label="Ver carrito"
          >
            <Icon name="shopping_bag" size={20} filled />
            {cart.totalItems > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 rounded-full bg-primary-container text-white text-[10px] font-black flex items-center justify-center px-1">
                {cart.totalItems}
              </span>
            )}
          </button>
        }
      />

      <main className="pt-20 max-w-6xl mx-auto">
        {!restaurantId ? (
          <RestaurantMarketplace
            restaurants={restaurants.data?.items ?? []}
            loading={restaurants.isLoading}
            onSelect={setRestaurantId}
          />
        ) : (
          <RestaurantMenu
            data={menu.data ?? null}
            loading={menu.isLoading}
            onBack={() => {
              setRestaurantId(null)
              cart.reset()
            }}
            onSelectItem={setSelectedItem}
          />
        )}
      </main>

      {cart.items.length > 0 && (
        <BottomActionBar>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-on-surface-variant">
                {cart.totalItems} producto{cart.totalItems === 1 ? '' : 's'}
              </p>
              <p className="font-black text-xl text-on-surface">S/ {cart.subtotal.toFixed(2)}</p>
            </div>
            <Button className="flex-1" size="lg" onClick={() => setCheckoutOpen(true)}>
              Ver carrito
              <Icon name="arrow_forward" />
            </Button>
          </div>
        </BottomActionBar>
      )}

      {selectedItem && (
        <ProductSheet
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onAdd={(item) => {
            cart.add(item)
            setSelectedItem(null)
          }}
        />
      )}

      {checkoutOpen && selectedRestaurant && (
        <CheckoutSheet
          restaurant={selectedRestaurant}
          cart={cart.items}
          subtotal={cart.subtotal}
          onClose={() => setCheckoutOpen(false)}
          onQuantity={cart.updateQuantity}
          onSuccess={(shortId) => router.push(`/pedidos/${shortId}`)}
        />
      )}
    </div>
  )
}
