import type { Coordinates } from '../utils/maps'

/**
 * Centro geográfico de San Jacinto (Nepeña, Áncash, Perú).
 * Único distrito de operación de Tindivo: el mapa Leaflet del admin
 * (crear/editar restaurante) y del driver (datos del cliente) carga
 * por defecto en estas coordenadas.
 */
export const SAN_JACINTO_CENTER: Coordinates = { lat: -9.0961, lng: -78.3464 }

/**
 * Zoom inicial razonable para ver el casco urbano de San Jacinto sin
 * perder detalle de calles.
 */
export const SAN_JACINTO_DEFAULT_ZOOM = 15
