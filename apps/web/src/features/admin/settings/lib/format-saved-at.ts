/**
 * Formato corto en hora Perú para el footer "Última actualización: ...".
 * Reusable entre los forms de admin/settings.
 */
export function formatSavedAt(iso: string): string {
  return new Date(iso).toLocaleString('es-PE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Lima',
  })
}
