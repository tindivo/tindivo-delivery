export const dynamic = 'force-dynamic'

/**
 * Entry point. En producción el middleware atrapa `/` antes de llegar aquí:
 * si hay sesión hace `rewrite` al home del rol, si no hay sesión hace
 * `redirect` a `/login`. Este componente es un fallback defensivo.
 *
 * IMPORTANTE: no emitir `redirect()` server-side aquí porque resultaría en
 * un 3xx que el Service Worker cachearía, y Safari iOS en PWA standalone
 * rechaza responses con `redirected: true` ("Response served by service
 * worker has redirections").
 */
export default function HomePage() {
  return null
}
