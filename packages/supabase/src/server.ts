import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types.gen'

export type ServerClient = SupabaseClient<Database>

type CookieStore = {
  get: (name: string) => { value: string } | undefined
  set: (name: string, value: string, options?: Record<string, unknown>) => void
}

/**
 * Cliente Supabase para Server Components y Route Handlers de Next.js.
 * Requiere pasar las cookies de la request.
 *
 * Uso:
 * ```ts
 * import { cookies } from 'next/headers'
 * import { createServerClient } from '@tindivo/supabase/server'
 *
 * const cookieStore = await cookies()
 * const sb = createServerClient(cookieStore)
 * ```
 */
export function createServerClient(cookieStore: CookieStore): ServerClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY son requeridos')
  }

  return createSupabaseServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        // @ts-expect-error Next.js cookies API
        return cookieStore.getAll?.() ?? []
      },
      setAll(cookies: { name: string; value: string; options?: Record<string, unknown> }[]) {
        try {
          for (const { name, value, options } of cookies) {
            cookieStore.set(name, value, options)
          }
        } catch {
          /* Server Component sin mutación permitida */
        }
      },
    },
  }) as unknown as ServerClient
}

/**
 * Cliente Supabase usando un JWT directo (para API Routes que reciben Bearer token).
 * Respeta RLS del usuario.
 */
export function createClientFromJwt(jwt: string): ServerClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY son requeridos')
  }

  return createSupabaseServerClient<Database>(url, anonKey, {
    cookies: { getAll: () => [], setAll: () => {} },
    global: {
      headers: { Authorization: `Bearer ${jwt}` },
    },
  }) as unknown as ServerClient
}
