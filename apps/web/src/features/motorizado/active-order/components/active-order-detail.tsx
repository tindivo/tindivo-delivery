'use client'
import { useGeolocatedNavigation } from '@/shared/hooks/use-geolocated-navigation'
import { useNow } from '@/shared/hooks/use-now'
import { ApiError } from '@tindivo/api-client'
import type { Orders } from '@tindivo/contracts'
import { buildWaMeUrl, normalizeToE164Pe } from '@tindivo/core'
import { BottomActionBar, Button, ColorDot, GlassTopBar, Icon, IconButton } from '@tindivo/ui'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { RejectAssignmentSheet } from '../../available-orders/components/reject-assignment-sheet'
import { useAcceptOrder } from '../../available-orders/hooks/use-accept-order'
import { useRejectOrder } from '../../available-orders/hooks/use-reject-order'
import { useDriverSupportPhone } from '../hooks/use-driver-support-phone'
import { useMarkArrived } from '../hooks/use-mark-arrived'
import { useMarkDelivered } from '../hooks/use-mark-delivered'
import { useMarkPickedUp } from '../hooks/use-mark-picked-up'
import { useMarkReceived } from '../hooks/use-mark-received'
import { useOrderDetail } from '../hooks/use-order-detail'
import { useSaveCustomerData } from '../hooks/use-save-customer-data'
import { ChangePaymentMethodModal } from './change-payment-method-modal'
import { ConfirmPickupModal } from './confirm-pickup-modal'
import { CustomerDataForm } from './customer-data-form'
import { MarkDeliveredSheet } from './mark-delivered-sheet'
import { YapeQrCard } from './yape-qr-card'

const PHONE_REGEX = /^9\d{8}$/

type Props = { orderId: string }

