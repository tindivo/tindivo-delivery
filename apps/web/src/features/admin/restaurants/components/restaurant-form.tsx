'use client'
import { ActiveStatusToggle } from '@/features/admin/shared/components/active-status-toggle'
import { ApiError } from '@tindivo/api-client'
import type { Restaurants } from '@tindivo/contracts'
import { SAN_JACINTO_CENTER } from '@tindivo/core'
import { Button, Icon, Input, Label } from '@tindivo/ui'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  useCreateRestaurant,
  useSetRestaurantActive,
  useUpdateRestaurant,
} from '../hooks/use-admin-restaurants'
import { QrUploader } from './qr-uploader'

// Leaflet toca `window` en su top-level: cargar solo en cliente.
const InteractiveMap = dynamic(
  () => import('@tindivo/ui/patterns/interactive-map').then((m) => m.InteractiveMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[360px] w-full rounded-xl bg-surface-container animate-pulse" />
    ),
  },
)

type Coords = { lat: number; lng: number }

type Props = {
  mode: 'create' | 'edit'
  initial?: {
    id: string
    name: string
    phone: string
    address: string
    yape_number: string | null
    qr_url: string | null
    qr_url_secondary: string | null
    accent_color: string
    coordinates_lat: number | null
    coordinates_lng: number | null
    commission_per_order: number
    far_distance_surcharge?: number
    is_active: boolean
  }
}

