import type { MetadataRoute } from 'next'

// `id` (W3C App Manifest) identifica la PWA de forma estable entre updates.
// iOS Safari lo usa como clave de identidad de la app instalada: sin `id`
// explícito, cambios en `start_url` o `scope` pueden hacer que iOS trate
// la app como nueva post-update y resetee permisos (incluido el de Web
// Push). Fijar `id='/'` (mismo origen) evita ese reset.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Tindivo — Delivery para tu ciudad',
    short_name: 'Tindivo',
    description: 'Pedidos, motorizados y restaurantes conectados en tiempo real',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f9f9f6',
    theme_color: '#ab3500',
    categories: ['food', 'productivity', 'business'],
    lang: 'es-PE',
    dir: 'ltr',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
