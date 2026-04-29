'use client'
import { SAN_JACINTO_CENTER } from '@tindivo/core'
import { Icon, Label, PhoneInputPe } from '@tindivo/ui'
import dynamic from 'next/dynamic'

const InteractiveMap = dynamic(
  () => import('@tindivo/ui/patterns/interactive-map').then((m) => m.InteractiveMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[380px] w-full rounded-xl bg-surface-container animate-pulse" />
    ),
  },
)

type Coords = { lat: number; lng: number }

type Props = {
  phone: string
  onPhoneChange: (value: string) => void
  coords: Coords | null
  onCoordsChange: (value: Coords | null) => void
  restaurantCoords: Coords | null
}

/**
 * Form inline durante waiting_at_restaurant para que el driver llene los
 * datos del cliente mientras espera la comida — eliminando el tiempo muerto
 * que existía cuando el form solo aparecía después de presionar "Recibí
 * el pedido". El parent gestiona el draft (localStorage) vía usePickupDraft.
 */
export function CustomerDataForm({
  phone,
  onPhoneChange,
  coords,
  onCoordsChange,
  restaurantCoords,
}: Props) {
  return (
    <section className="bg-surface-container-lowest rounded-lg p-5 border border-outline-variant/15 shadow-[0_4px_20px_rgba(171,53,0,0.04)] space-y-4">
      <header className="flex items-center justify-between">
        <h3 className="text-xs font-bold tracking-widest uppercase text-on-surface-variant">
          Datos del cliente
        </h3>
        <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-emerald-700">
          <Icon name="cloud_done" size={12} filled />
          Auto-guardado
        </span>
      </header>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
        <Icon name="tips_and_updates" size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900">
          <p className="font-bold mb-0.5">Aprovecha la espera</p>
          <p>
            Llena los datos mientras te alistan la comida. Se guardan automáticamente; si cierras la
            app no los pierdes.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="customer-phone">Teléfono del cliente</Label>
        <PhoneInputPe
          id="customer-phone"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>
          Ubicación de entrega
          <span className="ml-2 text-xs font-normal text-on-surface-variant">
            toca o arrastra el marcador
          </span>
        </Label>
        {restaurantCoords && (
          <p className="text-xs text-on-surface-variant pl-1 flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="inline-block w-3 h-3 rounded-sm border-2 border-white"
              style={{ background: '#1D4ED8', boxShadow: '0 0 0 1px rgba(29,78,216,0.45)' }}
            />
            Marcador azul = ubicación del restaurante (referencia)
          </p>
        )}
        <InteractiveMap
          initialCenter={restaurantCoords ?? SAN_JACINTO_CENTER}
          initialZoom={16}
          value={coords}
          onChange={onCoordsChange}
          referenceMarker={restaurantCoords ?? undefined}
          height={380}
        />
        {coords && (
          <p className="text-xs text-on-surface-variant font-mono pl-1">
            {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
          </p>
        )}
      </div>
    </section>
  )
}
