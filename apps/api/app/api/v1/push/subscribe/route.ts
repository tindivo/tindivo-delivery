import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { parseJson } from '@/lib/http/validate'
import { Notifications } from '@tindivo/contracts'
import { createAdminClient } from '@tindivo/supabase'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return auth.response

  const body = await parseJson(req, Notifications.SubscribePushRequest)
  if (!body.ok) return body.response

  // 1) Cleanup global por endpoint: si el endpoint ya pertenece a OTRO user
  // (caso B inicia sesión en device de A sin pasar por fullSignOut),
  // borramos la fila previa antes de upsert. La unique constraint es
  // unique(endpoint) global, así que sin este DELETE el upsert colisiona y
  // la API responde 500.
  //
  // CRÍTICO: usar admin client (service_role) — el JWT del usuario no ve
  // rows ajenas por RLS (USING `user_id = auth.uid()`), por lo que un
  // DELETE con el cliente JWT siempre es no-op aunque el filtro
  // `.neq('user_id', self)` parezca correcto.
  const admin = createAdminClient()
  await admin
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', body.data.endpoint)
    .neq('user_id', auth.auth.userId)

  // 2) Cleanup de zombies del MISMO user con el mismo user_agent
  // (mismo dispositivo+browser): cuando el push service rota el endpoint,
  // el cliente se re-suscribe pero la fila vieja queda en BD. Verificado en
  // prod: usuarios motorizados acumulan 5-6 endpoints zombie del mismo
  // navegador, y send-push intenta entregar a todos (la mayoría falla
  // silenciosamente, lo que produce "llegan algunas no todas"). Mantenemos
  // la fila del endpoint actual (se upserta abajo) y borramos el resto.
  if (body.data.userAgent) {
    await admin
      .from('push_subscriptions')
      .delete()
      .eq('user_id', auth.auth.userId)
      .eq('user_agent', body.data.userAgent)
      .neq('endpoint', body.data.endpoint)
  }

  // 3) Upsert por endpoint. NO incluimos `consecutive_failures` aquí: si la
  // sub ya existe, conservar el contador. Resetearlo a 0 en cada upsert
  // enmascararía fallos acumulados que estaban a 1 paso de purga en
  // send-push (regla `next >= 3`). Para subs nuevas el default de la
  // columna es 0.
  const { error } = await auth.auth.supabase.from('push_subscriptions').upsert(
    {
      user_id: auth.auth.userId,
      endpoint: body.data.endpoint,
      p256dh: body.data.keys.p256dh,
      auth: body.data.keys.auth,
      user_agent: body.data.userAgent ?? null,
      device_label: body.data.deviceLabel ?? null,
    },
    { onConflict: 'endpoint' },
  )

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)
  return NextResponse.json({ ok: true })
}
