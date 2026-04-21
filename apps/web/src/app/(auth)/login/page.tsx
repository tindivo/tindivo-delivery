import { HeroBadge } from '@tindivo/ui'
import { LoginForm } from '@/features/auth/components/login-form'

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 wash-active">
      <HeroBadge icon="delivery_dining" variant="info" />
      <h1 className="font-black text-4xl tracking-tight text-on-surface mt-6 uppercase">
        TINDIVO
      </h1>
      <p className="text-on-surface-variant text-sm mt-1 mb-10">Ingresa a tu cuenta</p>
      <LoginForm />
    </main>
  )
}
