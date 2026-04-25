'use client'
import 'leaflet/dist/leaflet.css'
import { SAN_JACINTO_CENTER } from '@tindivo/core'
import L from 'leaflet'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'
import { cn } from '../lib/cn'

type Coordinates = { lat: number; lng: number }

type Props = {
  initialCenter?: Coordinates
  initialZoom?: number
  value?: Coordinates | null
  onChange?: (coords: Coordinates) => void
  /**
   * Marker de referencia visual no editable. Útil para mostrar un punto
   * de orientación (p.ej. la ubicación del restaurante cuando el driver
   * registra la dirección del cliente). Se renderiza con un ícono gris
   * distinto al marker editable y NO acepta drag ni emite eventos.
   */
  referenceMarker?: Coordinates
  readOnly?: boolean
  className?: string
  height?: number | string
}

const defaultCenter: Coordinates = SAN_JACINTO_CENTER

// Icono editable (cliente / selección activa): naranja con pulse.
const markerIcon = new L.DivIcon({
  className: '',
  html: `<div style="
    width: 32px; height: 32px; position: relative;
    display: flex; align-items: center; justify-content: center;
  ">
    <div style="
      position: absolute; inset: 0;
      background: rgba(255,107,53,0.3); border-radius: 9999px;
      animation: tindivo-pulse 2s ease-in-out infinite;
    "></div>
    <div style="
      position: relative; width: 18px; height: 18px;
      background: #ab3500; border: 3px solid #fff; border-radius: 9999px;
      box-shadow: 0 4px 12px rgba(171,53,0,0.5);
    "></div>
  </div>
  <style>
    @keyframes tindivo-pulse {
      0%, 100% { transform: scale(1); opacity: 0.6; }
      50% { transform: scale(1.4); opacity: 0.2; }
    }
  </style>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
})

// Icono de referencia (no editable): azul intenso con halo, forma cuadrada
// redondeada para diferenciarlo claramente del marker editable (naranja
// circular). El azul contrasta fuerte con el cream/orange del tile OSM
// y con los textos grises de las calles.
const referenceIcon = new L.DivIcon({
  className: '',
  html: `<div style="
    width: 32px; height: 32px; position: relative;
    display: flex; align-items: center; justify-content: center;
  ">
    <div style="
      position: absolute; inset: 0;
      background: rgba(29, 78, 216, 0.22); border-radius: 9999px;
    "></div>
    <div style="
      position: relative; width: 22px; height: 22px;
      background: #1D4ED8; border: 3px solid #fff; border-radius: 7px;
      box-shadow: 0 4px 12px rgba(29, 78, 216, 0.55);
      display: flex; align-items: center; justify-content: center;
    ">
      <div style="
        width: 9px; height: 9px; background: #fff; border-radius: 2px;
      "></div>
    </div>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
})

function ClickCapture({ onSelect }: { onSelect: (c: Coordinates) => void }) {
  useMapEvents({
    click(e) {
      onSelect({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return null
}

/**
 * Mapa interactivo Leaflet. El usuario hace click o arrastra el marker
 * para seleccionar un punto. Emite `onChange` con las coordenadas.
 *
 * Opcionalmente acepta `referenceMarker` para pintar un segundo punto
 * de referencia visual (no editable, ícono distinto).
 */
export function InteractiveMap({
  initialCenter,
  initialZoom = 16,
  value,
  onChange,
  referenceMarker,
  readOnly = false,
  className,
  height = 400,
}: Props) {
  const [marker, setMarker] = useState<Coordinates | null>(value ?? null)
  const [mountKey, setMountKey] = useState<number | null>(null)
  const center = useMemo(() => value ?? initialCenter ?? defaultCenter, [value, initialCenter])
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Generar un key único por mount (evita double-init de Leaflet en React strict
  // mode de dev donde el componente se monta → desmonta → monta).
  useEffect(() => {
    setMountKey(Date.now() + Math.random())
    return () => {
      // Cleanup agresivo: eliminar el _leaflet_id del contenedor si quedó huérfano
      const el = containerRef.current?.querySelector<HTMLElement>('.leaflet-container')
      if (el) {
        const anyEl = el as unknown as { _leaflet_id?: number }
        if (anyEl._leaflet_id !== undefined) anyEl._leaflet_id = undefined
      }
    }
  }, [])

  useEffect(() => {
    if (value) setMarker(value)
  }, [value])

  const handleSelect = useCallback(
    (coords: Coordinates) => {
      if (readOnly) return
      setMarker(coords)
      onChange?.(coords)
    },
    [onChange, readOnly],
  )

  return (
    <div
      ref={containerRef}
      className={cn(
        'w-full rounded-xl overflow-hidden border border-outline-variant/30 shadow-[0_4px_20px_rgba(171,53,0,0.04)]',
        className,
      )}
      // `isolation: isolate` crea un nuevo stacking context que contiene
      // los z-index altos de Leaflet (.leaflet-pane=400, .leaflet-control=1000)
      // dentro del contenedor del mapa. Sin esto, esos z-index escapan y el
      // mapa se superpone sobre elementos `position: fixed` del layout
      // (p.ej. el BottomActionBar).
      style={{ height, isolation: 'isolate' }}
    >
      {mountKey === null ? (
        <div className="h-full w-full bg-surface-container animate-pulse" />
      ) : (
        <MapContainer
          key={mountKey}
          center={[center.lat, center.lng]}
          zoom={initialZoom}
          scrollWheelZoom
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          {!readOnly && <ClickCapture onSelect={handleSelect} />}
          {referenceMarker && (
            <Marker
              position={[referenceMarker.lat, referenceMarker.lng]}
              icon={referenceIcon}
              draggable={false}
              interactive={false}
              keyboard={false}
            />
          )}
          {marker && (
            <Marker
              position={[marker.lat, marker.lng]}
              icon={markerIcon}
              draggable={!readOnly}
              eventHandlers={{
                dragend(e) {
                  const pos = (e.target as L.Marker).getLatLng()
                  handleSelect({ lat: pos.lat, lng: pos.lng })
                },
              }}
            />
          )}
        </MapContainer>
      )}
    </div>
  )
}
