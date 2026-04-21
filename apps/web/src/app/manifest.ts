import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Tindivo',
    short_name: 'Tindivo',
    description: 'Plataforma de delivery Tindivo',
    start_url: '/',
    display: 'standalone',
    background_color: '#f9f9f6',
    theme_color: '#ab3500',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
