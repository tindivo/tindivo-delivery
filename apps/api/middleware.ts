import { type NextRequest, NextResponse } from 'next/server'

/**
 * Middleware global de `apps/api`. Reemplaza los headers CORS estáticos que
 * antes vivían en `next.config.mjs` (que solo soportaba un único `Origin`)
 * por una whitelist dinámica.
 *
 * Whitelist: `ALLOWED_ORIGINS` (CSV) o defaults seguros que cubren prod
 * (`tindivo.com`, `delivery.tindivo.com`) y dev local (`:3000`, `:3002`).
 *
 * Aplica a todas las rutas bajo `/api/*`. El handler de cada route puede
 * agregar headers extra (`X-Request-Id`, etc.) sin que el browser bloquee
 * la respuesta, porque ya pasamos `Access-Control-Allow-Headers`.
 */
const FALLBACK_ORIGINS = [
  'https://tindivo.com',
  'https://www.tindivo.com',
  'https://delivery.tindivo.com',
  'http://localhost:3000',
  'http://localhost:3002',
]

function allowedOrigins(): string[] {
  const env = process.env.ALLOWED_ORIGINS
  if (!env) return FALLBACK_ORIGINS
  return env
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
}

function pickOrigin(requestOrigin: string | null): string | null {
  if (!requestOrigin) return null
  return allowedOrigins().includes(requestOrigin) ? requestOrigin : null
}

const CORS_HEADERS = {
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-Id, Idempotency-Key',
  'Access-Control-Max-Age': '86400',
  Vary: 'Origin',
}

function applyCors(response: NextResponse, origin: string | null): NextResponse {
  const allowed = pickOrigin(origin)
  if (allowed) response.headers.set('Access-Control-Allow-Origin', allowed)
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value)
  }
  return response
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin')

  // Preflight: responder 204 inmediatamente sin entrar al handler.
  if (request.method === 'OPTIONS') {
    return applyCors(new NextResponse(null, { status: 204 }), origin)
  }

  // Resto de requests: dejar pasar al handler y agregar headers en la respuesta.
  const response = NextResponse.next()
  return applyCors(response, origin)
}

export const config = {
  // Solo intercepta API routes — no toca assets ni otros archivos.
  matcher: '/api/:path*',
}
