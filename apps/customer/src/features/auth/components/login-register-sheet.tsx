'use client'
import { customer } from '@/lib/api/client'
import { supabase } from '@/lib/supabase/client'
import { ApiError } from '@tindivo/api-client'
import { Button, Icon, IconButton, Input, Label } from '@tindivo/ui'
import { motion } from 'motion/react'
import { useState } from 'react'

type Mode = 'login' | 'register'

type Props = {
  initialMode?: Mode
  onClose: () => void
  onSuccess: () => void
}

/**
 * Bottom sheet con tabs Login/Registrar. Tras éxito hace signInWithPassword
 * para que el usuario quede con sesión activa. La cookie sb-* del browser
 * se setea automáticamente y `useCustomerAuth` reacciona via
 * onAuthStateChange.
 */
export function LoginRegisterSheet({ initialMode = 'login', onClose, onSuccess }: Props) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) {
        setError(err.message.includes('Invalid login') ? 'Email o contraseña inválidos' : err.message)
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
      await customer.register({
        email,
        password,
        fullName,
        phone: phone.length === 9 ? phone : undefined,
      })
      // Login inmediato tras registrar
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) {
        setError('Cuenta creada — vuelve a intentar iniciar sesión')
        setMode('login')
        return
      }
      onSuccess()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.problem.detail ?? err.problem.title)
      } else {
        setError('No se pudo crear la cuenta. Intenta de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/40 flex items-end" role="dialog">
      <button type="button" aria-label="Cerrar" className="absolute inset-0" onClick={onClose} />
      <motion.div
        initial={{ y: 640 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 260 }}
        className="relative z-10 w-full max-h-[92vh] overflow-y-auto rounded-t-[28px] bg-surface pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/10">
          <h2 className="text-xl font-black">{mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</h2>
          <IconButton variant="subtle" onClick={onClose} aria-label="Cerrar">
            <Icon name="close" />
          </IconButton>
        </div>

        <div className="px-5 pt-4 max-w-md mx-auto">
          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-surface-container mb-5">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`py-2 rounded-xl text-sm font-bold transition-colors ${
                mode === 'login'
                  ? 'bg-surface text-on-surface shadow-sm'
                  : 'text-on-surface-variant'
              }`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`py-2 rounded-xl text-sm font-bold transition-colors ${
                mode === 'register'
                  ? 'bg-surface text-on-surface shadow-sm'
                  : 'text-on-surface-variant'
              }`}
            >
              Crear cuenta
            </button>
          </div>

          <form
            onSubmit={mode === 'login' ? handleLogin : handleRegister}
            className="space-y-4"
          >
            {mode === 'register' && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="auth-fullname">Nombre completo</Label>
                  <Input
                    id="auth-fullname"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Tu nombre"
                    autoComplete="name"
                    required
                    minLength={2}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="auth-phone">Celular (opcional)</Label>
                  <Input
                    id="auth-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                    placeholder="9 dígitos"
                    inputMode="numeric"
                    autoComplete="tel"
                  />
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="auth-email">Correo</Label>
              <Input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.pe"
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="auth-password">Contraseña</Label>
              <Input
                id="auth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'Mínimo 8 caracteres' : 'Tu contraseña'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                minLength={8}
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              <Icon
                name={loading ? 'progress_activity' : 'arrow_forward'}
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
