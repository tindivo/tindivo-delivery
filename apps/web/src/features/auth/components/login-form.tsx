'use client'
import { fullSignOut } from '@/features/auth/services/sign-out'
import { supabase } from '@/lib/supabase/client'
import { decodeJwtClaims, getRoles, homePathForRoles } from '@/lib/supabase/jwt-claims'
import { Button, Icon, Input, Label } from '@tindivo/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * Login único para los 3 roles. Tras signInWithPassword, el JWT de Supabase ya
 * contiene `user_role` gracias al Custom Access Token Hook; usamos ese claim
 * para decidir a qué dashboard mandar al usuario.
 */
export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (error || !data.session) {
      setError('Credenciales inválidas')
      return
    }

    const claims = decodeJwtClaims(data.session.access_token)
    const roles = getRoles(claims)
    // fullSignOut en lugar de signOutLocal: ambos paths (rol inválido,
    // cuenta inactiva) deben limpiar la subscription push para no dejar
    // una fila huérfana en push_subscriptions apuntando al usuario que
    // acabamos de rechazar.
    if (roles.length === 0) {
      setError('Tu cuenta no tiene rol asignado. Contacta al administrador.')
      await fullSignOut()
      return
    }
    // `=== false` distingue "perfil desactivado" de "no tiene ese rol" (undef).
    if (claims.driver_active === false) {
      setError('Tu cuenta de motorizado está desactivada. Contacta al administrador.')
      await fullSignOut()
      return
    }
    if (claims.restaurant_active === false) {
      setError('Tu restaurante está desactivado. Contacta al administrador.')
      await fullSignOut()
      return
    }
    if (!claims.is_active) {
      setError('Tu cuenta está desactivada.')
      await fullSignOut()
      return
    }

    router.push(homePathForRoles(roles))
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Correo</Label>
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@correo.pe"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && (
        <div className="flex items-center gap-2 text-sm text-error bg-error-container/30 px-4 py-2 rounded-xl">
          <Icon name="error" size={18} />
          {error}
        </div>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? 'Ingresando...' : 'Entrar'}
      </Button>
    </form>
  )
}
