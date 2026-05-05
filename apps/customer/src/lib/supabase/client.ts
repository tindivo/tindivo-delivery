'use client'
import { createBrowserClient } from '@tindivo/supabase'

/**
 * Browser client de Supabase para `apps/customer`. Hoy se usa solo para
 * suscribir realtime en el tracking público (`get_tracking` RPC ya está
 * disponible para `anon`).
 *
 * Cuando agreguemos cuentas de cliente (rol `customer`), este client
 * también gestionará la sesión via `signInWithPassword`/`signOutLocal`,
 * igual que en apps/web.
 */
export const supabase = createBrowserClient()