export function ActiveOrderDetail({ orderId }: Props) {
  const router = useRouter()
  const { data: order, isLoading } = useOrderDetail(orderId)
  const arrived = useMarkArrived(orderId)
  const received = useMarkReceived(orderId)
  const delivered = useMarkDelivered(orderId)
  const pickedUp = useMarkPickedUp(orderId)
  const acceptOrder = useAcceptOrder()
  const rejectOrder = useRejectOrder()
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectError, setRejectError] = useState<string | null>(null)
  const saveCustomerData = useSaveCustomerData(orderId)
  const now = useNow(1_000)
  const { navigate: navigateMaps, isLocating } = useGeolocatedNavigation()
  const [changePaymentOpen, setChangePaymentOpen] = useState(false)
  const [confirmPickupOpen, setConfirmPickupOpen] = useState(false)
  const [markDeliveredOpen, setMarkDeliveredOpen] = useState(false)
  const [pickupError, setPickupError] = useState<string | null>(null)
  const [paymentDetailsOpen, setPaymentDetailsOpen] = useState(false)
  const receivedFiredRef = useRef(false)
  const supportPhoneQuery = useDriverSupportPhone()

  // Estado del form mientras el driver edita; vive solo en memoria. La fuente
  // de verdad son los datos persistidos en BD (order.client_phone +
  // order.delivery_lat/lng + order.delivery_reference). Sin localStorage —
  // eliminado por bug de iOS al cambiar entre pedidos (drafts cruzaban entre
  // orders distintos).
  const [phoneDraft, setPhoneDraft] = useState('')
  const [coordsDraft, setCoordsDraft] = useState<{ lat: number; lng: number } | null>(null)
  const [referenceDraft, setReferenceDraft] = useState('')
  const [isEditingCustomerData, setIsEditingCustomerData] = useState(false)
  const draftHydratedRef = useRef<string | null>(null)

  // Auto-marca received en background al primer mount en waiting_at_restaurant.
  // Preserva la métrica `received_at` como "driver llegó y la PWA cargó".
  // Idempotente — el dominio ignora si ya estaba seteado.
  useEffect(() => {
    // biome-ignore lint/suspicious/noExplicitAny: payload dinámico con columnas anidadas
    const raw = order as any
    if (raw?.status !== 'waiting_at_restaurant') return
    if (raw?.received_at) return
    if (receivedFiredRef.current) return
    receivedFiredRef.current = true
    received.mutate()
  }, [order, received.mutate])

  // Hidrata el form local desde la BD una sola vez por orderId. Si todavía no
  // hay datos guardados (phone + (coords O referencia)), abre el modo edición;
  // si ya están, muestra el countdown directamente.
  useEffect(() => {
    if (!order) return
    if (draftHydratedRef.current === orderId) return
    // biome-ignore lint/suspicious/noExplicitAny: payload dinámico con columnas anidadas
    const raw = order as any
    if (raw.status !== 'waiting_at_restaurant') return
    draftHydratedRef.current = orderId
    const phone = typeof raw.client_phone === 'string' ? raw.client_phone : ''
    const lat = raw.delivery_lat
    const lng = raw.delivery_lng
    const coords = typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : null
    const reference = typeof raw.delivery_reference === 'string' ? raw.delivery_reference : ''
    setPhoneDraft(phone)
    setCoordsDraft(coords)
    setReferenceDraft(reference)
    setIsEditingCustomerData(!(phone && (coords || reference.length > 0)))
  }, [order, orderId])

  const restaurantCoords = useMemo<{ lat: number; lng: number } | null>(() => {
    // biome-ignore lint/suspicious/noExplicitAny: payload dinámico con columnas anidadas
    const r = (order as any)?.restaurants
    const lat = r?.coordinates_lat
    const lng = r?.coordinates_lng
    if (typeof lat !== 'number' || typeof lng !== 'number') return null
    return { lat, lng }
  }, [order])

  if (isLoading || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Icon name="progress_activity" size={36} className="animate-spin text-primary" />
      </div>
    )
  }

  // biome-ignore lint/suspicious/noExplicitAny: payload dinámico con columnas anidadas (restaurants, payment, etc.)
  const raw = order as any
  const status = raw.status as string
  const restaurant = raw.restaurants ?? {}
  const clientPhone: string | null = raw.client_phone ?? null
  const persistedCoords: boolean =
    typeof raw.delivery_lat === 'number' && typeof raw.delivery_lng === 'number'
  const persistedReference: string | null =
    typeof raw.delivery_reference === 'string' && raw.delivery_reference.length > 0
      ? raw.delivery_reference
      : null
  const hasCustomerData = Boolean(clientPhone) && (persistedCoords || persistedReference !== null)
  const phoneValid = PHONE_REGEX.test(phoneDraft)
  const hasMapCoords = coordsDraft !== null
  const hasReference = referenceDraft.trim().length > 0
  const formValid = phoneValid && (hasMapCoords || hasReference)
  const estimatedReadyAt = raw.estimated_ready_at
    ? new Date(raw.estimated_ready_at as string)
    : null
  const remainingMs = estimatedReadyAt ? Math.max(0, estimatedReadyAt.getTime() - now.getTime()) : 0
  const prepReady = remainingMs <= 0
  const remainingMinutes = Math.floor(remainingMs / 60_000)
  const remainingSeconds = Math.floor((remainingMs % 60_000) / 1_000)
  const remainingLabel = `${remainingMinutes}:${remainingSeconds.toString().padStart(2, '0')}`
  const clientWaUrl: string | null = clientPhone
    ? buildWaMeUrl(
        normalizeToE164Pe(clientPhone) ?? `51${clientPhone}`,
        `Hola, soy el motorizado de tu pedido #${raw.short_id}, voy en camino con tu pedido.`,
      )
    : null
  const currentPhase = currentPhaseForStatus(status, {
    hasCustomerData,
    isEditingCustomerData,
    prepReady,
  })
  const supportPhone = supportPhoneQuery.data ? supportPhoneQuery.data.phone : '906550166'

  return (
    <div
      className="min-h-screen relative"
      style={{ paddingBottom: 'calc(190px + env(safe-area-inset-bottom))' }}
    >
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none -z-10"
        style={{
          background: 'linear-gradient(180deg, #fffdf9 0%, #f7faf7 58%, #f3f8f4 100%)',
        }}
      />
      <GlassTopBar
        title="PEDIDO"
        subtitle="Motorizado"
        left={
          <IconButton variant="ghost" onClick={() => router.back()} aria-label="Volver">
            <Icon name="arrow_back" />
          </IconButton>
        }
        right={
          <IconButton
            variant="ghost"
            onClick={() => router.push('/motorizado')}
            aria-label="Ir al inicio"
          >
            <Icon name="home" />
          </IconButton>
        }
      />

      <main className="pt-24 px-4 max-w-md mx-auto space-y-3">
        {/* PhaseHero — SIEMPRE primera card en cada pantalla. El driver lee la
            fase y la métrica accionable antes que nada más. Resto del layout
            (identidad, cobro, ruta) se subordina visualmente. */}
        <PhaseHero
          status={status}
          phase={currentPhase}
          acceptedAt={raw.accepted_at ?? null}
          now={now}
          prepReady={prepReady}
          remainingLabel={remainingLabel}
          isEditingCustomerData={isEditingCustomerData}
          paymentStatus={raw.payment_status}
          orderAmount={Number(raw.order_amount)}
          yapeAmount={raw.yape_amount != null ? Number(raw.yape_amount) : null}
          cashAmount={raw.cash_amount != null ? Number(raw.cash_amount) : null}
          clientPaysWith={raw.client_pays_with != null ? Number(raw.client_pays_with) : null}
          changeToGive={raw.change_to_give != null ? Number(raw.change_to_give) : null}
        />

        {/* Header de identificación — 1 línea densa: restaurante + cliente + shortId.
            Después del PhaseHero, sirve solo como anclaje contextual. */}
        <section className="bg-surface-container-lowest rounded-2xl px-4 py-2.5 border border-outline-variant/20">
          <div className="flex items-center gap-2 min-w-0">
            <ColorDot color={restaurant.accent_color ?? 'ab3500'} />
            <div className="min-w-0 flex-1 flex items-baseline gap-1.5">
              <h1 className="font-black text-sm leading-tight text-on-surface truncate">
                {restaurant.name}
              </h1>
              {raw.client_name && (
                <span className="text-xs text-on-surface-variant truncate">
                  · {raw.client_name}
                </span>
              )}
            </div>
            <span className="shrink-0 text-[11px] font-black font-mono text-on-surface-variant">
              #{raw.short_id}
            </span>
          </div>
        </section>

        {/* Resumen de cobro pre-picked_up — el driver lo necesita ANTES de salir
            para preparar el vuelto en su bolsa. En picked_up se oculta porque la
            info migra al PhaseHero como métrica principal. */}
        {Number(raw.order_amount) > 0 && status !== 'picked_up' && (
          <PaymentBreakdown
            amount={Number(raw.order_amount)}
            paymentStatus={raw.payment_status}
            yapeAmount={raw.yape_amount != null ? Number(raw.yape_amount) : null}
            cashAmount={raw.cash_amount != null ? Number(raw.cash_amount) : null}
            clientPaysWith={raw.client_pays_with != null ? Number(raw.client_pays_with) : null}
            changeToGive={raw.change_to_give != null ? Number(raw.change_to_give) : null}
            expanded={paymentDetailsOpen}
            onToggle={() => setPaymentDetailsOpen((value) => !value)}
          />
        )}

        {/* Cambiar método de pago — solo en picked_up, antes de marcar entregado.
            Caso real: cliente cambia de idea en la puerta y dice "mejor te pago
            efectivo" (o viceversa, o decide hacer split mixto). */}
        {status === 'picked_up' && raw.payment_status !== 'prepaid' && (
          <button
            type="button"
            onClick={() => setChangePaymentOpen(true)}
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest text-sm font-bold text-on-surface active:scale-[0.98] transition-transform"
          >
            <Icon name="swap_horiz" size={18} />
            Cambiar método de pago
          </button>
        )}

        {/* Restaurante: dirección + navegar */}
        {['waiting_driver', 'heading_to_restaurant', 'waiting_at_restaurant'].includes(status) && (
          <section className="bg-surface-container-lowest rounded-[24px] p-4 border border-outline-variant/15 shadow-[0_4px_20px_rgba(171,53,0,0.04)]">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-fixed text-primary">
                <Icon name="storefront" size={20} filled />
              </span>
              <div className="min-w-0">
                <h3 className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant">
                  Recoger en el local
                </h3>
                <p className="mt-0.5 text-sm font-semibold leading-snug text-on-surface">
                  {restaurant.address}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Datos del cliente — durante waiting_at_restaurant.
            - Si todavía no hay datos guardados o el driver pidió editar:
              muestra el form. El botón "Guardar" persiste en BD sin cambiar
              status (queda en waiting_at_restaurant).
            - Si ya hay datos guardados: muestra resumen + countdown del
              tiempo de prep. El botón "Ya recogí el pedido" transiciona a
              picked_up (con confirmación si aún no llegó a cero). */}
        {status === 'waiting_at_restaurant' && isEditingCustomerData && (
          <CustomerDataForm
            phone={phoneDraft}
            onPhoneChange={(value) => setPhoneDraft(value.replace(/\D/g, '').slice(0, 9))}
            coords={coordsDraft}
            onCoordsChange={setCoordsDraft}
            reference={referenceDraft}
            onReferenceChange={setReferenceDraft}
            restaurantCoords={restaurantCoords}
          />
        )}

        {/* Resumen del cliente cuando ya hay datos guardados. El countdown grande
            vive en PhaseHero — aquí solo memoria de los datos persistidos. */}
        {status === 'waiting_at_restaurant' && !isEditingCustomerData && hasCustomerData && (
          <section className="bg-surface-container-lowest rounded-[24px] p-4 border border-outline-variant/15 space-y-2">
            <header className="flex items-center justify-between">
              <h3 className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant">
                Datos del cliente
              </h3>
              <button
                type="button"
                onClick={() => setIsEditingCustomerData(true)}
                className="inline-flex items-center gap-1 text-xs font-bold text-primary-container active:scale-95"
              >
                <Icon name="edit" size={14} />
                Editar
              </button>
            </header>

            <div className="space-y-1.5 text-sm">
              <div className="flex items-center gap-2 text-on-surface">
                <Icon name="call" size={14} className="text-on-surface-variant" />
                <span className="font-mono">+51 {clientPhone}</span>
              </div>
              {persistedCoords && (
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <Icon name="location_on" size={14} />
                  <span className="font-mono text-xs">
                    {Number(raw.delivery_lat).toFixed(6)}, {Number(raw.delivery_lng).toFixed(6)}
                  </span>
                </div>
              )}
              {persistedReference && (
                <div className="flex items-start gap-2 text-on-surface">
                  <Icon name="pin_drop" size={14} className="mt-0.5 shrink-0 text-primary" />
                  <span className="text-xs leading-snug">{persistedReference}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Cliente: contacto + referencia textual.
            Cuando el driver guardó solo la referencia (sin coords) durante
            waiting_at_restaurant, esta es la única pista visual para ubicar
            el destino — por eso se destaca con su propia card e ícono
            pin_drop. La navegación GPS (botón "Abrir en Google Maps") vive
            en el BottomActionBar y solo aparece si hay coords. */}
        {status === 'picked_up' && persistedReference && (
          <section className="bg-surface-container-lowest rounded-[28px] p-4 border border-outline-variant/15 shadow-[0_4px_20px_rgba(171,53,0,0.04)] space-y-3">
            <h3 className="text-xs font-bold tracking-widest uppercase text-on-surface-variant">
              Destino del cliente
            </h3>
            {persistedReference && (
              <div className="rounded-2xl border border-outline-variant/30 bg-surface-container/40 p-3 flex items-start gap-2.5">
                <Icon name="pin_drop" size={20} className="text-primary shrink-0 mt-0.5" filled />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant mb-0.5">
                    Referencia
                  </div>
                  <p className="text-sm text-on-surface leading-snug whitespace-pre-wrap break-words">
                    {persistedReference}
                  </p>
                </div>
              </div>
            )}
          </section>
        )}

        {/* QR Yape — al entregar cuando hay parte (o todo) por Yape pendiente.
            En pending_mixed muestra solo la porción yape_amount. */}
        {status === 'picked_up' &&
          (raw.payment_status === 'pending_yape' || raw.payment_status === 'pending_mixed') && (
            <YapeQrCard
              qrUrl={restaurant.qr_url ?? null}
              qrUrlSecondary={restaurant.qr_url_secondary ?? null}
              yapeNumber={restaurant.yape_number ?? null}
              amount={
                raw.payment_status === 'pending_mixed'
                  ? Number(raw.yape_amount)
                  : Number(raw.order_amount)
              }
              restaurantName={restaurant.name ?? 'Restaurante'}
            />
          )}

        <OrderSupportContacts
          restaurantName={restaurant.name ?? 'Restaurante'}
          restaurantPhone={restaurant.phone ?? null}
          supportPhone={supportPhone}
        />
      </main>

      {changePaymentOpen && (
        <ChangePaymentMethodModal
          orderId={orderId}
          orderAmount={Number(raw.order_amount)}
          currentStatus={raw.payment_status}
          onClose={() => setChangePaymentOpen(false)}
        />
      )}

      {confirmPickupOpen && (
        <ConfirmPickupModal
          remainingLabel={remainingLabel}
          prepNotReady={!prepReady}
          isPending={pickedUp.isPending}
          errorMessage={pickupError}
          onCancel={() => {
            setConfirmPickupOpen(false)
            setPickupError(null)
          }}
          onConfirm={({ occupancySlots, deliveryDistanceBand }) => {
            setPickupError(null)
            pickedUp.mutate(
              { occupancySlots, deliveryDistanceBand },
              {
                onSuccess: () => setConfirmPickupOpen(false),
                onError: (err) =>
                  setPickupError(
                    err instanceof Error
                      ? err.message
                      : 'No se pudo confirmar el pickup. Intenta de nuevo.',
                  ),
              },
            )
          }}
        />
      )}

      {rejectOpen && (
        <RejectAssignmentSheet
          isPending={rejectOrder.isPending}
          errorMessage={rejectError}
          onCancel={() => {
            setRejectOpen(false)
            setRejectError(null)
          }}
          onConfirm={(reason: Orders.RejectionReason) => {
            setRejectError(null)
            rejectOrder.mutate(
              { orderId, reason },
              {
                onSuccess: () => {
                  setRejectOpen(false)
                  router.replace('/motorizado')
                },
                onError: (err) => {
                  if (err instanceof ApiError && err.problem.code === 'INVALID_STATE_TRANSITION') {
                    setRejectError('Este pedido ya cambió de estado. Recarga la lista.')
                  } else if (
                    err instanceof ApiError &&
                    err.problem.code === 'DRIVER_NOT_ASSIGNED'
                  ) {
                    setRejectError('Este pedido ya no está asignado a ti.')
                  } else {
                    setRejectError('No pudimos rechazar el pedido. Intenta de nuevo.')
                  }
                },
              },
            )
          }}
        />
      )}

      <BottomActionBar>
        {status === 'waiting_driver' && (
          <div className="flex flex-col gap-2 w-full">
            <Button
              size="lg"
              className="w-full"
              disabled={acceptOrder.isPending || rejectOrder.isPending}
              onClick={() => acceptOrder.mutate(orderId)}
            >
              <Icon name="check_circle" size={22} filled />
              {acceptOrder.isPending ? 'Aceptando...' : 'Aceptar pedido'}
            </Button>
            <button
              type="button"
              disabled={acceptOrder.isPending || rejectOrder.isPending}
              onClick={() => {
                setRejectError(null)
                setRejectOpen(true)
              }}
              className="w-full inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-surface-container border border-outline-variant/40 text-on-surface font-bold tracking-wide active:scale-95 disabled:opacity-60"
            >
              <Icon name="cancel" size={20} />
              Rechazar pedido
            </button>
          </div>
        )}

        {status === 'heading_to_restaurant' && (
          <>
            <button
              type="button"
              onClick={() => navigateMaps(buildRestaurantDestination(restaurant))}
              disabled={isLocating}
              className="w-full inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-surface-container-lowest border border-outline-variant/40 text-on-surface font-bold tracking-wide transition-all duration-300 active:scale-95 disabled:opacity-60"
            >
              <Icon
                name={isLocating ? 'progress_activity' : 'navigation'}
                size={20}
                filled
                className={isLocating ? 'animate-spin' : undefined}
              />
              {isLocating ? 'Ubicando...' : 'Abrir en Google Maps'}
            </button>
            <Button
              size="lg"
              className="w-full"
              disabled={arrived.isPending}
              onClick={() => arrived.mutate()}
            >
              <Icon name="check" />
              Llegué al local
            </Button>
          </>
        )}

        {status === 'waiting_at_restaurant' && (
          <>
            {pickupError && !confirmPickupOpen && (
              <div className="w-full p-3 rounded-2xl bg-red-50 border border-red-200 text-xs font-semibold text-red-800">
                {pickupError}
              </div>
            )}

            {isEditingCustomerData ? (
              <Button
                size="lg"
                className="w-full"
                disabled={saveCustomerData.isPending || !formValid}
                onClick={() => {
                  const trimmedReference = referenceDraft.trim()
                  saveCustomerData.mutate(
                    {
                      clientPhone: phoneDraft,
                      deliveryCoordinates: coordsDraft ?? undefined,
                      deliveryReference: trimmedReference || undefined,
                    },
                    { onSuccess: () => setIsEditingCustomerData(false) },
                  )
                }}
              >
                <Icon name="save" size={22} filled />
                {saveCustomerData.isPending
                  ? 'Guardando...'
                  : formValid
                    ? 'Guardar'
                    : 'Completa los datos del cliente'}
              </Button>
            ) : (
              <Button
                size="lg"
                className="w-full"
                disabled={!hasCustomerData || pickedUp.isPending}
                onClick={() => {
                  setPickupError(null)
                  // Siempre abrimos el modal: el driver debe declarar cuánto
                  // ocupa el pedido en su mochila (`occupancySlots`) para
                  // que las reglas R3 cuenten slots y no filas.
                  setConfirmPickupOpen(true)
                }}
              >
                <Icon name="shopping_bag" size={22} filled />
                {pickedUp.isPending ? 'Confirmando...' : 'Ya recogí el pedido'}
              </Button>
            )}
          </>
        )}

        {status === 'picked_up' && (
          <>
            {clientPhone && (
              <div className="flex w-full gap-2">
                <a
                  href={`tel:+51${clientPhone}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 h-12 px-4 rounded-xl bg-surface-container-lowest border border-outline-variant/40 text-on-surface font-bold tracking-wide transition-all duration-300 active:scale-95"
                >
                  <Icon name="call" size={20} filled />
                  Llamar al cliente
                </a>
                {clientWaUrl && (
                  <a
                    href={clientWaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Abrir WhatsApp con el cliente"
                    className="flex-none w-20 inline-flex items-center justify-center h-12 rounded-xl bg-emerald-500 text-white shadow-[0_4px_20px_rgba(16,185,129,0.25)] transition-all duration-300 active:scale-95"
                  >
                    <Icon name="phone_in_talk" size={22} filled />
                  </a>
                )}
              </div>
            )}
            {hasDeliveryCoords(raw) && (
              <button
                type="button"
                onClick={() => navigateMaps({ lat: raw.delivery_lat, lng: raw.delivery_lng })}
                disabled={isLocating}
                className="w-full inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-surface-container-lowest border border-outline-variant/40 text-on-surface font-bold tracking-wide transition-all duration-300 active:scale-95 disabled:opacity-60"
              >
                <Icon
                  name={isLocating ? 'progress_activity' : 'navigation'}
                  size={20}
                  filled
                  className={isLocating ? 'animate-spin' : undefined}
                />
                {isLocating ? 'Ubicando...' : 'Abrir en Google Maps'}
              </button>
            )}
            <Button
              size="lg"
              variant="success"
              className="w-full"
              disabled={delivered.isPending}
              onClick={() => setMarkDeliveredOpen(true)}
            >
              <Icon name="check_circle" filled />
              Pedido entregado
            </Button>
          </>
        )}
      </BottomActionBar>
      {markDeliveredOpen &&
        (() => {
          // biome-ignore lint/suspicious/noExplicitAny: row dinámico de orders
          const o = order as any
          return (
            <MarkDeliveredSheet
              orderId={orderId}
              orderAmount={Number(o?.order_amount ?? 0)}
              paymentStatus={o?.payment_status ?? 'pending_cash'}
              changeToGive={o?.change_to_give != null ? Number(o.change_to_give) : null}
              clientPaysWith={o?.client_pays_with != null ? Number(o.client_pays_with) : null}
              cashAmount={o?.cash_amount != null ? Number(o.cash_amount) : null}
              yapeAmount={o?.yape_amount != null ? Number(o.yape_amount) : null}
              onClose={() => setMarkDeliveredOpen(false)}
            />
          )
        })()}
    </div>
  )
}

type CurrentPhase = {
  eyebrow: string
  label: string
  description: string
  icon: string
  tone: 'brand' | 'warning' | 'success' | 'neutral'
}

function currentPhaseForStatus(
  status: string,
  context: {
    hasCustomerData: boolean
    isEditingCustomerData: boolean
    prepReady: boolean
  },
): CurrentPhase {
  switch (status) {
    case 'waiting_driver':
      return {
        eyebrow: 'Momento actual',
        label: 'Confirma el pedido',
        description: 'Acepta si puedes tomarlo ahora; si no, recházalo para liberarlo.',
        icon: 'task_alt',
        tone: 'brand',
      }
    case 'heading_to_restaurant':
      return {
        eyebrow: 'Momento actual',
        label: 'Ve al restaurante',
        description: 'Abre Maps si lo necesitas y marca llegada cuando estés en el local.',
        icon: 'navigation',
        tone: 'brand',
      }
    case 'waiting_at_restaurant':
      if (context.isEditingCustomerData || !context.hasCustomerData) {
        return {
          eyebrow: 'Momento actual',
          label: 'Registra datos del cliente',
          description: 'Copia el teléfono y destino del papel físico antes de recoger.',
          icon: 'edit_location_alt',
          tone: 'warning',
        }
      }
      return {
        eyebrow: 'Momento actual',
        label: context.prepReady ? 'Recoge el pedido' : 'Espera en el local',
        description: context.prepReady
          ? 'Cuando tengas la bolsa en mano, confirma la recogida.'
          : 'Mantén los datos listos y confirma apenas te entreguen la bolsa.',
        icon: context.prepReady ? 'shopping_bag' : 'hourglass_top',
        tone: context.prepReady ? 'success' : 'warning',
      }
    case 'picked_up':
      return {
        eyebrow: 'Momento actual',
        label: 'Entrega al cliente',
        description: 'Usa Maps o llama al cliente; confirma solo cuando entregues el pedido.',
        icon: 'delivery_dining',
        tone: 'success',
      }
    case 'delivered':
      return {
        eyebrow: 'Momento actual',
        label: 'Pedido entregado',
        description: 'Este pedido ya salió de tu cola activa.',
        icon: 'check_circle',
        tone: 'success',
      }
    default:
      return {
        eyebrow: 'Momento actual',
        label: 'Revisa el pedido',
        description: 'Sigue la acción principal indicada abajo.',
        icon: 'receipt_long',
        tone: 'neutral',
      }
  }
}

type PhaseTone = 'brand' | 'warning' | 'success' | 'neutral'

const PHASE_PALETTE: Record<
  PhaseTone,
  { bg: string; iconBg: string; border: string; color: string; metricBg: string }
> = {
  brand: {
    bg: 'linear-gradient(135deg, rgba(242, 98, 65, 0.14) 0%, rgba(255,255,255,0.96) 60%)',
    iconBg: 'linear-gradient(135deg, #F26241 0%, #FF9B63 100%)',
    border: 'rgba(242, 98, 65, 0.24)',
    color: '#9B2F18',
    metricBg: 'linear-gradient(135deg, #F26241 0%, #FF9B63 100%)',
  },
  warning: {
    bg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.16) 0%, rgba(255,255,255,0.96) 60%)',
    iconBg: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
    border: 'rgba(245, 158, 11, 0.26)',
    color: '#92400E',
    metricBg: 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)',
  },
  success: {
    bg: 'linear-gradient(135deg, rgba(5, 150, 105, 0.14) 0%, rgba(255,255,255,0.96) 60%)',
    iconBg: 'linear-gradient(135deg, #059669 0%, #14B8A6 100%)',
    border: 'rgba(5, 150, 105, 0.24)',
    color: '#065F46',
    metricBg: 'linear-gradient(135deg, #065F46 0%, #10B981 100%)',
  },
  neutral: {
    bg: 'linear-gradient(135deg, rgba(83, 96, 92, 0.1) 0%, rgba(255,255,255,0.96) 60%)',
    iconBg: 'linear-gradient(135deg, #53605C 0%, #7B8581 100%)',
    border: 'rgba(83, 96, 92, 0.18)',
    color: '#34403B',
    metricBg: 'linear-gradient(135deg, #34403B 0%, #53605C 100%)',
  },
}

type PhaseHeroProps = {
  status: string
  phase: CurrentPhase
  acceptedAt: string | null
  now: Date
  prepReady: boolean
  remainingLabel: string
  isEditingCustomerData: boolean
  paymentStatus: string
  orderAmount: number
  yapeAmount: number | null
  cashAmount: number | null
  clientPaysWith: number | null
  changeToGive: number | null
}

/**
 * PhaseHero — pieza central de la pantalla del motorizado. Combina la fase
 * actual con la métrica que importa AHORA: countdown en pre-pickup, cobro
 * desglosado en picked_up, "¡YA!" cuando la cocina termina. Reemplaza la
 * antigua trio CurrentPhaseCard + OrderTimingStrip + countdown grande del
 * waiting_at_restaurant para que el driver lea la pantalla en 1 segundo.
 */
function PhaseHero({
  status,
  phase,
  acceptedAt,
  now,
  prepReady,
  remainingLabel,
  isEditingCustomerData,
  paymentStatus,
  orderAmount,
  yapeAmount,
  cashAmount,
  clientPaysWith,
  changeToGive,
}: PhaseHeroProps) {
  const palette = PHASE_PALETTE[phase.tone]

  return (
    <section
      className="rounded-[28px] p-4 border shadow-[0_12px_36px_-24px_rgba(18,38,32,0.45)] overflow-hidden"
      style={{ background: palette.bg, borderColor: palette.border }}
    >
      <header className="flex items-center gap-3">
        <span
          className="shrink-0 inline-flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-[0_10px_24px_-14px_rgba(18,38,32,0.65)]"
          style={{ background: palette.iconBg }}
        >
          <Icon name={phase.icon} size={24} filled />
        </span>
        <div className="min-w-0 flex-1">
          <p
            className="text-[10px] font-black tracking-[0.2em] uppercase"
            style={{ color: palette.color }}
          >
            {phase.eyebrow}
          </p>
          <h2 className="mt-0.5 text-lg font-black leading-tight text-on-surface">{phase.label}</h2>
        </div>
      </header>

      <PhaseMetric
        status={status}
        palette={palette}
        acceptedAt={acceptedAt}
        now={now}
        prepReady={prepReady}
        remainingLabel={remainingLabel}
        isEditingCustomerData={isEditingCustomerData}
        paymentStatus={paymentStatus}
        orderAmount={orderAmount}
        yapeAmount={yapeAmount}
        cashAmount={cashAmount}
        clientPaysWith={clientPaysWith}
        changeToGive={changeToGive}
      />
    </section>
  )
}

type PhaseMetricProps = {
  status: string
  palette: (typeof PHASE_PALETTE)[PhaseTone]
  acceptedAt: string | null
  now: Date
  prepReady: boolean
  remainingLabel: string
  isEditingCustomerData: boolean
  paymentStatus: string
  orderAmount: number
  yapeAmount: number | null
  cashAmount: number | null
  clientPaysWith: number | null
  changeToGive: number | null
}

/**
 * Selecciona qué métrica destacar según la fase. Cada caso resuelve la
 * pregunta operativa que el driver tiene en ese momento.
 */
function PhaseMetric(props: PhaseMetricProps) {
  const { status, isEditingCustomerData, prepReady } = props

  // Editando datos del cliente — el form abajo es la métrica. No duplicamos timer aquí.
  if (status === 'waiting_at_restaurant' && isEditingCustomerData) return null

  // Entrega al cliente — cobro grande con vuelto y con cuánto paga.
  if (status === 'picked_up') return <PickupCobroMetric {...props} />

  // En el local, ya con datos: si llegó a 0 muestra "¡YA!" en verde; si no, countdown.
  if (status === 'waiting_at_restaurant') {
    return (
      <CountdownMetric
        label={prepReady ? 'Listo para recoger' : 'Falta para que esté listo'}
        value={prepReady ? '¡YA!' : props.remainingLabel}
        icon={prepReady ? 'check_circle' : 'schedule'}
        gradient={prepReady ? PHASE_PALETTE.success.metricBg : PHASE_PALETTE.warning.metricBg}
        helper={
          prepReady
            ? 'Cuando tengas la bolsa en mano, presiona "Ya recogí el pedido".'
            : 'Cuando el restaurante te entregue la bolsa, presiona "Ya recogí el pedido".'
        }
      />
    )
  }

  // Pre-acepted o en camino al local: countdown del prep + elapsed since accepted.
  return <PreparingMetric {...props} />
}

function CountdownMetric({
  label,
  value,
  icon,
  gradient,
  helper,
}: {
  label: string
  value: string
  icon: string
  gradient: string
  helper?: string
}) {
  return (
    <div
      className="mt-3 rounded-2xl p-4 text-center text-white shadow-[0_12px_28px_-12px_rgba(18,38,32,0.35)]"
      style={{ background: gradient }}
    >
      <div className="text-[10px] font-bold tracking-[0.22em] uppercase opacity-85">{label}</div>
      <div className="mt-1 inline-flex items-center justify-center gap-2">
        <Icon name={icon} size={28} filled className="opacity-90" />
        <span
          className="bleed-text text-5xl font-black font-mono tabular-nums leading-none"
          style={{ letterSpacing: '-0.02em' }}
        >
          {value}
        </span>
      </div>
      {helper && <div className="mt-2 text-[11px] opacity-90 leading-snug">{helper}</div>}
    </div>
  )
}

function PreparingMetric({
  acceptedAt,
  now,
  remainingLabel,
  prepReady,
}: Pick<PhaseMetricProps, 'acceptedAt' | 'now' | 'remainingLabel' | 'prepReady'>) {
  const gradient = prepReady ? PHASE_PALETTE.success.metricBg : PHASE_PALETTE.brand.metricBg
  return (
    <div
      className="mt-3 rounded-2xl p-4 text-white shadow-[0_12px_28px_-12px_rgba(18,38,32,0.35)]"
      style={{ background: gradient }}
    >
      <div className="text-center">
        <div className="text-[10px] font-bold tracking-[0.22em] uppercase opacity-85">
          {prepReady ? 'Listo en cocina' : 'Listo en'}
        </div>
        <div className="mt-1 inline-flex items-center justify-center gap-2">
          <Icon
            name={prepReady ? 'check_circle' : 'schedule'}
            size={28}
            filled
            className="opacity-90"
          />
          <span
            className="bleed-text text-5xl font-black font-mono tabular-nums leading-none"
            style={{ letterSpacing: '-0.02em' }}
          >
            {prepReady ? '¡YA!' : remainingLabel}
          </span>
        </div>
      </div>

      {acceptedAt && (
        <div className="mt-3 pt-3 border-t border-white/25 flex items-center justify-center gap-1.5 text-[11px] font-bold text-white">
          <Icon name="timer" size={13} filled className="opacity-85" />
          <span className="opacity-85">Aceptado hace</span>
          <span className="font-mono tabular-nums">{formatElapsedSince(acceptedAt, now)}</span>
        </div>
      )}
    </div>
  )
}

/**
 * Cobro en la entrega — la única decisión del driver aquí es "¿cómo cobro?".
 * Mostramos los 3 valores que necesita en una grilla densa pero clara:
 * cuánto cobrar, vuelto a dar, y con cuánto paga el cliente. Los rows se
 * adaptan al paymentStatus para no mostrar campos vacíos.
 */
function PickupCobroMetric({
  paymentStatus,
  orderAmount,
  yapeAmount,
  cashAmount,
  clientPaysWith,
  changeToGive,
}: Pick<
  PhaseMetricProps,
  'paymentStatus' | 'orderAmount' | 'yapeAmount' | 'cashAmount' | 'clientPaysWith' | 'changeToGive'
>) {
  if (paymentStatus === 'prepaid' || orderAmount === 0) {
    return (
      <div className="mt-3 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center gap-3 text-emerald-900">
        <Icon name="verified" size={22} filled />
        <div>
          <div className="text-[10px] font-bold tracking-widest uppercase text-emerald-800">
            Ya pagó
          </div>
          <div className="text-sm font-black">No cobres nada. Solo entrega.</div>
        </div>
      </div>
    )
  }

  const rows: Array<{ label: string; value: string; helper?: string; icon: string }> = []

  // Cobrar — siempre primero, la pregunta #1 del driver
  rows.push({
    label: 'Cobra',
    value: `S/ ${orderAmount.toFixed(2)}`,
    helper: paymentStatusShort(paymentStatus),
    icon: paymentStatus === 'pending_yape' ? 'qr_code_2' : 'payments',
  })

  // Vuelto — solo si hay cambio a dar (cash o mixed con paga con)
  if (changeToGive != null && changeToGive > 0) {
    rows.push({
      label: 'Vuelto',
      value: `S/ ${changeToGive.toFixed(2)}`,
      helper: 'que debes dar',
      icon: 'currency_exchange',
    })
  }

  // Paga con — solo si está registrado (cash y mixed)
  if (clientPaysWith != null) {
    rows.push({
      label: 'Paga con',
      value: `S/ ${clientPaysWith.toFixed(2)}`,
      helper: 'billete cliente',
      icon: 'account_balance_wallet',
    })
  }

  // Si es mixed mostramos también el split Yape/Efectivo abajo como sub-data
  const showSplit = paymentStatus === 'pending_mixed' && yapeAmount != null && cashAmount != null

  return (
    <div className="mt-3 space-y-2">
      <div className={rows.length === 1 ? 'grid grid-cols-1 gap-2' : 'grid grid-cols-3 gap-2'}>
        {rows.map((row, idx) => (
          <div
            key={row.label}
            className={
              idx === 0
                ? 'rounded-2xl px-3 py-3 text-white shadow-[0_10px_24px_-14px_rgba(5,150,105,0.55)]'
                : 'rounded-2xl border border-emerald-200 bg-emerald-50/70 px-3 py-3 text-emerald-950'
            }
            style={idx === 0 ? { background: PHASE_PALETTE.success.metricBg } : undefined}
          >
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider opacity-90">
              <Icon name={row.icon} size={13} filled />
              {row.label}
            </div>
            <div className="mt-1 text-xl font-black font-mono tabular-nums leading-none">
              {row.value}
            </div>
            {row.helper && (
              <div className="mt-1 text-[10px] font-semibold opacity-80 truncate">{row.helper}</div>
            )}
          </div>
        ))}
      </div>

      {showSplit && (
        <div className="rounded-xl bg-white/60 border border-outline-variant/20 px-3 py-2 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-on-surface-variant">
            <Icon name="splitscreen" size={14} filled />
            <span className="font-bold uppercase tracking-wider text-[10px]">Mixto</span>
          </div>
          <div className="flex items-center gap-3 font-mono tabular-nums">
            <span className="text-on-surface">
              <span className="text-[10px] uppercase font-bold text-on-surface-variant mr-1">
                Yape
              </span>
              S/ {yapeAmount.toFixed(2)}
            </span>
            <span className="text-on-surface">
              <span className="text-[10px] uppercase font-bold text-on-surface-variant mr-1">
                Cash
              </span>
              S/ {cashAmount.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function formatElapsedSince(iso: string, now: Date): string {
  const start = new Date(iso).getTime()
  const diffSec = Math.max(0, Math.floor((now.getTime() - start) / 1000))
  const mm = Math.floor(diffSec / 60)
  const ss = diffSec % 60
  return `${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`
}

function paymentStatusShort(status: string): string {
  switch (status) {
    case 'pending_yape':
      return 'por Yape'
    case 'pending_cash':
      return 'efectivo'
    case 'pending_mixed':
      return 'Yape + cash'
    default:
      return paymentLabel(status)
  }
}

function OrderSupportContacts({
  restaurantName,
  restaurantPhone,
  supportPhone,
}: {
  restaurantName: string
  restaurantPhone: string | null
  supportPhone: string
}) {
  const hasSupportPhone = supportPhone.trim().length > 0

  return (
    <section className="rounded-[28px] border border-outline-variant/15 bg-surface-container-lowest p-4 shadow-[0_4px_20px_rgba(171,53,0,0.04)]">
      <div>
        <h3 className="text-xs font-bold tracking-widest uppercase text-on-surface-variant">
          Contactos rápidos
        </h3>
        <p className="mt-0.5 text-sm font-semibold text-on-surface">{restaurantName} y Tindivo.</p>
      </div>

      <div
        className={
          restaurantPhone && hasSupportPhone
            ? 'mt-3 grid grid-cols-2 gap-2'
            : 'mt-3 grid grid-cols-1 gap-2'
        }
      >
        {restaurantPhone && (
          <a
            href={phoneHref(restaurantPhone)}
            className="flex min-h-16 flex-col justify-center rounded-2xl border border-outline-variant/25 bg-white/70 px-3 text-on-surface transition-all duration-200 active:scale-[0.98]"
          >
            <span className="inline-flex items-center gap-1.5 text-sm font-black">
              <Icon name="call" size={18} filled />
              Local
            </span>
            <span className="mt-1 text-xs font-mono text-on-surface-variant">
              {formatPePhone(restaurantPhone)}
            </span>
          </a>
        )}

        {hasSupportPhone && (
          <a
            href={phoneHref(supportPhone)}
            className="flex min-h-16 flex-col justify-center rounded-2xl border border-sky-200 bg-sky-50 px-3 text-sky-950 transition-all duration-200 active:scale-[0.98]"
          >
            <span className="inline-flex items-center gap-1.5 text-sm font-black">
              <Icon name="support_agent" size={18} filled />
              Tindivo
            </span>
            <span className="mt-1 text-xs font-mono text-sky-900/75">
              {formatPePhone(supportPhone)}
            </span>
          </a>
        )}
      </div>
    </section>
  )
}

function phoneHref(raw: string): string {
  const e164 = normalizeToE164Pe(raw)
  return e164 ? `tel:+${e164}` : `tel:${raw}`
}

function formatPePhone(raw: string): string {
  const e164 = normalizeToE164Pe(raw)
  if (!e164) return raw
  const local = e164.slice(2)
  return `+51 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`
}

function paymentLabel(status: string): string {
  switch (status) {
    case 'prepaid':
      return 'Pagado'
    case 'pending_yape':
      return 'Cobrar Yape'
    case 'pending_cash':
      return 'Cobrar efectivo'
    case 'pending_mixed':
      return 'Yape + Efectivo'
    default:
      return status
  }
}

/**
 * Construye el destino para `useGeolocatedNavigation`. Prefiere coordenadas
 * exactas (más precisas) sobre dirección textual; cae a `address` solo
 * si el restaurante es legacy y no tiene `coordinates_lat/lng` registradas.
 */
function buildRestaurantDestination(restaurant: {
  address?: string
  coordinates_lat?: number | null
  coordinates_lng?: number | null
}): { lat: number; lng: number } | { address: string } {
  if (
    typeof restaurant.coordinates_lat === 'number' &&
    typeof restaurant.coordinates_lng === 'number'
  ) {
    return { lat: restaurant.coordinates_lat, lng: restaurant.coordinates_lng }
  }
  return { address: restaurant.address ?? '' }
}

/**
 * Verifica que el pedido tenga las coordenadas del cliente (lat/lng
 * derivadas de delivery_coordinates via columnas generadas en BD).
 */
function hasDeliveryCoords(
  raw: Record<string, unknown>,
): raw is { delivery_lat: number; delivery_lng: number } {
  return typeof raw.delivery_lat === 'number' && typeof raw.delivery_lng === 'number'
}

type PaymentBreakdownProps = {
  amount: number
  paymentStatus: string
  yapeAmount: number | null
  cashAmount: number | null
  clientPaysWith: number | null
  changeToGive: number | null
  expanded: boolean
  onToggle: () => void
}

/**
 * Resumen de cobro compacto (1 línea). El driver ve la info crítica para
 * preparar la bolsa antes de salir: cuánto cobrar y vuelto. El detalle
 * granular (Yape/Efectivo split, paga con) se oculta tras toggle.
 *
 * En `picked_up` este componente NO se renderiza — la info clave migra al
 * PhaseHero como métrica principal, evitando duplicación visual.
 *
 * NOTA: la rama `paymentStatus === 'prepaid'` aplica cuando un admin/driver
 * cambia el método a 'prepaid' DESPUÉS de crear el pedido (orden con
 * order_amount>0 que ya fue cobrada por adelantado). No se activa por el
 * flujo normal de creación, donde 'Ya pagó' fuerza order_amount=0 y la
 * guarda del parent corta el render.
 */
function PaymentBreakdown({
  amount,
  paymentStatus,
  yapeAmount,
  cashAmount,
  clientPaysWith,
  changeToGive,
  expanded,
  onToggle,
}: PaymentBreakdownProps) {
  const hasChange = clientPaysWith != null && changeToGive != null && changeToGive > 0
  const summary = paymentSummary({ amount, paymentStatus, changeToGive, hasChange })
  const detailRows = paymentDetailRows({
    amount,
    paymentStatus,
    yapeAmount,
    cashAmount,
    clientPaysWith,
    changeToGive,
  })

  if (paymentStatus === 'prepaid') {
    return (
      <section className="rounded-2xl border border-emerald-200/70 bg-emerald-50/60 px-4 py-2.5">
        <div className="flex items-center gap-2.5 text-emerald-900">
          <Icon name="verified" size={18} filled />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold tracking-widest uppercase text-emerald-800">
              Ya pagó
            </div>
            <div className="text-sm font-black">No cobres nada. Solo entrega.</div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left transition-transform active:scale-[0.99]"
      >
        <Icon name={summary.icon} size={20} filled className="shrink-0 text-orange-600" />
        <span className="min-w-0 flex-1 flex items-baseline flex-wrap gap-x-2 gap-y-0.5">
          <span className="text-sm font-black text-on-surface">{summary.headline}</span>
          {summary.aside && (
            <span className="text-xs font-semibold text-on-surface-variant">{summary.aside}</span>
          )}
        </span>
        <Icon
          name={expanded ? 'expand_less' : 'expand_more'}
          size={20}
          className="shrink-0 text-on-surface-variant"
        />
      </button>

      {expanded && (
        <div className="tindivo-reveal border-t border-outline-variant/20 px-4 py-3">
          <div className="grid grid-cols-2 gap-2">
            {detailRows.map((row) => (
              <div
                key={row.label}
                className="rounded-2xl border border-outline-variant/20 bg-orange-50/40 px-3 py-2"
              >
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-orange-800">
                  <Icon name={row.icon} size={13} filled />
                  {row.label}
                </div>
                <div className="mt-1 text-sm font-black tabular-nums text-on-surface">
                  {row.value}
                </div>
                {row.helper && (
                  <div className="mt-0.5 text-[10px] font-semibold text-on-surface-variant">
                    {row.helper}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

type PaymentSummaryInput = {
  amount: number
  paymentStatus: string
  changeToGive: number | null
  hasChange: boolean
}

function paymentSummary({ amount, paymentStatus, changeToGive, hasChange }: PaymentSummaryInput) {
  const total = `S/ ${amount.toFixed(2)}`
  const vuelto = hasChange ? `· vuelto S/ ${changeToGive?.toFixed(2)}` : null
  switch (paymentStatus) {
    case 'pending_yape':
      return { headline: `Cobra ${total} por Yape`, aside: null, icon: 'qr_code_2' }
    case 'pending_mixed':
      return {
        headline: `Cobra ${total}`,
        aside: vuelto ?? 'Yape + efectivo',
        icon: 'payments',
      }
    case 'pending_cash':
      return {
        headline: `Cobra ${total} efectivo`,
        aside: vuelto,
        icon: 'payments',
      }
    default:
      return { headline: total, aside: paymentLabel(paymentStatus), icon: 'receipt' }
  }
}

type PaymentDetailRowsInput = {
  amount: number
  paymentStatus: string
  yapeAmount: number | null
  cashAmount: number | null
  clientPaysWith: number | null
  changeToGive: number | null
}

function paymentDetailRows({
  amount,
  paymentStatus,
  yapeAmount,
  cashAmount,
  clientPaysWith,
  changeToGive,
}: PaymentDetailRowsInput) {
  const rows = [
    { label: 'Precio', value: `S/ ${amount.toFixed(2)}`, helper: 'pedido', icon: 'receipt' },
  ]

  if (paymentStatus === 'pending_mixed') {
    rows.push({
      label: 'Yape',
      value: `S/ ${(yapeAmount ?? 0).toFixed(2)}`,
      helper: 'por QR',
      icon: 'qr_code_2',
    })
    rows.push({
      label: 'Efectivo',
      value: `S/ ${(cashAmount ?? 0).toFixed(2)}`,
      helper: 'en mano',
      icon: 'payments',
    })
  }

  if (paymentStatus === 'pending_yape') {
    rows.push({
      label: 'Método',
      value: 'Yape',
      helper: 'mostrar QR',
      icon: 'qr_code_2',
    })
  }

  if (clientPaysWith != null) {
    rows.push({
      label: 'Paga con',
      value: `S/ ${clientPaysWith.toFixed(2)}`,
      helper: 'efectivo',
      icon: 'account_balance_wallet',
    })
  }

  if (changeToGive != null) {
    rows.push({
      label: 'Vuelto',
      value: `S/ ${changeToGive.toFixed(2)}`,
      helper: changeToGive > 0 ? 'preparar' : 'paga justo',
      icon: 'currency_exchange',
    })
  }

  return rows
}
