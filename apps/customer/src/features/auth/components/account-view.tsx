'use client'
import { customer } from '@/lib/api/client'
import { useQuery } from '@tanstack/react-query'
import { ApiError } from '@tindivo/api-client'
import { Button, GlassTopBar, Icon, IconButton, Input, Label, Skeleton } from '@tindivo/ui'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { useCustomerAuth } from '../hooks/use-customer-auth'

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
    if (!loading && session?.role === 'business') router.replace('/negocio')
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

  const completion = useMemo(() => {
    const checks = [
      fullName.trim().length >= 2,
      phone.length === 9,
      defaultAddress.trim().length >= 5,
    ]
    return Math.round((checks.filter(Boolean).length / checks.length) * 100)
  }, [defaultAddress, fullName, phone])

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
      <div className="customer-page">
        <GlassTopBar title="Mi cuenta" />
        <main className="mx-auto max-w-md px-4 pt-24">
          <Skeleton className="h-40" />
        </main>
      </div>
    )
  }

  return (
    <div className="customer-page pb-12">
      <GlassTopBar
        title="Mi cuenta"
        subtitle={session.email}
        left={
          <IconButton variant="ghost" onClick={() => router.push('/')} aria-label="Volver">
            <Icon name="arrow_back" />
          </IconButton>
        }
      />

      <main className="mx-auto max-w-5xl space-y-5 px-4 pt-24 md:grid md:grid-cols-[0.92fr_1.08fr] md:gap-5 md:space-y-0">
        <section className="space-y-5">
          <div className="customer-soft-gradient customer-shimmer customer-fade-up overflow-hidden rounded-[36px] p-5 text-white md:p-7">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase text-white/82">Perfil cliente</p>
                <h1 className="mt-2 text-3xl font-black leading-tight md:text-4xl">
                  {fullName || 'Tu cuenta Tindivo'}
                </h1>
                <p className="mt-2 text-sm font-bold leading-relaxed text-white/88">
                  Guarda tus datos una vez y acelera cada pedido.
                </p>
              </div>
              <img
                src="/icon.svg"
                alt=""
                className="h-16 w-16 shrink-0 rounded-[22px] bg-white p-1"
              />
            </div>

            <div className="mt-6 rounded-[28px] bg-white/18 p-3 backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-black">Perfil listo</span>
                <span className="text-2xl font-black">{completion}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/22">
                <div
                  className="h-full rounded-full bg-white transition-all duration-500"
                  style={{ width: `${completion}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <QuickLink
              href="/cuenta/historial"
              icon="receipt_long"
              label="Pedidos"
              value="Historial"
            />
            <QuickLink href="/" icon="restaurant" label="Explorar" value="Locales" />
          </div>
        </section>

        <section className="space-y-5">
          {profileQuery.isLoading ? (
            <Skeleton className="h-96 rounded-[32px]" />
          ) : (
            <form
              onSubmit={handleSave}
              className="customer-panel-soft space-y-4 rounded-[32px] p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-on-surface">Datos de entrega</h2>
                  <p className="mt-1 text-sm font-semibold text-on-surface-variant">
                    Se precargan automaticamente en el checkout.
                  </p>
                </div>
                <span className="customer-chip text-emerald-900">
                  <Icon name="verified" size={16} filled />
                  Local
                </span>
              </div>

              <Field label="Nombre" htmlFor="profile-name" icon="person">
                <Input
                  id="profile-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  minLength={2}
                  className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                />
              </Field>

              <Field label="Celular" htmlFor="profile-phone" icon="phone_iphone">
                <Input
                  id="profile-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  placeholder="9 digitos"
                  inputMode="numeric"
                  className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                />
              </Field>

              <Field label="Direccion habitual" htmlFor="profile-address" icon="home_pin">
                <Input
                  id="profile-address"
                  value={defaultAddress}
                  onChange={(e) => setDefaultAddress(e.target.value)}
                  placeholder="Calle, numero"
                  className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                />
              </Field>

              <div className="space-y-1.5">
                <Label htmlFor="profile-reference">Referencia</Label>
                <textarea
                  id="profile-reference"
                  value={defaultReference}
                  onChange={(e) => setDefaultReference(e.target.value.slice(0, 500))}
                  rows={3}
                  placeholder="Frente a, piso, color de puerta..."
                  className="customer-textarea"
                />
              </div>

              {error && (
                <div className="customer-reveal rounded-[22px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
                  {error}
                </div>
              )}

              <Button type="submit" size="lg" className="w-full rounded-[24px]" disabled={saving}>
                <Icon
                  name={saving ? 'progress_activity' : 'check'}
                  className={saving ? 'animate-spin' : undefined}
                />
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </Button>

              {savedAt && !saving && (
                <p className="text-center text-xs font-semibold text-on-surface-variant">
                  Ultima actualizacion: {new Date(savedAt).toLocaleString('es-PE')}
                </p>
              )}
            </form>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="customer-lift flex w-full items-center justify-center gap-2 rounded-[24px] border border-outline-variant/30 bg-white/64 px-4 py-3 text-sm font-black text-on-surface-variant transition-colors hover:border-red-300 hover:text-red-700"
          >
            <Icon name="logout" size={18} />
            Cerrar sesion
          </button>
        </section>
      </main>
    </div>
  )
}

function QuickLink({
  href,
  icon,
  label,
  value,
}: {
  href: string
  icon: string
  label: string
  value: string
}) {
  return (
    <Link
      href={href}
      className="customer-lift customer-panel-soft flex min-h-28 flex-col justify-between rounded-[28px] p-4"
    >
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-[18px] bg-primary-fixed text-on-primary-fixed">
        <Icon name={icon} size={22} filled />
      </span>
      <span>
        <span className="block text-xs font-black uppercase text-on-surface-variant">{label}</span>
        <span className="block text-lg font-black text-on-surface">{value}</span>
      </span>
    </Link>
  )
}

function Field({
  label,
  htmlFor,
  icon,
  children,
}: {
  label: string
  htmlFor: string
  icon: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      <div className="customer-field-surface flex h-14 items-center gap-3 px-4">
        <Icon name={icon} size={20} className="shrink-0 text-primary-container" />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}
