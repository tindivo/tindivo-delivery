'use client'
import { signOutLocal } from '@tindivo/supabase'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

export type CustomerSession = {
  userId: string
  email: string
  fullName: string | null
}

/**
 * Mantiene el estado de sesión del cliente actual. Subscribe a auth
 * state changes para reaccionar a login/logout en tiempo real.
 *
 * Si el usuario tiene rol distinto de 'customer' (ej. admin entró por
 * accidente a tindivo.com con su cuenta de delivery), `session` se
 * mantiene null y el componente que llama lo trata como invitado.
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
      const userRole = (data.session?.user?.app_metadata as { user_role?: string } | undefined)?.user_role
        ?? readJwtRole(data.session?.access_token)
      if (data.session && userRole === 'customer') {
        setSession({
          userId: data.session.user.id,
          email: data.session.user.email ?? '',
          fullName: claims.full_name ?? null,
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

function readJwtRole(token: string | undefined): string | null {
  if (!token) return null
  try {
    const part = token.split('.')[1]
    if (!part) return null
    const payload = JSON.parse(atob(part))
    return payload.user_role ?? null
  } catch {
    return null
  }
}
