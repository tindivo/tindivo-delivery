import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import type { Database } from './types.gen'

/**
 * Middleware de Next.js que refresca la sesión Supabase en cada request.
 * Usar en `apps/*/middleware.ts`.
 */
export async function updateSupabaseSession(
  request: NextRequest,
): Promise<{ response: NextResponse; user: { id: string; email: string | null } | null }> {
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    // biome-ignore lint/style/noNonNullAssertion: validated at boot
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    // biome-ignore lint/style/noNonNullAssertion: validated at boot
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookies) {
          for (const { name, value } of cookies) {
            request.cookies.set(name, value)
          }
          response = NextResponse.next({ request })
          for (const { name, value, options } of cookies) {
            response.cookies.set(name, value, options)
          }
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { response, user: user ? { id: user.id, email: user.email ?? null } : null }
}
