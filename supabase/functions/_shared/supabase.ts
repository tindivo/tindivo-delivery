// @ts-expect-error: Deno runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10'

export function createServiceRoleClient() {
  // @ts-expect-error: Deno.env
  const url = Deno.env.get('SUPABASE_URL') ?? ''
  // @ts-expect-error: Deno.env
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
