'use client'
import { ApiError } from '@tindivo/api-client'
import type { Restaurants } from '@tindivo/contracts'
import { Button, Icon, Input, Label } from '@tindivo/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useCreateRestaurant, useUpdateRestaurant } from '../hooks/use-admin-restaurants'
import { QrUploader } from './qr-uploader'

type Props = {
  mode: 'create' | 'edit'
  initial?: {
    id: string
    name: string
    phone: string
    address: string
    yape_number: string | null
    qr_url: string | null
    accent_color: string
  }
}

export function RestaurantForm({ mode, initial }: Props) {
  const router = useRouter()
  const create = useCreateRestaurant()
  const update = useUpdateRestaurant(initial?.id ?? '')

  const [name, setName] = useState(initial?.name ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const [yapeNumber, setYapeNumber] = useState(initial?.yape_number ?? '')
  const [accentColor, setAccentColor] = useState(initial?.accent_color ?? 'FF6B35')
  const [qrUrl, setQrUrl] = useState<string | null>(initial?.qr_url ?? null)
  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerPassword, setOwnerPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const pending = create.isPending || update.isPending

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    setErrorMsg(null)

    if (mode === 'create') {
      const body: Restaurants.CreateRestaurantRequest = {
        name,
        phone,
        address,
        yapeNumber: yapeNumber || undefined,
        qrUrl: qrUrl || undefined,
        accentColor,
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
        accentColor,
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
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
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
          <Label htmlFor="address">Dirección</Label>
          <Input
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
            minLength={5}
            maxLength={200}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="accent">Color de acento (hex sin #)</Label>
            <div className="flex gap-2">
              <Input
                id="accent"
                value={accentColor}
                onChange={(e) =>
                  setAccentColor(e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6))
                }
                required
                pattern="[0-9a-fA-F]{6}"
                className="font-mono uppercase"
              />
              <span
                aria-label="preview color"
                className="w-10 h-10 rounded-lg shrink-0"
                style={{ background: `#${accentColor}` }}
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
      </section>

      <section className="space-y-4 rounded-2xl bg-surface-container-lowest p-6 border border-outline-variant/15">
        <div>
          <h2 className="text-xs font-bold tracking-widest uppercase text-on-surface-variant">
            QR Yape / Plin
          </h2>
          <p className="text-xs text-on-surface-variant mt-1">
            El motorizado mostrará este QR al cliente cuando vaya a entregar un pedido con pago pendiente por Yape.
          </p>
        </div>
        <QrUploader value={qrUrl} onChange={setQrUrl} restaurantId={initial?.id} />
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
        <Button type="submit" disabled={pending} size="lg">
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
