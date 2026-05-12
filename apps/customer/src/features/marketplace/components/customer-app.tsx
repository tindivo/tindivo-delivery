'use client'
import { customer } from '@/lib/api/client'
import { useQuery } from '@tanstack/react-query'
import type { Customer } from '@tindivo/contracts'
import { BottomActionBar, Button, GlassTopBar, Icon } from '@tindivo/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LoginButton } from '../../auth/components/login-button'
import { WelcomeToast } from '../../auth/components/welcome-toast'
import { InstallPromptBanner } from '../../pwa/components/install-prompt-banner'
import { useCart } from '../hooks/use-cart'
import { CheckoutSheet } from './checkout-sheet'
import { ProductSheet } from './product-sheet'
import { RestaurantMarketplace } from './restaurant-marketplace'
import { RestaurantMenu } from './restaurant-menu'
import { WhatsappCheckoutSheet } from './whatsapp-checkout-sheet'

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
  const [selectedListing, setSelectedListing] = useState<Customer.PublicRestaurantSummary | null>(
    null,
  )
  const menu = useQuery({
    queryKey: ['customer', 'menu', selectedListing?.id, selectedListing?.catalogType],
    queryFn: () => customer.getMenu(selectedListing?.id as string, selectedListing?.catalogType),
    enabled: Boolean(selectedListing),
  })
  const cart = useCart()
  const [selectedItem, setSelectedItem] = useState<Customer.MenuItem | null>(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const selectedRestaurant = menu.data?.restaurant

  return (
    <div
      className="customer-page bg-transparent"
      style={{ paddingBottom: cart.items.length ? 132 : 32 }}
    >
      <WelcomeToast />
      <GlassTopBar
        title="Tindivo"
        subtitle="Pide en San Jacinto"
        left={
          <span className="customer-pulse inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-[0_10px_30px_-18px_rgba(171,53,0,0.8)]">
            <img src="/icon.svg" alt="" className="h-8 w-8 object-contain" />
          </span>
        }
        right={
          <div className="flex items-center gap-2">
            <LoginButton />
            <button
              type="button"
              onClick={() => setCheckoutOpen(true)}
              disabled={cart.items.length === 0}
              className="customer-lift relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/80 shadow-[0_10px_28px_-20px_rgba(171,53,0,0.8)] backdrop-blur disabled:opacity-40"
              aria-label="Ver carrito"
            >
              <Icon name="shopping_bag" size={20} filled />
              {cart.totalItems > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-container px-1 text-xs font-black text-white">
                  {cart.totalItems}
                </span>
              )}
            </button>
          </div>
        }
      />

      <main className="mx-auto max-w-6xl pt-20">
        {!selectedListing ? (
          <RestaurantMarketplace
            restaurants={restaurants.data?.items ?? []}
            loading={restaurants.isLoading}
            onSelect={(id) => {
              const listing = restaurants.data?.items.find((item) => item.id === id)
              if (listing) setSelectedListing(listing)
            }}
          />
        ) : (
          <RestaurantMenu
            data={menu.data ?? null}
            loading={menu.isLoading}
            onBack={() => {
              setSelectedListing(null)
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
              <p className="text-xs font-bold uppercase text-on-surface-variant">
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
        selectedRestaurant.deliveryEnabled ? (
          <CheckoutSheet
            restaurant={selectedRestaurant}
            cart={cart.items}
            subtotal={cart.subtotal}
            onClose={() => setCheckoutOpen(false)}
            onQuantity={cart.updateQuantity}
            onSuccess={(shortId) => router.push(`/pedidos/${shortId}`)}
          />
        ) : (
          <WhatsappCheckoutSheet
            restaurant={selectedRestaurant}
            cart={cart.items}
            subtotal={cart.subtotal}
            onClose={() => setCheckoutOpen(false)}
            onQuantity={cart.updateQuantity}
            onSent={() => {
              cart.reset()
              setCheckoutOpen(false)
              setSelectedListing(null)
            }}
          />
        )
      )}
      <InstallPromptBanner />
    </div>
  )
}
