'use client'
import { customer } from '@/lib/api/client'
import { useIdempotencyKey } from '@/lib/idempotency/use-idempotency-key'
import { useMutation, useQuery } from '@tanstack/react-query'
import type { Customer } from '@tindivo/contracts'
import { BottomActionBar, Button, Icon, IconButton, Input, Label } from '@tindivo/ui'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useCustomerAuth } from '../../auth/hooks/use-customer-auth'
import type { CartItem } from '../hooks/use-cart'
import { lineTotal, parseMoney } from '../lib/pricing'
import { type Coords, locate } from '../services/geolocation'

const PHONE_RE = /^9\d{8}$/

type Props = {
  restaurant: Customer.PublicRestaurantSummary
  cart: CartItem[]
  subtotal: number
  onClose: () => void
  onQuantity: (key: string, delta: number) => void
  onSuccess: (shortId: string) => void
}

/**
 * Bottom sheet de checkout: datos de entrega, geolocalización y método de pago.
 * Igual que `product-sheet.tsx`, el panel necesita `relative z-10` para
 * recibir clicks por encima del backdrop.
 */
export function CheckoutSheet({
  restaurant,
  cart,
  subtotal,
  onClose,
  onQuantity,
  onSuccess,
}: Props) {
  const { session } = useCustomerAuth()
  const profileQuery = useQuery({
    queryKey: ['customer', 'profile'],
    queryFn: () => customer.getMyProfile(),
    enabled: session?.roles.includes('customer') ?? false,
  })
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [reference, setReference] = useState('')
  const [coords, setCoords] = useState<Coords | null>(null)
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [locating, setLocating] = useState(false)
  const [payment, setPayment] = useState<'pending_yape' | 'pending_cash'>('pending_yape')
  const [paysWith, setPaysWith] = useState('')
  const [profilePrefilled, setProfilePrefilled] = useState(false)

  // Si el cliente tiene sesión + perfil con datos guardados, prefill al
  // abrir el sheet la primera vez. No volvemos a pisar lo que el usuario
  // ya empezó a editar (profilePrefilled flag).
  useEffect(() => {
    if (profilePrefilled) return
    const p = profileQuery.data?.profile
    if (!p) return
    if (p.fullName) setName(p.fullName)
    if (p.phone) setPhone(p.phone)
    if (p.defaultAddress) setAddress(p.defaultAddress)
    if (p.defaultReference) setReference(p.defaultReference)
    if (p.defaultCoordinates) setCoords(p.defaultCoordinates)
    if (p.defaultLocationAccuracyM != null) setAccuracy(p.defaultLocationAccuracyM)
    setProfilePrefilled(true)
  }, [profileQuery.data, profilePrefilled])
  // UUID v4 que viaja en header Idempotency-Key. Sobrevive recargas accidentales
  // por sessionStorage. Se descarta tras 2xx/4xx para que un pedido posterior
  // (siguiente checkout del mismo cliente) tenga su propia key.
  const idem = useIdempotencyKey('customer:checkout')
  const create = useMutation({
    mutationFn: (body: Customer.CreateCustomerOrderRequest) =>
      customer.createOrder(body, { idempotencyKey: idem.key }),
    onSuccess: (data) => {
      idem.consume()
      onSuccess(data.shortId)
    },
    onError: (err) => {
      // 4xx: error final del servidor. Consume para permitir un nuevo intento
      // con datos corregidos. 5xx: NO consumir — retry con misma key es seguro
      // (el server cachea solo respuestas <500).
      const status = (err as { status?: number })?.status
      if (status !== undefined && status >= 400 && status < 500) idem.consume()
    },
  })

  const cashNumber = parseMoney(paysWith)
  const valid =
    name.trim().length >= 2 &&
    PHONE_RE.test(phone) &&
    address.trim().length >= 5 &&
    coords &&
    (payment !== 'pending_cash' || cashNumber >= subtotal)

  async function fetchLocation() {
    setLocating(true)
    try {
      const result = await locate()
      setCoords(result.coords)
      setAccuracy(result.accuracy)
    } catch {
      /* el botón queda en estado "Usar mi ubicación" para reintentar */
    } finally {
      setLocating(false)
    }
  }

  return (
    <div className="customer-sheet-overlay">
      <button type="button" aria-label="Cerrar" className="absolute inset-0" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 48, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 30, stiffness: 260 }}
        className="customer-sheet pb-36 md:w-[min(100%,44rem)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-[#fffaf6]/88 p-4 backdrop-blur-xl">
          <div className="mx-auto mb-3 customer-sheet-handle md:hidden" />
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-on-surface-variant">Tu pedido</p>
              <h2 className="text-2xl font-black leading-tight">{restaurant.name}</h2>
            </div>
            <IconButton variant="subtle" onClick={onClose} aria-label="Cerrar">
              <Icon name="close" />
            </IconButton>
          </div>
        </div>

        <div className="mx-auto max-w-xl space-y-5 px-5">
          <section className="customer-panel-soft space-y-3 rounded-[28px] p-4">
            <SheetTitle icon="shopping_bag" title="Resumen" />
            {cart.map((item) => (
              <div key={item.key} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold truncate">{item.menuItem.name}</p>
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
                  <span className="w-7 text-center font-black text-sm">{item.quantity}</span>
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

          <section className="customer-panel-soft space-y-4 rounded-[28px] p-4">
            <SheetTitle icon="home_pin" title="Datos de entrega" />
            <Field label="Nombre">
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Tu nombre"
                autoComplete="name"
              />
            </Field>
            <Field label="Celular">
              <Input
                value={phone}
                onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 9))}
                placeholder="9 digitos"
                inputMode="numeric"
                autoComplete="tel"
              />
            </Field>
            <Field label="Direccion">
              <Input
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Calle, numero, referencia corta"
                autoComplete="street-address"
              />
            </Field>
            <Field label="Referencia">
              <textarea
                value={reference}
                onChange={(event) => setReference(event.target.value.slice(0, 500))}
                rows={3}
                className="customer-textarea"
                placeholder="Frente a, piso, color de puerta..."
              />
            </Field>
            <button
              type="button"
              onClick={fetchLocation}
              disabled={locating}
              className="customer-lift flex w-full items-center justify-between gap-3 rounded-[22px] border border-outline-variant/25 bg-surface-container px-4 py-3 text-left"
            >
              <span>
                <span className="block font-bold">
                  {coords ? 'Ubicacion lista' : 'Usar mi ubicacion actual'}
                </span>
                <span className="block text-sm text-on-surface-variant">
                  {coords
                    ? `Precision aproximada ${Math.round(accuracy ?? 0)} m`
                    : 'Necesaria para que el motorizado llegue directo'}
                </span>
              </span>
              <Icon
                name={locating ? 'progress_activity' : 'my_location'}
                className={locating ? 'animate-spin' : undefined}
              />
            </button>
          </section>

          <section className="customer-panel-soft space-y-3 rounded-[28px] p-4">
            <SheetTitle icon="payments" title="Pago" />
            <div className="grid grid-cols-2 gap-2">
              <PaymentButton
                active={payment === 'pending_yape'}
                icon="qr_code_2"
                label="Yape"
                onClick={() => setPayment('pending_yape')}
              />
              <PaymentButton
                active={payment === 'pending_cash'}
                icon="payments"
                label="Efectivo"
                onClick={() => setPayment('pending_cash')}
              />
            </div>
            {payment === 'pending_cash' && (
              <div className="customer-reveal space-y-2">
                <Label>Pagare con</Label>
                <Input
                  value={paysWith}
                  onChange={(event) => setPaysWith(event.target.value)}
                  placeholder="Ej: 50.00"
                  inputMode="decimal"
                />
                {cashNumber >= subtotal && (
                  <p className="customer-reveal text-sm font-bold text-emerald-700">
                    Vuelto: S/ {(cashNumber - subtotal).toFixed(2)}
                  </p>
                )}
              </div>
            )}
          </section>

          {create.error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
              {create.error instanceof Error ? create.error.message : 'No se pudo crear el pedido'}
            </div>
          )}
        </div>

        <BottomActionBar zIndex={80}>
          <Button
            size="lg"
            className="w-full"
            disabled={!valid || create.isPending}
            onClick={() => {
              if (!coords) return
              create.mutate({
                restaurantId: restaurant.id,
                customerName: name.trim(),
                customerPhone: phone,
                deliveryAddress: address.trim(),
                deliveryReference: reference.trim() || undefined,
                deliveryCoordinates: coords,
                locationAccuracyM: accuracy ?? undefined,
                paymentStatus: payment,
                clientPaysWith: payment === 'pending_cash' ? cashNumber : undefined,
                items: cart.map((item) => ({
                  menuItemId: item.menuItem.id,
                  quantity: item.quantity,
                  modifiers: item.modifiers,
                  notes: item.notes.trim() || undefined,
                })),
              })
            }}
          >
            {create.isPending ? 'Creando pedido...' : `Pedir por S/ ${subtotal.toFixed(2)}`}
            <Icon
              name={create.isPending ? 'progress_activity' : 'arrow_forward'}
              className={create.isPending ? 'animate-spin' : undefined}
            />
          </Button>
        </BottomActionBar>
      </motion.div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function SheetTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <h3 className="flex items-center gap-2 text-lg font-black">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary-fixed text-on-primary-fixed">
        <Icon name={icon} size={20} filled />
      </span>
      {title}
    </h3>
  )
}

function PaymentButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean
  icon: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`customer-lift flex h-14 items-center justify-center gap-2 rounded-[20px] border font-black ${
        active
          ? 'bg-primary-container text-white border-primary-container'
          : 'bg-surface-container text-on-surface border-outline-variant/25'
      }`}
    >
      <Icon name={icon} filled={active} />
      {label}
    </button>
  )
}
