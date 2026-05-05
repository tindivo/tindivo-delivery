'use client'
import { customer } from '@/lib/api/client'
import { useQuery } from '@tanstack/react-query'
import { ApiError } from '@tindivo/api-client'
import { Button, GlassTopBar, Icon, IconButton, Input, Label, Skeleton } from '@tindivo/ui'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useCustomerAuth } from '../hooks/use-customer-auth'

/**
 * Vista del perfil del cliente: edita nombre, teléfono, dirección y
 * referencia de entrega por defecto (precarga el checkout). Si el cliente
 * no tiene sesión, redirige automáticamente a /.
 */
export function AccountView() {
  const router = useRouter()
  const { session, loading, logout } = useCustomerAuth()
  const profileQuery = useQuery({
    queryKey: ['customer', 'profile'],
    queryFn: () => customer.getMyProfile(),
    enabled: Boolean(session),
  })
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [defaultAddress, setDefaultAddress] = useState('')
  const [defaultReference, setDefaultReference] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !session) router.replace('/')
  }, [loading, session, router])

  useEffect(() => {
    const p = profileQuery.data?.profile
    if (p) {
      setFullName(p.fullName)
      setPhone(p.phone ?? '')
      setDefaultAddress(p.defaultAddress ?? '')
      setDefaultReference(p.defaultReference ?? '')
      setSavedAt(p.updatedAt)
    }
  }, [profileQuery.data])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const res = await customer.updateMyProfile({
        fullName: fullName.trim(),
        phone: phone.length === 9 ? phone : null,
        defaultAddress: defaultAddress.trim() || null,
        defaultReference: defaultReference.trim() || null,
      })
      setSavedAt(res.profile.updatedAt)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.problem.detail ?? err.problem.title)
      } else {
        setError('No se pudo guardar. Intenta de nuevo.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleLogout() {
    await logout()
    router.replace('/')
  }

  if (loading || !session) {
    return (
      <div className="min-h-screen">
        <GlassTopBar title="MI CUENTA" subtitle="" />
        <main className="pt-24 px-4 max-w-md mx-auto">
          <Skeleton className="h-40" />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-12">
      <GlassTopBar
        title="MI CUENTA"
        subtitle={session.email}
        left={
          <IconButton variant="ghost" onClick={() => router.push('/')} aria-label="Volver">
            <Icon name="arrow_back" />
          </IconButton>
        }
      />

      <main className="pt-24 px-4 max-w-md mx-auto space-y-5">
        <Link
          href="/cuenta/historial"
          className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/15"
        >
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary-container/10">
              <Icon name="receipt_long" size={20} className="text-primary-container" />
            </span>
            <div>
              <p className="font-bold text-on-surface">Mis pedidos</p>
              <p className="text-xs text-on-surface-variant">Historial completo</p>
            </div>
          </div>
          <Icon name="arrow_forward" size={18} className="text-on-surface-variant" />
        </Link>

        {profileQuery.isLoading ? (
          <Skeleton className="h-60" />
        ) : (
          <form
            onSubmit={handleSave}
            className="space-y-4 p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/15"
          >
            <h2 className="text-[10px] font-bold tracking-[0.2em] uppercase text-on-surface-variant">
              Mis datos
            </h2>

            <div className="space-y-1.5">
              <Label htmlFor="profile-name">Nombre</Label>
              <Input
                id="profile-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                minLength={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-phone">Celular</Label>
              <Input
                id="profile-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                placeholder="9 dígitos"
                inputMode="numeric"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-address">Dirección habitual</Label>
              <Input
                id="profile-address"
                value={defaultAddress}
                onChange={(e) => setDefaultAddress(e.target.value)}
                placeholder="Calle, número"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-reference">Referencia</Label>
              <textarea
                id="profile-reference"
                value={defaultReference}
                onChange={(e) => setDefaultReference(e.target.value.slice(0, 500))}
                rows={3}
                placeholder="Frente a, piso, color..."
                className="w-full rounded-[20px] border border-outline-variant/35 bg-surface-container-lowest px-4 py-3 text-sm resize-none"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={saving}>
              <Icon name={saving ? 'progress_activity' : 'check'} className={saving ? 'animate-spin' : undefined} />
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>

            {savedAt && !saving && (
              <p className="text-xs text-on-surface-variant text-center">
                Última actualización: {new Date(savedAt).toLocaleString('es-PE')}
              </p>
            )}
          </form>
        )}

        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-outline-variant/30 text-on-surface-variant hover:text-red-700 hover:border-red-300 transition-colors"
        >
          <Icon name="logout" size={16} />
          Cerrar sesión
        </button>
      </main>
    </div>
  )
}
