import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Logout server-side. Defensa en profundidad para el flujo de cierre de sesión:
 * llamado desde `signOutLocal()` antes del signOut cliente.
 *
 * Usa `scope: 'local'` explícitamente — invalida solo el refresh token de
 * ESTA sesión en GoTrue (no las demás del usuario) y `@supabase/ssr` borra
 * automáticamente las cookies `sb-*-auth-token*` de la response.
 *
 * Si algún cliente queda ejecutando JS antiguo (PWA con SW stale en iOS),
 * llamar a este endpoint cierra la sesión correctamente sin propagar al
 * resto de dispositivos del usuario.
 */
export async function POST() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut({ scope: 'local' })
  return new NextResponse(null, { status: 204 })
}
