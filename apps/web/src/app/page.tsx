import { redirect } from 'next/navigation'

/**
 * Esta ruta nunca se renderiza para usuarios autenticados: el middleware
 * resuelve `/` con un rewrite hacia el dashboard del rol. Si llegas aquí
 * sin sesión, la única ruta válida en `apps/web` es `/login`.
 *
 * La PWA pública para clientes vive en `apps/customer` (tindivo.com),
 * no en este host (delivery.tindivo.com).
 */
export default function HomePage() {
  redirect('/login')
}
