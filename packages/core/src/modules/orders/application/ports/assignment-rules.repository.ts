import type { AssignmentRules } from '../../domain/policies/assignment-rules'

export interface AssignmentRulesRepository {
  /**
   * Lee las reglas de asignación. Devuelve null si no hay config persistida
   * o el JSON almacenado es inválido — el caller debe aplicar
   * DEFAULT_ASSIGNMENT_RULES para mantener la operación funcionando.
   */
  read(): Promise<AssignmentRules | null>

  write(rules: AssignmentRules, updatedBy: string): Promise<{ updatedAt: string }>
}
