/**
 * Normaliza un teléfono peruano a formato E.164 sin el signo +.
 * Acepta: 987654321, 51987654321, +51 987 654 321, 051-987-654321
 * Devuelve: 51987654321
 */
export function normalizeToE164Pe(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 9 && digits.startsWith('9')) return `51${digits}`
  if (digits.length === 11 && digits.startsWith('51')) return digits
  if (digits.length === 12 && digits.startsWith('051')) return digits.slice(1)
  return null
}

/** Formato humano: +51 987 654 321 */
export function formatPhonePe(raw: string): string {
  const e164 = normalizeToE164Pe(raw)
  if (!e164) return raw
  const local = e164.slice(2)
  return `+51 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`
}

export function isValidPhonePe(raw: string): boolean {
  return normalizeToE164Pe(raw) !== null
}
