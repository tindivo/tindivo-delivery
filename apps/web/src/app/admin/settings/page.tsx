import { SupportPhoneForm } from '@/features/admin/settings/components/support-phone-form'

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black text-on-surface">Configuración</h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Ajustes globales del sistema. Los cambios se aplican de inmediato a las PWAs.
        </p>
      </header>
      <SupportPhoneForm />
    </div>
  )
}
