// El cap de pedidos concurrentes por driver dejó de ser una constante hard-coded.
// Ahora vive en `app_settings.assignment_rules.maxOrdersPerDriver`, configurable
// desde el admin en runtime. Ver `domain/policies/assignment-rules.ts` para los
// defaults (DEFAULT_ASSIGNMENT_RULES) y el módulo `infrastructure/supabase-assignment-rules`
// para el adapter de persistencia.
export {}
