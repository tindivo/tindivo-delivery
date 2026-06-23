'use client'
import { ColorDot, Icon } from '@tindivo/ui'

type IdentityProps = {
  restaurantName: string
  restaurantAccentColor: string
  clientName: string | null
}

/**
 * Bloque de identidad restaurante + cliente. Reusado tanto en modo lectura
 * (dentro de CustomerInfoCard) como en modo edición (encima del
 * CustomerDataForm). El restaurante queda como eyebrow contextual; el
 * cliente toma protagonismo como hero porque es la persona real que recibe
 * el pedido — el motorizado lo necesita identificar en menos de 1 segundo.
 *
 * El "thread" vertical de color (3px) usa el accent del restaurante y
 * conecta visualmente eyebrow y nombre, sustituyendo el ColorDot del header
 * pequeño con algo más atado a la jerarquía.
 */
export function CustomerIdentityHeader({
  restaurantName,
  restaurantAccentColor,
  clientName,
}: IdentityProps) {
  return (
    <div className="flex items-stretch gap-3 min-w-0">
      <span
        aria-hidden="true"
        className="shrink-0 w-1 rounded-full"
        style={{
          background: `linear-gradient(180deg, #${restaurantAccentColor} 0%, #${restaurantAccentColor}66 100%)`,
        }}
      />
      <div className="min-w-0 flex-1 flex flex-col justify-center gap-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <ColorDot color={restaurantAccentColor} size={8} label={restaurantName} />
          <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-on-surface-variant truncate">
            {restaurantName}
          </span>
        </div>
        <h2 className="text-[26px] font-black tracking-tight leading-[1.1] text-on-surface line-clamp-2">
          {clientName ?? 'Cliente'}
        </h2>
      </div>
    </div>
  )
}

type CardProps = IdentityProps & {
  clientPhone: string
  deliveryReference: string | null
  hasMapCoords: boolean
  onEdit: () => void
}

/**
 * Card unificada del cliente — fase `waiting_at_restaurant` con datos ya
 * persistidos. Reemplaza el header pequeño global + la sección "Datos del
 * cliente" densa que existía antes. Patrón visual: hero + sub-cards.
 *
 * - Header con identidad a la izquierda y botón Editar pill a la derecha.
 * - Divider con gradient que se desvanece en los bordes — toque editorial.
 * - Sub-cards de teléfono y dirección con iconos en círculos sólidos del
 *   color de marca + sombra dimensional. Los datos se sienten "elevados",
 *   no listados.
 *
 * Solo teléfono y dirección son editables; restaurante y cliente quedan
 * fijados por el creador del pedido (restaurante) y no se modifican aquí.
 */
export function CustomerInfoCard({
  restaurantName,
  restaurantAccentColor,
  clientName,
  clientPhone,
  deliveryReference,
  hasMapCoords,
  onEdit,
}: CardProps) {
  const addressLabel = deliveryReference ? 'Dirección' : hasMapCoords ? 'Destino' : 'Dirección'
  const addressText =
    deliveryReference ?? (hasMapCoords ? 'Punto marcado en el mapa' : 'Sin dirección')

  return (
    <section
      className="
        relative overflow-hidden
        rounded-[28px] p-4
        bg-surface-container-lowest
        border border-outline-variant/20
        shadow-[0_12px_32px_-18px_rgba(171,53,0,0.18),_0_2px_8px_-4px_rgba(0,0,0,0.04)]
        space-y-4
      "
    >
      <header className="flex items-start justify-between gap-3">
        <CustomerIdentityHeader
          restaurantName={restaurantName}
          restaurantAccentColor={restaurantAccentColor}
          clientName={clientName}
        />
        <button
          type="button"
          onClick={onEdit}
          aria-label="Editar teléfono y dirección del cliente"
          className="
            shrink-0 inline-flex items-center justify-center
            h-10 w-10 rounded-full
            bg-primary-fixed text-primary
            border border-primary/10
            shadow-[0_2px_6px_-2px_rgba(171,53,0,0.18)]
            transition-all duration-200
            active:scale-90
            hover:shadow-[0_4px_12px_-4px_rgba(171,53,0,0.28)]
          "
        >
          <Icon name="edit" size={18} filled />
        </button>
      </header>

      <div
        aria-hidden="true"
        className="h-px bg-gradient-to-r from-transparent via-outline-variant/35 to-transparent"
      />

      <div className="space-y-2">
        <DataRow
          icon="call"
          label="Teléfono"
          value={
            <span className="font-mono tabular-nums">
              <span className="text-on-surface-variant mr-1.5">+51</span>
              {formatPhoneGrouping(clientPhone)}
            </span>
          }
          valueClassName="text-lg font-black leading-tight"
        />
        <DataRow
          icon="pin_drop"
          label={addressLabel}
          value={addressText}
          valueClassName="text-sm font-semibold leading-snug whitespace-pre-wrap break-words"
          multiline
        />
      </div>
    </section>
  )
}

type DataRowProps = {
  icon: string
  label: string
  value: React.ReactNode
  valueClassName?: string
  multiline?: boolean
}

function DataRow({ icon, label, value, valueClassName, multiline }: DataRowProps) {
  return (
    <div
      className={`
        flex ${multiline ? 'items-start' : 'items-center'} gap-3.5
        rounded-2xl p-3
        border border-outline-variant/15
        bg-gradient-to-br from-primary-fixed/35 via-surface-container-lowest to-surface-container-lowest
      `}
    >
      <span
        className="
          shrink-0 inline-flex h-11 w-11
          items-center justify-center
          rounded-2xl
          bg-primary text-white
          shadow-[0_6px_16px_-6px_rgba(171,53,0,0.55)]
        "
      >
        <Icon name={icon} size={20} filled />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-on-surface-variant">
          {label}
        </div>
        <div className={`mt-0.5 text-on-surface ${valueClassName ?? 'text-sm'}`}>{value}</div>
      </div>
    </div>
  )
}

/**
 * Agrupa los 9 dígitos del teléfono peruano en bloques 3-3-3 ("999 999 999")
 * para mejorar la legibilidad. Si el formato no calza, devuelve el original.
 */
function formatPhoneGrouping(phone: string): string {
  if (!/^\d{9}$/.test(phone)) return phone
  return `${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}`
}
