import { createServerClient } from '@tindivo/supabase'
import { cookies } from 'next/headers'

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  return createServerClient(cookieStore as never)
}
