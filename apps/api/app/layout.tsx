import type { ReactNode } from 'react'

export const metadata = {
  title: 'Tindivo API',
  description: 'API REST del ecosistema Tindivo',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
