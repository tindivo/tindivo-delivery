import type { PlatformSchedule } from '../../domain/policies/platform-schedule.policy'

export interface PlatformSettingsRepository {
  /**
   * Lee la configuración del horario operativo. Devuelve null si no existe
   * o el JSON almacenado es inválido — el caller debe aplicar un default
   * seguro para no bloquear la operación.
   */
  read(): Promise<PlatformSchedule | null>

  write(schedule: PlatformSchedule, updatedBy: string): Promise<{ updatedAt: string }>
}
