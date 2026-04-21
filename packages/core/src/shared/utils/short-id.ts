/**
 * Genera un shortId alfanumérico de 8 caracteres (A-Z, 0-9).
 * Se usa como clave pública de tracking sin exponer UUIDs.
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sin I, O, 0, 1 (ambigüedad)
const LENGTH = 8

export function generateShortId(): string {
  const bytes = new Uint8Array(LENGTH)
  crypto.getRandomValues(bytes)
  let out = ''
  for (let i = 0; i < LENGTH; i++) {
    // biome-ignore lint/style/noNonNullAssertion: known length
    out += ALPHABET[bytes[i]! % ALPHABET.length]
  }
  return out
}

export function isValidShortId(value: string): boolean {
  if (value.length !== LENGTH) return false
  for (const ch of value) {
    if (!ALPHABET.includes(ch)) return false
  }
  return true
}
