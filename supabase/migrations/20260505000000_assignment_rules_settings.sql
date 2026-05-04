-- Reglas de asignación de pedidos a motorizados.
--
-- Reemplaza el algoritmo de scoring numérico previo (que combinaba pesos
-- arbitrarios + idle priority + over-bonus penalty) por las 6 reglas
-- determinísticas del simulador (R1..R6), con tres parámetros configurables
-- desde el admin sin necesidad de redeploy.
--
-- Estructura del JSON guardado en app_settings.value bajo la key
-- 'assignment_rules':
--   {
--     "maxOrdersPerDriver":      3,    // R3: cap de pedidos en mochila por driver
--     "maxRestaurantsPerDriver": 2,    // R2: cap de restaurantes distintos simultáneos
--     "groupingWindowMinutes":   5     // R1: ventana de agrupación por restaurante
--   }
--
-- Defaults reflejan las constantes del simulador documentado en
-- C:\Users\mauri\Documents\ejemplo\Tindivo-Simulator-Reglas.md.

insert into public.app_settings (key, value, updated_by)
values (
  'assignment_rules',
  '{"maxOrdersPerDriver":3,"maxRestaurantsPerDriver":2,"groupingWindowMinutes":5}',
  null
)
on conflict (key) do nothing;
