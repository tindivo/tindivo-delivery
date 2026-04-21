# Habilitar el Custom Access Token Hook

La función SQL `public.custom_access_token_hook(event jsonb)` ya está
creada en la base de datos (ver migration `custom_access_token_hook`).
Falta un paso manual que el MCP no puede hacer: **activarla** para que
Supabase Auth la llame cada vez que emite un JWT.

## Pasos

1. Abre el dashboard del proyecto:
   https://supabase.com/dashboard/project/nwcdxmebsozswnjlblip/auth/hooks

2. En la tabla **Authentication Hooks**, encuentra la fila
   **"Send JWT" → "Customize Access Token (JWT) Claims"** y haz click
   en **Enable**.

3. Configura:
   - **Hook Type:** `Postgres`
   - **Schema:** `public`
   - **Function:** `custom_access_token_hook`

4. Guarda. Ahora cada vez que un usuario haga login, su JWT llevará
   los claims custom:
   ```json
   {
     "user_role": "admin" | "restaurant" | "driver",
     "is_active": true,
     "restaurant_id": "uuid-o-ausente",
     "driver_id": "uuid-o-ausente"
   }
   ```

## Verificar que está activo

```bash
# Después de activar, cierra cualquier sesión abierta y vuelve a hacer login
# desde http://localhost:3000/login con cualquier usuario de seed.
# El middleware leerá el claim user_role del JWT y redirigirá al rol correcto.

# Si el hook NO está activo, el LoginForm mostrará
# "Tu cuenta no tiene rol asignado. Contacta al administrador."
```

## ¿Qué pasa si lo dejo desactivado?

Sin el hook, el JWT no lleva `user_role`. El middleware y el LoginForm no
podrán redirigir por rol sin consultar la DB. Es obligatorio activarlo
para esta arquitectura.
