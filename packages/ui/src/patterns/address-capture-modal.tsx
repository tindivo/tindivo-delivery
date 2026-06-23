'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { SAN_JACINTO_CENTER } from '@tindivo/core'
import dynamic from 'next/dynamic'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from '../icons/icon'
import { Button } from '../primitives/button'
import { Input } from '../primitives/input'

const InteractiveMap = dynamic(
  () => import('./interactive-map').then((mod) => mod.InteractiveMap),
  { ssr: false },
)

type Coordinates = { lat: number; lng: number }

type Props = {
  open: boolean
  initialLat?: number | null
  initialLng?: number | null
  initialReference?: string | null
  onConfirm: (
    lat: number,
    lng: number,
    reference: string | undefined,
    distanceDragged: number,
    accuracy: number,
  ) => void
  onSkip: () => void
  showReferenceField?: boolean
  onShown?: (accuracy: number | null) => void
  variant?: 'driver' | 'admin'
  initialCustomerName?: string | null
  onConfirmAdmin?: (data: {
    lat: number
    lng: number
    reference: string
    customerName: string
  }) => void
}

function getHaversineDistance(coords1: Coordinates, coords2: Coordinates): number {
  const toRad = (x: number) => (x * Math.PI) / 180
  const R = 6371e3 // Earth radius in meters
  const dLat = toRad(coords2.lat - coords1.lat)
  const dLng = toRad(coords2.lng - coords1.lng)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(coords1.lat)) *
      Math.cos(toRad(coords2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c)
}

