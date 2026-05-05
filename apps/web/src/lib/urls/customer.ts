/**
 * Resolución del host de la PWA cliente (`apps/customer`, `tindivo.com`).
 *
 * El tracking público (`/pedidos/:shortId`) ya no vive en `apps/web`
 * (`delivery.tindivo.com`). Cuando el back-office envía links por WhatsApp
 * para que el cliente vea su pedido, deben apuntar al host del cliente.
 *
 * Orden de resolución:
 *   1. `NEXT_PUBLIC_CUSTOMER_URL` (configurada en Vercel del proyecto web).
 *   2. `https://tindivo.com` como fallback prod razonable.
 *
 * En dev local, setear `NEXT_PUBLIC_CUSTOMER_URL=http://localhost:3002`
 * en el `.env.local` para que los links generados desde admin abran el
 * tracking en el dev server del cliente.
 */
export function customerOrigin(): string {
  return process.env.NEXT_PUBLIC_CUSTOMER_URL ?? 'https://tindivo.com'
}

export function trackingUrl(shortId: string): string {
  return `${customerOrigin()}/pedidos/${shortId}`
}
