'use client'
import { useGeolocatedNavigation } from '@/shared/hooks/use-geolocated-navigation'
import { useNow } from '@/shared/hooks/use-now'
import { ApiError } from '@tindivo/api-client'
import type { Orders } from '@tindivo/contracts'
import { buildWaMeUrl, normalizeToE164Pe } from '@tindivo/core'
import {
  BottomActionBar,
  Button,
  ColorDot,
  ElapsedTimer,
  GlassTopBar,
  Icon,
  IconButton,
  StatusChip,
  Timeline,
  type TimelineStep,
  UrgencyBadge,
} from '@tindivo/ui'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { RejectAssignmentSheet } from '../../available-orders/components/reject-assignment-sheet'
import { useAcceptOrder } from '../../available-orders/hooks/use-accept-order'
import { useRejectOrder } from '../../available-orders/hooks/use-reject-order'
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
  const [timelineOpen, setTimelineOpen] = useState(false)
  const receivedFiredRef = useRef(false)

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

  const steps = useMemo<TimelineStep[]>(() => {
    if (!order) return []
    const s = order.status as string
    return [
      {
        key: 'accepted',
        label: 'Por aceptar',
        icon: 'assignment_turned_in',
        done: s !== 'waiting_driver',
        current: s === 'waiting_driver',
      },
      {
        key: 'heading',
        label: 'En camino al local',
        icon: 'two_wheeler',
        done: ['waiting_at_restaurant', 'picked_up', 'delivered'].includes(s),
        current: s === 'heading_to_restaurant',
      },
      {
        key: 'at_restaurant',
        label: 'Recogiendo pedido',
        icon: 'restaurant',
        done: ['picked_up', 'delivered'].includes(s),
        current: s === 'waiting_at_restaurant',
      },
      {
        key: 'picked_up',
        label: 'En camino al cliente',
        icon: 'delivery_dining',
        done: s === 'delivered',
        current: s === 'picked_up',
      },
      {
        key: 'delivered',
        label: 'Entregado',
        icon: 'check_circle',
        done: s === 'delivered',
        current: s === 'delivered',
      },
    ]
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
  const restaurantWaUrl: string | null = restaurant.phone
    ? buildWaMeUrl(
        normalizeToE164Pe(restaurant.phone) ?? `51${restaurant.phone}`,
        `Hola, soy el motorizado del pedido #${raw.short_id}.`,
      )
    : null
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

  return (
    <div
      className="min-h-screen relative"
      style={{ paddingBottom: 'calc(220px + env(safe-area-inset-bottom))' }}
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

      <main className="pt-24 px-4 max-w-md mx-auto space-y-5">
        {/* Header del pedido */}
        <section className="bg-surface-container-lowest rounded-[28px] p-5 border border-outline-variant/20 shadow-[0_12px_36px_-24px_rgba(18,38,32,0.45)]">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ColorDot color={restaurant.accent_color ?? 'ab3500'} />
                <h1 className="font-black text-xl leading-tight text-on-surface">
                  {restaurant.name}
                </h1>
              </div>
              <p className="text-xs text-on-surface-variant font-mono">#{raw.short_id}</p>
              {raw.client_name && (
                <p className="text-xs text-on-surface mt-0.5 font-semibold">
                  Cliente: {raw.client_name}
                </p>
              )}
            </div>
            <StatusChip status={status as never} />
          </div>
          <div className="mt-4 flex items-center gap-4 text-sm">
            {Number(raw.order_amount) === 0 ? (
              <div className="flex items-center gap-1.5 font-bold" style={{ color: '#059669' }}>
                <Icon name="verified" size={16} filled />
                <span>No cobrar · Solo entregar</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1.5 text-on-surface-variant">
                  <Icon name="payments" size={16} />
                  <span className="font-semibold text-on-surface">
                    S/ {Number(raw.order_amount).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-on-surface-variant">
                  <Icon name="receipt" size={16} />
                  <span>{paymentLabel(raw.payment_status)}</span>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Breakdown de cobro — qué pagar, con qué paga el cliente y vuelto a dar */}
        {Number(raw.order_amount) > 0 && (
          <PaymentBreakdown
            amount={Number(raw.order_amount)}
            paymentStatus={raw.payment_status}
            yapeAmount={raw.yape_amount != null ? Number(raw.yape_amount) : null}
            cashAmount={raw.cash_amount != null ? Number(raw.cash_amount) : null}
            clientPaysWith={raw.client_pays_with != null ? Number(raw.client_pays_with) : null}
            changeToGive={raw.change_to_give != null ? Number(raw.change_to_give) : null}
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

        {/* Cronómetro: arranca en 0:00 al aceptar y crece hasta entrega.
            Si aún hay countdown del prep_time vigente, se muestra al lado. */}
        <section className="flex items-stretch gap-2">
          {raw.accepted_at && (
            <ElapsedTimer
              createdAt={raw.accepted_at}
              now={now}
              withLabel
              label="TIEMPO DE ENTREGA"
              className="flex-1"
            />
          )}
          {raw.estimated_ready_at &&
            ['heading_to_restaurant', 'waiting_at_restaurant'].includes(status) && (
              <UrgencyBadge
                estimatedReadyAt={raw.estimated_ready_at}
                now={now}
                variant="hero"
                className="flex-1"
              />
            )}
        </section>

        <CurrentPhaseCard
          phase={currentPhase}
          steps={steps}
          open={timelineOpen}
          onToggle={() => setTimelineOpen((value) => !value)}
        />

        {/* Restaurante: dirección + navegar */}
        {['waiting_driver', 'heading_to_restaurant', 'waiting_at_restaurant'].includes(status) && (
          <section className="bg-surface-container-lowest rounded-[28px] p-5 border border-outline-variant/15 shadow-[0_4px_20px_rgba(171,53,0,0.04)] space-y-3">
            <h3 className="text-xs font-bold tracking-widest uppercase text-on-surface-variant">
              Recoger pedido en
            </h3>
            <p className="font-semibold">{restaurant.address}</p>
          </section>
        )}

        {/* Datos del cliente — durante waiting_at_restaurant.
            - Si todavía no hay datos guardados o el driver pidió editar:
              muestra el form. El botón "Guardar" persiste en BD sin cambiar
              status (queda en waiting_at_restaurant).
            - Si ya hay datos guardados: muestra resumen + countdown del
              tiempo de prep. El botón "Ya recogí el pedido" transiciona a
              picked_up (con confirmación si aún no llegó a cero). */}
        {status === 'waiting_driver' && (
          <section className="bg-surface-container-lowest rounded-[28px] p-5 border border-outline-variant/15 shadow-[0_4px_20px_rgba(171,53,0,0.04)] space-y-4">
            <h3 className="text-xs font-bold tracking-widest uppercase text-on-surface-variant">
              Pedido asignado a ti
            </h3>
            <div
              className="rounded-2xl p-5 text-center"
              style={{
                background: 'linear-gradient(135deg, #F26241 0%, #FF9B63 100%)',
                color: '#ffffff',
                boxShadow: '0 12px 28px -10px rgba(242, 98, 65, 0.38)',
              }}
            >
              <div className="text-[10px] font-bold tracking-[0.22em] uppercase opacity-85 mb-1">
                Listo en
              </div>
              <div
                className="bleed-text text-5xl font-black font-mono tabular-nums leading-none"
                style={{ letterSpacing: '-0.02em' }}
              >
                {remainingLabel}
              </div>
              <div className="text-[11px] opacity-90 mt-2">
                Acepta para reservar el pedido y salir al local.
              </div>
            </div>
          </section>
        )}

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

        {status === 'waiting_at_restaurant' && !isEditingCustomerData && hasCustomerData && (
          <section className="bg-surface-container-lowest rounded-[28px] p-5 border border-outline-variant/15 shadow-[0_4px_20px_rgba(171,53,0,0.04)] space-y-4">
            <header className="flex items-center justify-between">
              <h3 className="text-xs font-bold tracking-widest uppercase text-on-surface-variant">
                {prepReady ? 'Pedido listo' : 'Tiempo de preparación'}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditingCustomerData(true)}
                className="inline-flex items-center gap-1 text-xs font-bold text-primary-container active:scale-95"
              >
                <Icon name="edit" size={14} />
                Editar datos
              </button>
            </header>

            <div
              className="rounded-2xl p-5 text-center"
              style={{
                background: prepReady
                  ? 'linear-gradient(135deg, #065F46 0%, #10B981 100%)'
                  : 'linear-gradient(135deg, #F26241 0%, #FF9B63 100%)',
                color: '#ffffff',
                boxShadow: prepReady
                  ? '0 12px 28px -10px rgba(5, 150, 105, 0.45)'
                  : '0 12px 28px -10px rgba(242, 98, 65, 0.38)',
              }}
            >
              <div className="text-[10px] font-bold tracking-[0.22em] uppercase opacity-85 mb-1">
                {prepReady ? 'Listo para recoger' : 'Falta para que esté listo'}
              </div>
              <div
                className="bleed-text text-5xl font-black font-mono tabular-nums leading-none"
                style={{ letterSpacing: '-0.02em' }}
              >
                {prepReady ? '¡YA!' : remainingLabel}
              </div>
              <div className="text-[11px] opacity-90 mt-2">
                {prepReady
                  ? 'Cuando tengas el pedido en mano, presiona "Ya recogí el pedido"'
                  : 'Cuando el restaurante te entregue la comida, presiona "Ya recogí el pedido"'}
              </div>
            </div>

            <div className="space-y-1.5 text-sm">
              <div className="flex items-center gap-2 text-on-surface-variant">
                <Icon name="call" size={14} />
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
                  <Icon name="pin_drop" size={14} className="mt-0.5 shrink-0" />
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
        {status === 'picked_up' && (raw.client_phone || persistedReference) && (
          <section className="bg-surface-container-lowest rounded-[28px] p-5 border border-outline-variant/15 shadow-[0_4px_20px_rgba(171,53,0,0.04)] space-y-3">
            <h3 className="text-xs font-bold tracking-widest uppercase text-on-surface-variant">
              Entregar al cliente
            </h3>
            {raw.client_phone && (
              <a
                href={`tel:+51${raw.client_phone}`}
                className="inline-flex items-center gap-2 text-primary-container font-semibold"
              >
                <Icon name="call" size={18} />
                Llamar: +51 {raw.client_phone}
              </a>
            )}
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
          restaurantWaUrl={restaurantWaUrl}
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
          onConfirm={(occupancySlots) => {
            setPickupError(null)
            pickedUp.mutate(occupancySlots, {
              onSuccess: () => setConfirmPickupOpen(false),
              onError: (err) =>
                setPickupError(
                  err instanceof Error
                    ? err.message
                    : 'No se pudo confirmar el pickup. Intenta de nuevo.',
                ),
            })
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

function CurrentPhaseCard({
  phase,
  steps,
  open,
  onToggle,
}: {
  phase: CurrentPhase
  steps: TimelineStep[]
  open: boolean
  onToggle: () => void
}) {
  const palette = {
    brand: {
      bg: 'linear-gradient(135deg, rgba(242, 98, 65, 0.12) 0%, rgba(255,255,255,0.94) 58%)',
      iconBg: 'linear-gradient(135deg, #F26241 0%, #FF9B63 100%)',
      border: 'rgba(242, 98, 65, 0.22)',
      color: '#9B2F18',
    },
    warning: {
      bg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.14) 0%, rgba(255,255,255,0.94) 58%)',
      iconBg: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
      border: 'rgba(245, 158, 11, 0.24)',
      color: '#92400E',
    },
    success: {
      bg: 'linear-gradient(135deg, rgba(5, 150, 105, 0.13) 0%, rgba(255,255,255,0.94) 58%)',
      iconBg: 'linear-gradient(135deg, #059669 0%, #14B8A6 100%)',
      border: 'rgba(5, 150, 105, 0.22)',
      color: '#065F46',
    },
    neutral: {
      bg: 'linear-gradient(135deg, rgba(83, 96, 92, 0.1) 0%, rgba(255,255,255,0.94) 58%)',
      iconBg: 'linear-gradient(135deg, #53605C 0%, #7B8581 100%)',
      border: 'rgba(83, 96, 92, 0.18)',
      color: '#34403B',
    },
  }[phase.tone]

  return (
    <section
      className="rounded-[28px] p-5 border shadow-[0_12px_36px_-24px_rgba(18,38,32,0.45)] overflow-hidden"
      style={{ background: palette.bg, borderColor: palette.border }}
    >
      <div className="flex items-start gap-4">
        <span
          className="shrink-0 inline-flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-[0_10px_24px_-12px_rgba(18,38,32,0.65)]"
          style={{ background: palette.iconBg }}
        >
          <Icon name={phase.icon} size={25} filled />
        </span>
        <div className="min-w-0 flex-1">
          <p
            className="text-[10px] font-black tracking-[0.22em] uppercase"
            style={{ color: palette.color }}
          >
            {phase.eyebrow}
          </p>
          <h2 className="mt-1 text-xl font-black leading-tight text-on-surface">{phase.label}</h2>
          <p className="mt-1 text-sm leading-snug text-on-surface-variant">{phase.description}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="mt-4 flex min-h-12 w-full items-center justify-between rounded-2xl border border-outline-variant/25 bg-white/72 px-4 text-sm font-black text-on-surface transition-all duration-200 active:scale-[0.98]"
      >
        <span>{open ? 'Ocultar fases' : 'Ver todas las fases'}</span>
        <span
          className="inline-flex text-on-surface-variant transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }}
        >
          <Icon name="expand_more" size={22} />
        </span>
      </button>

      {open && (
        <div className="tindivo-reveal mt-4 border-t border-outline-variant/15 pt-4">
          <Timeline steps={steps} />
        </div>
      )}
    </section>
  )
}

function OrderSupportContacts({
  restaurantName,
  restaurantPhone,
  restaurantWaUrl,
}: {
  restaurantName: string
  restaurantPhone: string | null
  restaurantWaUrl: string | null
}) {
  return (
    <section className="space-y-3">
      <div className="px-1">
        <h3 className="text-xs font-bold tracking-widest uppercase text-on-surface-variant">
          Contactos
        </h3>
        <p className="mt-1 text-sm font-semibold text-on-surface">
          {restaurantName} y soporte Tindivo.
        </p>
      </div>

      {restaurantPhone && (
        <a
          href={phoneHref(restaurantPhone)}
          className="flex min-h-14 items-center gap-3 rounded-2xl border border-outline-variant/25 bg-surface-container-lowest px-4 text-on-surface transition-all duration-200 active:scale-[0.98]"
        >
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-primary">
            <Icon name="call" size={21} filled />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-black">Llamar al restaurante</span>
            <span className="block text-xs font-mono text-on-surface-variant">
              {formatPePhone(restaurantPhone)}
            </span>
          </span>
        </a>
      )}

      {restaurantWaUrl && (
        <a
          href={restaurantWaUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Abrir WhatsApp con el restaurante"
          className="flex min-h-14 items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-emerald-900 transition-all duration-200 active:scale-[0.98]"
        >
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white">
            <Icon name="phone_in_talk" size={21} filled />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-black">WhatsApp al restaurante</span>
            <span className="block text-xs font-semibold text-emerald-800/80">
              Para coordinar con el local
            </span>
          </span>
        </a>
      )}

      <a
        href="tel:+51906550166"
        className="flex min-h-14 items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 text-sky-950 transition-all duration-200 active:scale-[0.98]"
      >
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white">
          <Icon name="support_agent" size={21} filled />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black">Necesitas ayuda</span>
          <span className="block text-xs font-mono text-sky-900/75">+51 906 550 166</span>
        </span>
      </a>
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
}

/**
 * Desglose de cobro — HU-D-015: el driver necesita saber rápidamente
 * cuánto cobrar, con qué billete pagará el cliente, y cuánto vuelto debe
 * dar. El dato de "vuelto" se destaca porque es la información operativa
 * crítica (el driver debe llevar el cambio ya en la bolsa).
 */
function PaymentBreakdown({
  amount,
  paymentStatus,
  yapeAmount,
  cashAmount,
  clientPaysWith,
  changeToGive,
}: PaymentBreakdownProps) {
  if (paymentStatus === 'prepaid') {
    return (
      <section
        className="rounded-[24px] p-5 border border-emerald-200/60"
        style={{ background: 'rgba(16, 185, 129, 0.08)' }}
      >
        <div className="flex items-center gap-3">
          <span
            className="inline-flex items-center justify-center w-11 h-11 rounded-xl"
            style={{
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              color: '#ffffff',
            }}
          >
            <Icon name="verified" size={22} filled />
          </span>
          <div>
            <div className="text-[10px] font-bold tracking-[0.22em] uppercase text-emerald-800">
              Ya pagó
            </div>
            <div className="font-bold text-emerald-900">
              No cobres nada al cliente — solo entregar.
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (paymentStatus === 'pending_yape') {
    return (
      <section className="rounded-[24px] p-5 bg-surface-container-lowest border border-outline-variant/15">
        <div className="text-[10px] font-bold tracking-[0.22em] uppercase text-on-surface-variant mb-3">
          Cobro al cliente
        </div>
        <div className="flex items-end justify-between">
          <div>
            <div className="bleed-text text-3xl font-black text-on-surface">
              S/ {amount.toFixed(2)}
            </div>
            <div className="text-xs text-on-surface-variant mt-1">
              Cobrar por Yape — el cliente escanea el QR abajo
            </div>
          </div>
          <Icon name="qr_code_2" size={28} className="text-on-surface-variant/40" filled />
        </div>
      </section>
    )
  }

  if (paymentStatus === 'pending_mixed') {
    const hasChange = clientPaysWith != null && changeToGive != null && changeToGive > 0
    const yapePart = yapeAmount ?? 0
    const cashPart = cashAmount ?? 0
    return (
      <section className="rounded-[24px] p-5 bg-surface-container-lowest border border-outline-variant/15 shadow-[0_4px_20px_rgba(171,53,0,0.04)] space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-bold tracking-[0.22em] uppercase text-on-surface-variant">
            Cobro mixto
          </div>
          <span className="text-[11px] font-bold text-on-surface-variant font-mono tabular-nums">
            Total S/ {amount.toFixed(2)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl p-4" style={{ background: 'rgba(124, 58, 237, 0.08)' }}>
            <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-purple-700">
              <Icon name="qr_code_2" size={12} filled />
              Yape
            </div>
            <div
              className="bleed-text text-2xl font-black mt-1 font-mono tabular-nums"
              style={{ color: '#5B21B6' }}
            >
              S/ {yapePart.toFixed(2)}
            </div>
            <div className="text-[10px] text-on-surface-variant mt-0.5">QR abajo</div>
          </div>
          <div className="rounded-2xl p-4" style={{ background: 'rgba(255, 107, 53, 0.08)' }}>
            <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-orange-700">
              <Icon name="payments" size={12} filled />
              Efectivo
            </div>
            <div className="bleed-text text-2xl font-black mt-1 font-mono tabular-nums text-on-surface">
              S/ {cashPart.toFixed(2)}
            </div>
            <div className="text-[10px] text-on-surface-variant mt-0.5">cobrar en mano</div>
          </div>
        </div>

        {clientPaysWith != null && (
          <div className="rounded-2xl p-3 flex items-center justify-between bg-surface-container">
            <div className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant">
              Paga (efectivo) con
            </div>
            <div className="font-bold font-mono tabular-nums" style={{ color: '#1E40AF' }}>
              S/ {clientPaysWith.toFixed(2)}
            </div>
          </div>
        )}

        {hasChange && (
          <div
            className="relative overflow-hidden rounded-2xl p-4"
            style={{
              background: 'linear-gradient(135deg, #065F46 0%, #10B981 100%)',
              color: '#ffffff',
              boxShadow: '0 12px 28px -10px rgba(5, 150, 105, 0.45)',
            }}
          >
            <div className="relative flex items-center gap-3">
              <span
                className="inline-flex items-center justify-center w-10 h-10 rounded-xl"
                style={{ background: 'rgba(255, 255, 255, 0.2)' }}
              >
                <Icon name="shopping_bag" size={20} filled />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold tracking-[0.22em] uppercase opacity-85">
                  Vuelto a dar
                </div>
                <div
                  className="bleed-text text-2xl font-black font-mono tabular-nums leading-tight"
                  style={{ letterSpacing: '-0.02em' }}
                >
                  S/ {(changeToGive as number).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    )
  }

  // pending_cash: desglose completo con vuelto
  const hasChange = clientPaysWith != null && changeToGive != null && changeToGive > 0

  return (
    <section className="rounded-[24px] p-5 bg-surface-container-lowest border border-outline-variant/15 shadow-[0_4px_20px_rgba(171,53,0,0.04)] space-y-4">
      <div className="text-[10px] font-bold tracking-[0.22em] uppercase text-on-surface-variant">
        Cobro en efectivo
      </div>

      {/* Grid: monto pedido · paga con */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255, 107, 53, 0.08)' }}>
          <div className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant">
            Precio
          </div>
          <div className="bleed-text text-2xl font-black mt-1 text-on-surface font-mono tabular-nums">
            S/ {amount.toFixed(2)}
          </div>
          <div className="text-[10px] text-on-surface-variant mt-0.5">lo que debe pagar</div>
        </div>
        {clientPaysWith != null ? (
          <div className="rounded-2xl p-4" style={{ background: 'rgba(59, 130, 246, 0.08)' }}>
            <div className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant">
              Paga con
            </div>
            <div
              className="bleed-text text-2xl font-black mt-1 font-mono tabular-nums"
              style={{ color: '#1E40AF' }}
            >
              S/ {clientPaysWith.toFixed(2)}
            </div>
            <div className="text-[10px] text-on-surface-variant mt-0.5">el billete del cliente</div>
          </div>
        ) : (
          <div className="rounded-2xl p-4 bg-surface-container">
            <div className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant">
              Paga con
            </div>
            <div className="font-bold text-sm mt-2 text-on-surface-variant">—</div>
            <div className="text-[10px] text-on-surface-variant/70 mt-0.5">no se especificó</div>
          </div>
        )}
      </div>

      {/* Vuelto destacado */}
      {hasChange ? (
        <div
          className="relative overflow-hidden rounded-2xl p-4"
          style={{
            background: 'linear-gradient(135deg, #065F46 0%, #10B981 100%)',
            color: '#ffffff',
            boxShadow: '0 12px 28px -10px rgba(5, 150, 105, 0.45)',
          }}
        >
          <div
            aria-hidden="true"
            className="absolute -top-8 -right-8 w-28 h-28 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(255,255,255,0.22) 0%, transparent 60%)',
            }}
          />
          <div className="relative flex items-center gap-3">
            <span
              className="inline-flex items-center justify-center w-11 h-11 rounded-xl"
              style={{ background: 'rgba(255, 255, 255, 0.2)' }}
            >
              <Icon name="shopping_bag" size={22} filled />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold tracking-[0.22em] uppercase opacity-85">
                Vuelto a dar
              </div>
              <div
                className="bleed-text text-3xl font-black font-mono tabular-nums leading-tight"
                style={{ letterSpacing: '-0.02em' }}
              >
                S/ {changeToGive.toFixed(2)}
              </div>
              <div className="text-[11px] opacity-90 mt-0.5">debe ir ya en la bolsa</div>
            </div>
          </div>
        </div>
      ) : clientPaysWith != null && changeToGive != null ? (
        <div
          className="rounded-2xl p-3 text-center text-sm font-semibold"
          style={{
            background: 'rgba(16, 185, 129, 0.1)',
            color: '#065F46',
            border: '1px solid rgba(16, 185, 129, 0.25)',
          }}
        >
          Sin vuelto · paga justo S/ {amount.toFixed(2)}
        </div>
      ) : (
        <div className="text-xs text-on-surface-variant text-center">
          Confirma con el cliente cuánto pagará al recibir.
        </div>
      )}
    </section>
  )
}
