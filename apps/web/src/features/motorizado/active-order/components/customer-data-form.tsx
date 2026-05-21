'use client'
import { SAN_JACINTO_CENTER } from '@tindivo/core'
import { Icon, Label, PhoneInputPe } from '@tindivo/ui'
import dynamic from 'next/dynamic'
import { useState } from 'react'

const InteractiveMap = dynamic(
  () => import('@tindivo/ui/patterns/interactive-map').then((m) => m.InteractiveMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[260px] w-full rounded-xl bg-surface-container animate-pulse" />
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
 * Form compacto durante `waiting_at_restaurant`. El conductor ve teléfono y
 * referencia primero; el mapa queda bajo demanda para evitar scroll largo.
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
  const [mapOpen, setMapOpen] = useState(false)

  return (
    <section className="bg-surface-container-lowest rounded-[28px] p-4 border border-outline-variant/15 shadow-[0_4px_20px_rgba(171,53,0,0.04)] space-y-3">
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
          <span className="ml-2 text-xs font-normal text-on-surface-variant">o marca el mapa</span>
        </Label>
        <textarea
          id="delivery-reference"
          value={reference}
          onChange={(e) => onReferenceChange(e.target.value.slice(0, 500))}
          maxLength={500}
          rows={2}
          placeholder="Ej: Av. Paseo de la República 3500, dpto 502, a una cuadra del metro..."
          className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-4 py-2 text-sm text-on-surface focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 resize-none"
        />
        <p className="text-xs text-on-surface-variant">
          {reference.length > 0
            ? `${reference.length}/500`
            : 'Si no marcas el mapa, escribe una referencia clara.'}
        </p>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setMapOpen((value) => !value)}
          className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-outline-variant/30 bg-surface-container/50 px-4 py-2 text-left active:scale-[0.98] transition-transform"
        >
          <span className="flex min-w-0 items-center gap-2">
            <Icon name={coords ? 'location_on' : 'add_location_alt'} size={19} filled={!!coords} />
            <span className="min-w-0">
              <span className="block text-sm font-black text-on-surface">
                {coords ? 'Punto marcado en mapa' : 'Marcar punto en mapa'}
              </span>
              <span className="block truncate text-xs text-on-surface-variant">
                {coords
                  ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`
                  : 'Opcional si ya escribiste una referencia clara'}
              </span>
            </span>
          </span>
          <Icon name={mapOpen ? 'expand_less' : 'expand_more'} size={22} />
        </button>

        {mapOpen && (
          <div className="tindivo-reveal space-y-2">
            {restaurantCoords && (
              <p className="text-xs text-on-surface-variant pl-1 flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="inline-block w-3 h-3 rounded-sm border-2 border-white"
                  style={{ background: '#1D4ED8', boxShadow: '0 0 0 1px rgba(29,78,216,0.45)' }}
                />
                Marcador azul = ubicación del restaurante
              </p>
            )}
            <InteractiveMap
              initialCenter={restaurantCoords ?? SAN_JACINTO_CENTER}
              initialZoom={16}
              value={coords}
              onChange={onCoordsChange}
              referenceMarker={restaurantCoords ?? undefined}
              height={260}
            />
            {coords && (
              <button
                type="button"
                onClick={() => onCoordsChange(null)}
                className="inline-flex items-center gap-1 text-xs font-bold text-on-surface-variant"
              >
                <Icon name="close" size={14} />
                Quitar punto del mapa
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
