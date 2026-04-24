import { type SupabaseClient, createClient } from '@supabase/supabase-js'
import type { Database } from './types.gen'

let adminSingleton: SupabaseClient<Database> | undefined

/**
 * Cliente con service_role key. BYPASSEA RLS.
 * Usar SOLO en server (API Routes, Edge Functions, scripts).
 * NUNCA exponer al navegador.
 */
export function createAdminClient(): SupabaseClient<Database> {
  if (typeof window !== 'undefined') {
    throw new Error('createAdminClient no puede usarse en el navegador')
  }

  if (adminSingleton) return adminSingleton

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridos')
  }

  adminSingleton = createClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return adminSingleton
}
