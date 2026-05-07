-- Eliminar el cron `activate-assigned-orders` y su función.
--
-- Antes: cuando un pedido era auto-asignado (driver_id se fijaba antes de
-- entrar a la ventana), este cron lo despertaba a `heading_to_restaurant`
-- automáticamente al llegar a `appears_in_queue_at`. Eso saltaba el estado
-- intermedio "Asignado a ti, ¿aceptar?" del driver.
--
-- Ahora: el AutoAssignOrderUseCase solo ejecuta `assignTo` (driver_id se
-- fija, status sigue en `waiting_driver`) y el driver es quien presiona
-- "Aceptar" desde la PWA, llamando POST /api/v1/driver/orders/:id/accept
-- que internamente invoca `acceptBy` y transiciona a heading_to_restaurant.
--
-- La función enqueue_orders_ready_for_drivers SIGUE activa (emite el evento
-- OrderReadyForDrivers para push informativo cuando appears_in_queue_at
-- entra a now()).

do $$
begin
  if exists (select 1 from cron.job where jobname = 'activate-assigned-orders') then
    perform cron.unschedule('activate-assigned-orders');
  end if;
end;
$$;

drop function if exists public.activate_assigned_orders();
