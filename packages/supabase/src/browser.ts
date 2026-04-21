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
