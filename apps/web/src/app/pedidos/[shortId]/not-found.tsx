import { HeroBadge } from '@tindivo/ui'
import Link from 'next/link'

export default function NotFoundPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 wash-warning">
      <HeroBadge icon="search_off" variant="warning" />
      <h1 className="font-black text-3xl tracking-tight text-on-surface mt-8 text-center">
        No encontramos tu pedido
      </h1>
      <p className="text-on-surface-variant mt-3 text-center max-w-md">
        Verifica que el link sea correcto. Los pedidos entregados permanecen visibles 24 horas.
      </p>
      <Link
        href="/login"
        className="mt-8 inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-primary-container text-on-primary font-bold tracking-wide shadow-[0_4px_20px_rgba(171,53,0,0.15)] transition-all duration-300 active:scale-95"
      >
        Ir a Tindivo
      </Link>
    </main>
  )
}
