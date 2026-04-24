import { DriverForm } from '@/features/admin/drivers/components/driver-form'

export default function AdminNewDriverPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="bleed-text font-black text-3xl text-on-surface">Nuevo motorizado</h1>
        <p className="text-on-surface-variant text-sm mt-1">
          Registra a un motorizado, define su vehículo, turno y crea las credenciales para la PWA.
        </p>
      </header>
      <DriverForm mode="create" />
    </div>
  )
}
