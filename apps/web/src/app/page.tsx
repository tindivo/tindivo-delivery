import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getClaimsFromSession, homePathForRole } from '@/lib/supabase/jwt-claims'

export const dynamic = 'force-dynamic'

/**
 * Entry point. Si hay sesión activa redirige al dashboard del rol;
 * si no, al login. El middleware también hace esto, pero tener la lógica
 * aquí evita un flash de página blanca en el caso happy-path.
 */
export default async function HomePage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const claims = getClaimsFromSession(session)
  redirect(claims.user_role ? homePathForRole(claims.user_role) : '/login')
}
