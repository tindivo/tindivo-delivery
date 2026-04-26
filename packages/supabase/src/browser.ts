import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types.gen'

let clientSingleton: SupabaseClient<Database> | undefined

/**
 * Cliente Supabase para el navegador (cookies gestionadas por @supabase/ssr).
 * Singleton para toda la PWA.
 */
export function createBrowserClient(): SupabaseClient<Database> {
  if (clientSingleton) return clientSingleton

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY son requeridos')
  }

  clientSingleton = createSupabaseBrowserClient<Database>(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }) as unknown as SupabaseClient<Database>

  return clientSingleton
}

/**
 * Cierra sesión SOLO en el dispositivo actual.
 *
 * Usa `scope: 'local'` explícitamente porque el default de `supabase-js`
 * es `'global'`, que invalida TODAS las sesiones del usuario en TODOS
 * los dispositivos (PWA instalada, otros navegadores). En una app
 * multi-dispositivo eso no es lo deseado.
 *
 * Defensa en profundidad: primero llama al endpoint server-side
 * `POST /api/auth/logout` del propio web app (mismo origen → cookies
 * viajan con `credentials: 'same-origin'`). Aunque el cliente quede
 * con bundle JS antiguo cacheado por el SW (típico en iOS PWA), el
 * endpoint server fuerza la revocación correcta del refresh token con
 * `scope: 'local'`. Si la red falla, igual procede con el signOut local.
 */
export async function signOutLocal() {
  const client = createBrowserClient()
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
  } catch {
    /* offline o servidor caído: el signOut local de abajo cierra igual */
  }
  return client.auth.signOut({ scope: 'local' })
}
