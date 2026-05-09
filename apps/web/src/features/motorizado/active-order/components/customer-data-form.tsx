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
  reference: string
  onReferenceChange: (value: string) => void
  restaurantCoords: Coords | null
}

/**
 * Form inline durante waiting_at_restaurant para que el driver llene los
 * datos del cliente mientras espera la comida — eliminando el tiempo muerto
 * que existía cuando el form solo aparecía después de presionar "Recibí
 * el pedido". El parent gestiona el draft (localStorage) vía usePickupDraft.
 *
 * Mapa y referencia textual son ambos opcionales individualmente, pero al
 * menos uno debe estar presente — resuelve el caso real de drivers que se
 * estresan tratando de ubicar la dirección exacta en el mapa con tiempo
 * en contra: ahora pueden simplemente escribir la referencia.
 */
export function CustomerDataForm({
  phone,
  onPhoneChange,
  coords,
  onCoordsChange,
  reference,
  onReferenceChange,
  restaurantCoords,
}: Props) {
  return (
    <section className="bg-surface-container-lowest rounded-[28px] p-5 border border-outline-variant/15 shadow-[0_4px_20px_rgba(171,53,0,0.04)] space-y-4">
      <header className="flex items-center justify-between">
        <h3 className="text-xs font-bold tracking-widest uppercase text-on-surface-variant">
          Datos del cliente
        </h3>
        <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-emerald-700">
          <Icon name="cloud_done" size={12} filled />
          Auto-guardado
        </span>
      </header>

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
        <Label htmlFor="delivery-reference">
          Referencia de la dirección
          <span className="ml-2 text-xs font-normal text-on-surface-variant">opcional</span>
        </Label>
        <textarea
          id="delivery-reference"
          value={reference}
          onChange={(e) => onReferenceChange(e.target.value.slice(0, 500))}
          maxLength={500}
          rows={3}
          placeholder="Ej: Av. Paseo de la República 3500, dpto 502, a una cuadra del metro Aramburú..."
          className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-4 py-2 text-sm text-on-surface focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 resize-none"
        />
        <p className="text-xs text-on-surface-variant">
          {reference.length > 0
            ? `${reference.length}/500`
            : 'Escribe aquí si no logras marcar el punto exacto en el mapa'}
        </p>
      </div>

      <div className="space-y-2">
        <Label>
          Ubicación de entrega
          <span className="ml-2 text-xs font-normal text-on-surface-variant">
            opcional · toca o arrastra el marcador
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
