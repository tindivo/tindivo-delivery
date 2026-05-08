/**
 * Port para registrar y consultar rechazos de asignación de pedidos.
 *
 * Se usa en dos puntos:
 *  - `RejectOrderAssignmentUseCase`: inserta una fila cuando el driver rechaza
 *    una asignación. La PK compuesta (order_id, driver_id) hace idempotente
 *    el rechazo si por alguna razón llegara dos veces.
 *  - `AutoAssignOrderUseCase`: lee los driver_ids ya rechazados para excluirlos
 *    en `findAssignmentCandidates` y evitar re-asignar al mismo driver.
 */
export interface RejectionsRepository {
  recordRejection(
    orderId: string,
    driverId: string,
    reason: string,
    rejectedAt: Date,
  ): Promise<void>

  findRejectedDriverIds(orderId: string): Promise<string[]>
}
