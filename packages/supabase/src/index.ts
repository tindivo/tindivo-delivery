export * from './types.gen'
export { createBrowserClient } from './browser'
export { createServerClient, createClientFromJwt, type ServerClient } from './server'
export { createAdminClient } from './admin'
// NOTA: updateSupabaseSession se importa explícitamente desde '@tindivo/supabase/middleware'
// para evitar que 'next/server' entre al bundle de componentes cliente.
