import type { SubscribeFailReason } from '../hooks/use-push-subscription'

/**
 * Convierte un `SubscribeFailReason` del hook `usePushSubscription` en un
 * mensaje accionable para mostrar al usuario. Compartido entre PushToggleCard
 * (perfil) y el toggle de disponibilidad del motorizado: ambos disparan el
 * mismo subscribe flow y necesitan los mismos mensajes.
 */
export function messageFromSubscribeReason(reason: SubscribeFailReason): string {
  if (reason === 'no-vapid') return 'Configuración de notificaciones incompleta. Avisa a soporte.'
  if (reason === 'no-session') return 'Tu sesión expiró. Vuelve a iniciar sesión y reintenta.'
  if (reason === 'no-permission') return 'Permiso no concedido para notificaciones.'
  if (reason === 'incomplete-keys')
    return 'El navegador entregó datos incompletos. Recarga la página y vuelve a intentar.'
  if (reason.startsWith('subscribe-throw:')) {
    const name = reason.slice('subscribe-throw:'.length)
    if (name === 'NotAllowedError')
      return 'Permisos bloqueados. Actívalas en ajustes del navegador.'
    if (name === 'InvalidStateError')
      return 'Hay una suscripción antigua activa. Recarga la página y vuelve a intentar.'
    if (name === 'AbortError') return 'El navegador canceló la suscripción. Vuelve a intentar.'
    return `El navegador rechazó la suscripción (${name}).`
  }
  if (reason.startsWith('api-error:')) {
    const parts = reason.split(':')
    const status = Number(parts[2])
    if (status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión y reintenta.'
    if (status === 403) return 'Tu cuenta no permite notificaciones. Avisa a soporte.'
    if (status === 409 || status >= 500)
      return 'Otra cuenta usó este navegador. Cierra sesión completa y vuelve a entrar.'
    return `El servidor rechazó la suscripción (${reason}).`
  }
  return 'No pudimos activarlas. Intenta de nuevo.'
}
