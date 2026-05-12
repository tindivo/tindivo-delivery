import { Icon } from '@tindivo/ui'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function NegocioPage() {
  return (
    <main className="mx-auto max-w-md px-4 pb-8 pt-24">
      <section className="rounded-[28px] border border-outline-variant/20 bg-surface-container-lowest p-6 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-fixed text-on-primary-fixed">
          <Icon name="storefront" filled />
        </span>
        <h1 className="mt-4 text-2xl font-black">Catalogo movido a tindivo.com</h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          Delivery queda solo para operar pedidos y motos. La carta publica, fotos y agregados se
          administran desde una cuenta de negocio en tindivo.com.
        </p>
        <Link
          href="/restaurante"
          className="mt-5 inline-flex h-12 items-center justify-center rounded-full bg-primary-container px-5 text-sm font-black text-white"
        >
          Volver a delivery
        </Link>
      </section>
    </main>
  )
}
