import { type NextRequest, NextResponse } from 'next/server'

/**
 * Middleware de la PWA cliente.
 *
 * En esta iteración el cliente es anónimo: no hay rutas privadas que requieran
 * sesión. Cuando agreguemos cuentas (rol `customer`), aquí iría la lógica para
 * redirigir a `/login` rutas como `/cuenta`, `/mis-pedidos`, `/favoritos`.
 *
 * El matcher excluye assets de Next.js, manifest, SW, íconos y APIs internas
 * para que pasen sin overhead.
 */
export function middleware(_req: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon|manifest\\.webmanifest|sw\\.js|workbox-.*\\.js|swe-worker-.*\\.js|icon-.*|apple-touch-icon.*|api/).*)',
  ],
}
