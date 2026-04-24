'use client'
import {
  BottomActionBar,
  Button,
  GlassTopBar,
  Icon,
  IconButton,
  Label,
  PhoneInputPe,
} from '@tindivo/ui'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { usePickup } from '../hooks/use-pickup'

// Leaflet toca `window` en su top-level: cargar solo en cliente.
const InteractiveMap = dynamic(
  () => import('@tindivo/ui/patterns/interactive-map').then((m) => m.InteractiveMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[380px] w-full rounded-xl bg-surface-container animate-pulse" />
    ),
  },
)

type Props = { orderId: string }

type Coords = { lat: number; lng: number }

const DEFAULT_CENTER: Coords = { lat: -8.1116, lng: -79.0286 } // Trujillo

export function PickupForm({ orderId }: Props) {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [coords, setCoords] = useState<Coords | null>(null)
  const [initialCenter, setInitialCenter] = useState<Coords>(DEFAULT_CENTER)
  const pickup = usePickup(orderId)

  useEffect(() => {
    if (!('geolocation' in navigator)) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setInitialCenter(here)
        setCoords(here)
      },
      () => {
        /* ignore */
      },
      { enableHighAccuracy: true, timeout: 5000 },
    )
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!coords) {
      alert('Por favor marca la ubicación del cliente en el mapa.')
      return
    }
    if (!/^9\d{8}$/.test(phone)) {
      alert('Ingresa un celular peruano válido (9 dígitos empezando en 9).')
      return
    }
    pickup.mutate(
      {
        clientPhone: phone,
        deliveryCoordinates: coords,
      },
      {
        onSuccess: () => {
          router.push(`/motorizado/pedidos/${orderId}`)
        },
      },
    )
  }

  return (
    <div
      className="min-h-screen"
      style={{ paddingBottom: 'calc(120px + env(safe-area-inset-bottom))' }}
    >
      <GlassTopBar
        title="DATOS DEL CLIENTE"
        subtitle="Motorizado"
        left={
          <IconButton variant="ghost" onClick={() => router.back()} aria-label="Volver">
            <Icon name="arrow_back" />
          </IconButton>
        }
      />

      <form
        id="pickup-form"
        onSubmit={handleSubmit}
        className="pt-24 px-4 max-w-md mx-auto space-y-5"
      >
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
          <Icon name="tips_and_updates" className="text-amber-600 shrink-0" />
          <div className="text-sm text-amber-900">
            <p className="font-bold mb-1">Usa el papelito rosado</p>
            <p>
              Solo ingresa el <span className="font-semibold">teléfono</span> y marca la{' '}
              <span className="font-semibold">ubicación</span> del cliente en el mapa. No necesitas
              escribir la dirección.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Teléfono del cliente</Label>
          <PhoneInputPe
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
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
          <InteractiveMap
            initialCenter={initialCenter}
            initialZoom={16}
            value={coords}
            onChange={setCoords}
            height={380}
          />
          {coords && (
            <p className="text-xs text-on-surface-variant font-mono pl-1">
              {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
            </p>
          )}
        </div>
      </form>

      <BottomActionBar>
        <Button
          type="submit"
          form="pickup-form"
          size="lg"
          className="w-full"
          disabled={pickup.isPending || !coords || !/^9\d{8}$/.test(phone)}
        >
          {pickup.isPending ? 'Guardando...' : 'Iniciar entrega'}
          <Icon name="arrow_forward" />
        </Button>
      </BottomActionBar>
    </div>
  )
}