export function RestaurantForm({ mode, initial }: Props) {
  const router = useRouter()
  const create = useCreateRestaurant()
  const update = useUpdateRestaurant(initial?.id ?? '')
  const setActive = useSetRestaurantActive(initial?.id ?? '')

  const [name, setName] = useState(initial?.name ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const [yapeNumber, setYapeNumber] = useState(initial?.yape_number ?? '')
  const [accentColor, setAccentColor] = useState(initial?.accent_color ?? 'FF6B35')
  const [qrUrl, setQrUrl] = useState<string | null>(initial?.qr_url ?? null)
  const [qrUrlSecondary, setQrUrlSecondary] = useState<string | null>(
    initial?.qr_url_secondary ?? null,
  )
  const [coords, setCoords] = useState<Coords | null>(
    initial?.coordinates_lat != null && initial?.coordinates_lng != null
      ? { lat: initial.coordinates_lat, lng: initial.coordinates_lng }
      : null,
  )
  const [commissionPerOrder, setCommissionPerOrder] = useState<string>(
    initial?.commission_per_order != null
      ? Number(initial.commission_per_order).toFixed(2)
      : '3.00',
  )
  const [farDistanceSurcharge, setFarDistanceSurcharge] = useState<string>(
    initial?.far_distance_surcharge != null
      ? Number(initial.far_distance_surcharge).toFixed(2)
      : '0.50',
  )
  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerPassword, setOwnerPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const pending = create.isPending || update.isPending

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    setErrorMsg(null)

    if (!coords) {
      setErrorMsg('Marca la ubicación exacta del restaurante en el mapa.')
      return
    }

    const commission = Number(commissionPerOrder)
    if (!Number.isFinite(commission) || commission < 0 || commission > 100) {
      setErrorMsg('La comisión debe ser un número entre 0 y 100.')
      return
    }
    const commissionRounded = Math.round(commission * 100) / 100

    const surcharge = Number(farDistanceSurcharge)
    if (!Number.isFinite(surcharge) || surcharge < 0 || surcharge > 100) {
      setErrorMsg('El adicional por entrega lejos debe ser un número entre 0 y 100.')
      return
    }
    const surchargeRounded = Math.round(surcharge * 100) / 100

    if (mode === 'create') {
      const body: Restaurants.CreateRestaurantRequest = {
        name,
        phone,
        address,
        yapeNumber: yapeNumber || undefined,
        qrUrl: qrUrl || undefined,
        qrUrlSecondary: qrUrlSecondary || undefined,
        accentColor,
        coordinates: coords,
        commissionPerOrder: commissionRounded,
        farDistanceSurcharge: surchargeRounded,
        ownerEmail,
        ownerPassword,
      }
      try {
        const r = await create.mutateAsync(body)
        router.push(`/admin/restaurants/${r.id}`)
      } catch (err) {
        setErrorMsg(humanizeError(err))
      }
    } else {
      const body: Restaurants.UpdateRestaurantRequest = {
        name,
        phone,
        address,
        yapeNumber: yapeNumber || undefined,
        qrUrl: qrUrl ?? null,
        qrUrlSecondary: qrUrlSecondary ?? null,
        accentColor,
        coordinates: coords,
        commissionPerOrder: commissionRounded,
        farDistanceSurcharge: surchargeRounded,
      }
      try {
        await update.mutateAsync(body)
        router.push('/admin/restaurants')
      } catch (err) {
        setErrorMsg(humanizeError(err))
      }
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {mode === 'edit' && initial && (
        <ActiveStatusToggle
          isActive={initial.is_active}
          subjectLabel={`el restaurante "${initial.name}"`}
          onToggle={(nextIsActive) => setActive.mutateAsync({ isActive: nextIsActive })}
          isPending={setActive.isPending}
        />
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="space-y-4 rounded-2xl bg-surface-container-lowest p-6 border border-outline-variant/15">
          <h2 className="text-xs font-bold tracking-widest uppercase text-on-surface-variant">
            Datos del restaurante
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                maxLength={80}
              />
            </div>
            <div>
              <Label htmlFor="phone">Teléfono (9 dígitos)</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                required
                inputMode="numeric"
                pattern="\d{9}"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="address">Dirección de referencia</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              minLength={5}
              maxLength={200}
              placeholder="Jr. Amazonas 234, Trujillo"
            />
          </div>
          <div>
            <Label>Ubicación exacta en el mapa</Label>
            <p className="text-xs text-on-surface-variant mt-1 mb-2">
              Toca o arrastra el marcador para marcar la posición precisa del local.
            </p>
            <InteractiveMap
              initialCenter={coords ?? SAN_JACINTO_CENTER}
              initialZoom={16}
              value={coords}
              onChange={setCoords}
              height={360}
            />
            {coords && (
              <p className="text-xs text-on-surface-variant font-mono pl-1 mt-2">
                {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="accent">Color de acento</Label>
              <div className="flex gap-2 items-stretch">
                <input
                  type="color"
                  id="accent"
                  value={`#${accentColor}`}
                  onChange={(e) => setAccentColor(e.target.value.replace('#', '').toUpperCase())}
                  className="h-12 w-20 rounded-xl border border-outline-variant/40 cursor-pointer bg-transparent p-1"
                  aria-label="Seleccionar color"
                />
                <Input
                  value={accentColor}
                  onChange={(e) =>
                    setAccentColor(
                      e.target.value
                        .replace(/[^0-9a-fA-F]/g, '')
                        .slice(0, 6)
                        .toUpperCase(),
                    )
                  }
                  required
                  pattern="[0-9a-fA-F]{6}"
                  className="font-mono uppercase"
                  aria-label="Código hexadecimal"
                  placeholder="FF6B35"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="yape">Número Yape/Plin (opcional)</Label>
              <Input
                id="yape"
                value={yapeNumber}
                onChange={(e) => setYapeNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                inputMode="numeric"
                pattern="\d{9}"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="commission">Comisión base por pedido</Label>
              <div className="flex items-stretch gap-2">
                <span className="inline-flex items-center px-3 rounded-xl bg-surface-container border border-outline-variant/30 text-sm font-semibold text-on-surface-variant">
                  S/
                </span>
                <Input
                  id="commission"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={commissionPerOrder}
                  onChange={(e) => setCommissionPerOrder(e.target.value)}
                  required
                  inputMode="decimal"
                  placeholder="3.00"
                  className="font-mono"
                />
              </div>
              <p className="text-xs text-on-surface-variant mt-1">
                Lo que Tindivo cobra al restaurante por pedido entregado, banda "cerca".
              </p>
            </div>
            <div>
              <Label htmlFor="far-surcharge">Adicional por entrega lejos</Label>
              <div className="flex items-stretch gap-2">
                <span className="inline-flex items-center px-3 rounded-xl bg-surface-container border border-outline-variant/30 text-sm font-semibold text-on-surface-variant">
                  S/
                </span>
                <Input
                  id="far-surcharge"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={farDistanceSurcharge}
                  onChange={(e) => setFarDistanceSurcharge(e.target.value)}
                  required
                  inputMode="decimal"
                  placeholder="0.50"
                  className="font-mono"
                />
              </div>
              <p className="text-xs text-on-surface-variant mt-1">
                Se suma a la base cuando el motorizado declara la entrega como lejana.
              </p>
            </div>
          </div>
          <p className="text-xs text-on-surface-variant">
            Estos cambios solo aplican a pedidos NUEVOS. Los pedidos ya creados mantienen los
            valores que tenían al crearse.
          </p>
        </section>

        <section className="space-y-4 rounded-2xl bg-surface-container-lowest p-6 border border-outline-variant/15">
          <div>
            <h2 className="text-xs font-bold tracking-widest uppercase text-on-surface-variant">
              QR Yape / Plin
            </h2>
            <p className="text-xs text-on-surface-variant mt-1">
              Sube hasta 2 QRs. El motorizado verá el principal por defecto y podrá cambiar al
              alternativo si el primero no escanea (humedad, daño, error de imagen).
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>QR principal</Label>
              <QrUploader value={qrUrl} onChange={setQrUrl} restaurantId={initial?.id} />
            </div>
            <div className="space-y-2">
              <Label>QR alternativo (opcional)</Label>
              <QrUploader
                value={qrUrlSecondary}
                onChange={setQrUrlSecondary}
                restaurantId={initial?.id}
              />
            </div>
          </div>
        </section>

        {mode === 'create' && (
          <section className="space-y-4 rounded-2xl bg-surface-container-lowest p-6 border border-outline-variant/15">
            <h2 className="text-xs font-bold tracking-widest uppercase text-on-surface-variant">
              Credenciales del cajero (login a la PWA)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Contraseña temporal (mín 8)</Label>
                <Input
                  id="password"
                  type="text"
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                  required
                  minLength={8}
                  maxLength={80}
                />
              </div>
            </div>
            <p className="text-xs text-on-surface-variant">
              Comparte estas credenciales con el cajero tras la creación.
            </p>
          </section>
        )}

        {errorMsg && (
          <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
            {errorMsg}
          </div>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={pending || !coords} size="lg">
            <Icon name="check" />
            {pending ? 'Guardando...' : mode === 'create' ? 'Crear restaurante' : 'Guardar cambios'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            disabled={pending}
            onClick={() => router.back()}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}

function humanizeError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.problem.code === 'ACCENT_COLOR_TAKEN') {
      return err.problem.detail ?? 'El color ya está tomado. Elige otro.'
    }
    if (err.problem.code === 'VALIDATION_ERROR') {
      return err.problem.detail ?? 'Algún dato no es válido.'
    }
    return err.problem.detail ?? err.problem.title
  }
  return 'Algo salió mal. Intenta de nuevo.'
}