export function AddressCaptureModal({
  open,
  initialLat,
  initialLng,
  initialReference,
  onConfirm,
  onSkip,
  showReferenceField = false,
  onShown,
  variant = 'driver',
  initialCustomerName,
  onConfirmAdmin,
}: Props) {
  const [loading, setLoading] = useState(true)
  const [gpsCoords, setGpsCoords] = useState<Coordinates | null>(null)
  const [currentCoords, setCurrentCoords] = useState<Coordinates | null>(null)
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [reference, setReference] = useState(initialReference ?? '')
  const [customerName, setCustomerName] = useState(initialCustomerName ?? '')

  useEffect(() => {
    if (open) {
      setReference(initialReference ?? '')
      setCustomerName(initialCustomerName ?? '')
    }
  }, [open, initialReference, initialCustomerName])

  // Use a ref for onShown to avoid re-triggering the useEffect on every reference change
  const onShownRef = useRef(onShown)
  useEffect(() => {
    onShownRef.current = onShown
  }, [onShown])

  useEffect(() => {
    if (!open) return

    setLoading(true)
    let active = true

    if (initialLat != null && initialLng != null) {
      const coords = { lat: initialLat, lng: initialLng }
      setGpsCoords(coords)
      setCurrentCoords(coords)
      setAccuracy(null)
      setLoading(false)
      onShownRef.current?.(null)
      return
    }

    if (variant === 'admin' || !navigator.geolocation) {
      setGpsCoords(SAN_JACINTO_CENTER)
      setCurrentCoords(SAN_JACINTO_CENTER)
      setAccuracy(null)
      setLoading(false)
      onShownRef.current?.(null)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!active) return
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }
        setGpsCoords(coords)
        setCurrentCoords(coords)
        const acc = Math.round(position.coords.accuracy)
        setAccuracy(acc)
        setLoading(false)
        onShownRef.current?.(acc)
      },
      (error) => {
        if (!active) return
        console.error('Error obtaining GPS coordinates:', error)
        setGpsCoords(SAN_JACINTO_CENTER)
        setCurrentCoords(SAN_JACINTO_CENTER)
        setAccuracy(null)
        setLoading(false)
        onShownRef.current?.(null)
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      },
    )

    return () => {
      active = false
    }
  }, [open, initialLat, initialLng, variant])

  const handleConfirm = useCallback(() => {
    if (!currentCoords) return
    if (variant === 'admin') {
      onConfirmAdmin?.({
        lat: currentCoords.lat,
        lng: currentCoords.lng,
        reference: reference.trim(),
        customerName: customerName.trim(),
      })
    } else {
      if (!gpsCoords) return
      const distance = getHaversineDistance(gpsCoords, currentCoords)
      const finalAccuracy = accuracy ?? 999
      const finalReference = reference.trim() !== (initialReference ?? '') ? reference : undefined

      onConfirm(currentCoords.lat, currentCoords.lng, finalReference, distance, finalAccuracy)
    }
  }, [
    variant,
    currentCoords,
    gpsCoords,
    accuracy,
    reference,
    initialReference,
    customerName,
    onConfirm,
    onConfirmAdmin,
  ])

  if (!open) return null

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onSkip()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity" />
        <Dialog.Content className="fixed inset-0 z-50 flex flex-col bg-background outline-hidden md:inset-auto md:top-1/2 md:left-1/2 md:h-[90vh] md:w-[600px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-outline-variant/30 px-6 py-4">
            <div className="flex items-center gap-2">
              <Icon name="my_location" className="text-primary" />
              <Dialog.Title className="text-lg font-bold text-foreground">
                {variant === 'admin' ? 'Curar Cliente y Ubicación' : 'Capturar Ubicación'}
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                onClick={onSkip}
                className="rounded-full p-2 text-muted-foreground hover:bg-muted"
                aria-label="Cerrar modal"
              >
                <Icon name="close" />
              </button>
            </Dialog.Close>
          </div>

          {/* Map Area */}
          <div className="relative flex-1 bg-surface-container-lowest">
            {loading ? (
              <div className="flex h-full w-full flex-col items-center justify-center gap-4">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-sm text-muted-foreground">Obteniendo señal de GPS...</p>
              </div>
            ) : (
              currentCoords && (
                <InteractiveMap
                  value={currentCoords}
                  onChange={setCurrentCoords}
                  height="100%"
                  className="rounded-none border-none shadow-none"
                />
              )
            )}
          </div>

          {/* Bottom Panel */}
          <div className="flex flex-col gap-4 border-t border-outline-variant/30 bg-background p-6">
            {/* GPS Accuracy */}
            {!loading && variant !== 'admin' && (
              <div className="flex flex-col gap-1 rounded-xl bg-surface-container-low p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon name="radar" size={18} />
                  <span>
                    {accuracy !== null
                      ? `Precisión del GPS: ~${accuracy}m`
                      : 'Precisión del GPS: No disponible'}
                  </span>
                </div>
                {accuracy !== null && accuracy > 50 && (
                  <p className="text-xs text-muted-foreground">
                    Si el pin no está donde estás parado, arrástralo.
                  </p>
                )}
              </div>
            )}

            {/* Customer Name Input (Admin only) */}
            {variant === 'admin' && (
              <div className="flex flex-col gap-2">
                <label htmlFor="name-input" className="text-xs font-semibold text-muted-foreground">
                  Nombre del cliente
                </label>
                <Input
                  id="name-input"
                  type="text"
                  placeholder="Ej: Juan Pérez"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full text-sm"
                />
              </div>
            )}

            {/* Reference Input */}
            {(showReferenceField || variant === 'admin') && (
              <div className="flex flex-col gap-2">
                <label htmlFor="ref-input" className="text-xs font-semibold text-muted-foreground">
                  {variant === 'admin'
                    ? 'Referencia de la dirección'
                    : 'Mejorar referencia (opcional)'}
                </label>
                <Input
                  id="ref-input"
                  type="text"
                  placeholder="Ej: Portón verde frente al parque"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full text-sm"
                />
              </div>
            )}

            {/* Actions */}
            <div className="grid grid-cols-2 gap-4">
              <Button variant="secondary" onClick={onSkip} className="h-12 text-base font-semibold">
                {variant === 'admin' ? 'Cancelar' : 'Omitir'}
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirm}
                disabled={loading || !currentCoords}
                className="h-12 bg-green-600 text-base font-semibold text-white hover:bg-green-700 active:bg-green-800 disabled:bg-muted"
              >
                {variant === 'admin' ? 'Guardar' : 'Confirmar'}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
