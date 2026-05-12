'use client'
import { customer } from '@/lib/api/client'
import { supabase } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'
import { signOutLocal } from '@tindivo/supabase'
import { useEffect, useState } from 'react'

export type CustomerRole = 'customer' | 'business'

export type CustomerSession = {
  userId: string
  email: string
  fullName: string | null
  /** Roles del user relevantes para tindivo.com. Puede tener ambos si fue mergeado. */
  roles: CustomerRole[]
  /** Primer rol relevante (legacy/back-compat). Igual a roles[0]. */
  role: CustomerRole
}

/**
 * Mantiene el estado de sesión del cliente actual. Subscribe a auth
 * state changes para reaccionar a login/logout en tiempo real.
 *
 * Si el usuario NO tiene rol customer ni business (ej. admin/restaurant
 * que entró por accidente a tindivo.com con su cuenta de delivery),
 * `session` se mantiene null y el componente que llama lo trata como
 * invitado.
 */
export function useCustomerAuth() {
  const [session, setSession] = useState<CustomerSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load(): Promise<void> {
      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      const claims = (data.session?.user?.user_metadata ?? {}) as { full_name?: string }
      const userRoles = readJwtRoles(
        data.session?.user?.app_metadata as
          | { user_role?: string; user_roles?: string[] }
          | undefined,
        data.session?.access_token,
      )
      const customerRoles = userRoles.filter(
        (r): r is CustomerRole => r === 'customer' || r === 'business',
      )
      if (data.session && customerRoles.length > 0) {
        setSession({
          userId: data.session.user.id,
          email: data.session.user.email ?? '',
          fullName: claims.full_name ?? null,
          roles: customerRoles,
          role: customerRoles[0]!,
        })
      } else {
        setSession(null)
      }
      setLoading(false)
    }
    load()
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      load()
    })
    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  async function logout(): Promise<void> {
    await signOutLocal()
    setSession(null)
  }

  return { session, loading, logout }
}

/**
 * Nombre a mostrar en topbar / saludos. Para business prioriza el nombre
 * del negocio (fetch a /business/profile); para customer usa fullName del
 * JWT (sin fetch extra). Si business todavía no respondió, fallback al
 * fullName del JWT mientras carga.
 */
export function useDisplayName(): { displayName: string | null; loading: boolean } {
  const { session } = useCustomerAuth()
  const businessQuery = useQuery({
    queryKey: ['business', 'profile-name'],
    queryFn: () => customer.getBusinessProfile(),
    enabled: session?.roles.includes('business') ?? false,
    staleTime: 5 * 60 * 1000,
  })

  if (!session) return { displayName: null, loading: false }
  if (session.roles.includes('business')) {
    return {
      displayName: businessQuery.data?.business.name ?? session.fullName,
      loading: businessQuery.isLoading,
    }
  }
  return { displayName: session.fullName, loading: false }
}

/**
 * Lee `user_roles[]` del JWT (custom hook nuevo) con fallback a `user_role`
 * (claim legacy = roles[0]) para JWTs viejos durante la transición.
 */
function readJwtRoles(
  appMetadata: { user_role?: string; user_roles?: string[] } | undefined,
  token: string | undefined,
): string[] {
  if (appMetadata?.user_roles && appMetadata.user_roles.length > 0) {
    return appMetadata.user_roles
  }
  if (appMetadata?.user_role) return [appMetadata.user_role]
  if (!token) return []
  try {
    const part = token.split('.')[1]
    if (!part) return []
    const payload = JSON.parse(atob(part)) as { user_role?: string; user_roles?: string[] }
    if (payload.user_roles && payload.user_roles.length > 0) return payload.user_roles
    if (payload.user_role) return [payload.user_role]
    return []
  } catch {
    return []
  }
}
