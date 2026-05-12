'use client'
import { customer } from '@/lib/api/client'
import { supabase } from '@/lib/supabase/client'
import { ApiError } from '@tindivo/api-client'
import { Button, Icon, IconButton, Input, Label } from '@tindivo/ui'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'

type Mode = 'login' | 'register'

type Props = {
  initialMode?: Mode
  onClose: () => void
  onSuccess: () => void
}

export function LoginRegisterSheet({ initialMode = 'login', onClose, onSuccess }: Props) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [accountType, setAccountType] = useState<'customer' | 'business'>('customer')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [address, setAddress] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Bump a cada error nuevo para re-disparar la animacion del banner
  // (Motion lo identifica por `key` y replay desde el initial state).
  const [errorPulse, setErrorPulse] = useState(0)

  function showError(msg: string) {
    setError(msg)
    setErrorPulse((n) => n + 1)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) {
        showError(
          err.message.includes('Invalid login')
            ? 'Email o contrasena invalidos. Intenta de nuevo.'
            : err.message,
        )
        return
      }
      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (accountType === 'business') {
        await customer.register({
          accountType: 'business',
          email,
          password,
          fullName,
          phone,
          businessName,
          address,
          description: description.trim() || undefined,
        })
      } else {
        await customer.register({
          accountType: 'customer',
          email,
          password,
          fullName,
          phone: phone.length === 9 ? phone : undefined,
        })
      }
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) {
        showError('Cuenta creada. Vuelve a intentar iniciar sesion.')
        setMode('login')
        return
      }
      onSuccess()
    } catch (err) {
      if (err instanceof ApiError) {
        showError(err.problem.detail ?? err.problem.title)
      } else {
        showError('No se pudo crear la cuenta. Intenta de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="customer-sheet-overlay z-[80]" aria-modal="true">
      <button type="button" aria-label="Cerrar" className="absolute inset-0" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 48, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        className="customer-sheet pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-20 bg-[#fffaf6]/84 px-5 pb-3 pt-3 backdrop-blur-2xl">
          <div className="mx-auto mb-3 customer-sheet-handle md:hidden" />
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="customer-shimmer inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[20px] bg-white shadow-[0_14px_38px_-28px_rgba(171,53,0,0.72)]">
                <img src="/icon.svg" alt="" className="h-9 w-9 object-contain" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase text-primary-container">Tindivo</p>
                <h2 className="truncate text-2xl font-black leading-tight text-on-surface">
                  {mode === 'login' ? 'Entrar' : 'Crear cuenta'}
                </h2>
              </div>
            </div>
            <IconButton variant="subtle" onClick={onClose} aria-label="Cerrar">
              <Icon name="close" />
            </IconButton>
          </div>
        </div>

        <div className="mx-auto max-w-md px-5 pt-2">
          <div className="mb-5 rounded-[28px] bg-white/52 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
            <div className="grid grid-cols-2 gap-1.5">
              <ModeButton
                active={mode === 'login'}
                icon="login"
                label="Entrar"
                onClick={() => setMode('login')}
              />
              <ModeButton
                active={mode === 'register'}
                icon="person_add"
                label="Registro"
                onClick={() => setMode('register')}
              />
            </div>
          </div>

          {mode === 'register' && (
            <div className="customer-reveal mb-5 rounded-[28px] bg-gradient-to-br from-white/86 to-[#f5fff8]/78 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
              <p className="mb-2 px-1 text-xs font-black uppercase text-on-surface-variant">
                Tipo de cuenta
              </p>
              <div className="grid grid-cols-2 gap-2">
                <AccountTypeButton
                  active={accountType === 'customer'}
                  icon="person"
                  label="Cliente"
                  onClick={() => setAccountType('customer')}
                />
                <AccountTypeButton
                  active={accountType === 'business'}
                  icon="storefront"
                  label="Negocio"
                  onClick={() => setAccountType('business')}
                />
              </div>
            </div>
          )}

          <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-4">
            {mode === 'register' && (
              <div className="customer-reveal space-y-4">
                <Field label="Nombre completo" htmlFor="auth-fullname" icon="badge">
                  <Input
                    id="auth-fullname"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Tu nombre"
                    autoComplete="name"
                    required
                    minLength={2}
                    className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                  />
                </Field>
                <Field
                  label={accountType === 'business' ? 'Celular del negocio' : 'Celular opcional'}
                  htmlFor="auth-phone"
                  icon="phone_iphone"
                >
                  <Input
                    id="auth-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                    placeholder="9 digitos"
                    inputMode="numeric"
                    autoComplete="tel"
                    required={accountType === 'business'}
                    className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                  />
                </Field>
                {accountType === 'business' && (
                  <div className="customer-reveal space-y-4">
                    <Field
                      label="Nombre del negocio"
                      htmlFor="auth-business-name"
                      icon="storefront"
                    >
                      <Input
                        id="auth-business-name"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="Ej. El Buen Sabor"
                        required
                        minLength={2}
                        className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                      />
                    </Field>
                    <Field label="Direccion" htmlFor="auth-business-address" icon="location_on">
                      <Input
                        id="auth-business-address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Calle, numero, referencia"
                        required
                        minLength={5}
                        className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                      />
                    </Field>
                    <div className="space-y-1.5">
                      <Label htmlFor="auth-business-description">Descripcion breve</Label>
                      <textarea
                        id="auth-business-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                        rows={3}
                        className="customer-textarea"
                        placeholder="Especialidad, horarios o algo que el cliente deba saber"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <Field label="Correo" htmlFor="auth-email" icon="mail">
              <Input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.pe"
                autoComplete="email"
                required
                className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              />
            </Field>

            <Field label="Contrasena" htmlFor="auth-password" icon="lock">
              <Input
                id="auth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'Minimo 8 caracteres' : 'Tu contrasena'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                minLength={8}
                className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              />
            </Field>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  key={`err-${errorPulse}`}
                  role="alert"
                  aria-live="assertive"
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    x: [0, -10, 10, -8, 8, -4, 4, 0],
                  }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{
                    opacity: { duration: 0.18 },
                    y: { type: 'spring', damping: 22, stiffness: 320 },
                    scale: { type: 'spring', damping: 22, stiffness: 320 },
                    x: { duration: 0.5, ease: 'easeInOut' },
                  }}
                  className="relative overflow-hidden rounded-[24px] border border-red-200/80 bg-gradient-to-br from-red-50 via-rose-50 to-red-50 px-4 py-3 shadow-[0_18px_42px_-26px_rgba(220,38,38,0.55)]"
                >
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                      <Icon name="error" size={20} filled />
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-red-700/80">
                        No pudimos entrar
                      </p>
                      <p className="mt-0.5 text-sm font-bold leading-snug text-red-900">{error}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Button type="submit" size="lg" className="w-full rounded-[24px]" disabled={loading}>
              <Icon
                name={loading ? 'progress_activity' : mode === 'login' ? 'login' : 'arrow_forward'}
                className={loading ? 'animate-spin' : undefined}
              />
              {loading ? 'Procesando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}

function ModeButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean
  icon: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`customer-lift flex min-h-12 items-center justify-center gap-2 rounded-[22px] text-sm font-black transition-colors ${
        active
          ? 'bg-white text-on-surface shadow-[0_10px_26px_-22px_rgba(119,52,21,0.7)]'
          : 'text-on-surface-variant'
      }`}
    >
      <Icon name={icon} size={18} />
      {label}
    </button>
  )
}

function AccountTypeButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean
  icon: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`customer-lift flex min-h-16 flex-col items-center justify-center gap-1 rounded-[24px] border text-sm font-black ${
        active
          ? 'border-primary-container bg-primary-container text-white shadow-[0_16px_38px_-28px_rgba(171,53,0,0.8)]'
          : 'border-white/70 bg-white/72 text-on-surface'
      }`}
    >
      <Icon name={icon} size={22} filled={active} />
      {label}
    </button>
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
