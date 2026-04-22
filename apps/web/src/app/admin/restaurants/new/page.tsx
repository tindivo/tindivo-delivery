import { RestaurantForm } from '@/features/admin/restaurants/components/restaurant-form'

export default function AdminNewRestaurantPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="bleed-text font-black text-3xl text-on-surface">Nuevo restaurante</h1>
        <p className="text-on-surface-variant text-sm mt-1">
          Registra un restaurante, sube su QR Yape y crea las credenciales para el cajero.
        </p>
      </header>
      <RestaurantForm mode="create" />
    </div>
  )
}
