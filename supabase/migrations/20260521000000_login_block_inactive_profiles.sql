-- Bloqueo de login para motorizados/restaurantes desactivados.
--
-- 1) Extiende el Custom Access Token Hook para que el claim JWT `is_active`
--    sea el AND lógico de los flags relevantes según rol:
--       users.is_active
--       AND (NOT has_driver OR drivers.is_active)
--       AND (NOT has_restaurant OR restaurants.is_active)
--    Adicionalmente emite `driver_active` y `restaurant_active` como claims
--    discriminados (solo cuando aplica el rol) para mostrar mensaje
--    contextual en el LoginForm.
--    Regla multi-rol estricta: si tiene rol driver y drivers.is_active=false,
--    queda bloqueado aunque también tenga otro rol como admin.
--
-- 2) Crea public.revoke_user_sessions(p_user_id uuid) para que el endpoint
--    admin pueda invalidar todas las sesiones vivas del usuario afectado
--    inmediatamente al desactivar (sin esperar el refresh natural del JWT).
--    SECURITY DEFINER porque service_role no tiene grants sobre auth.* por
--    defecto; ejecutada por el endpoint con service_role.

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
declare
  claims jsonb;
  v_user_id uuid;
  v_role public.user_role;
  v_roles text[];
  v_restaurant_id uuid;
  v_driver_id uuid;
  v_user_active boolean;
  v_driver_active boolean;
  v_restaurant_active boolean;
  v_effective_active boolean;
  v_has_driver boolean;
  v_has_restaurant boolean;
begin
  v_user_id := (event ->> 'user_id')::uuid;
  claims := event -> 'claims';

  select u.role, u.roles, u.is_active
    into v_role, v_roles, v_user_active
  from public.users u
  where u.id = v_user_id;

  if v_role is null then
    event := jsonb_set(event, '{claims}', claims);
    return event;
  end if;

  v_has_driver := 'driver' = ANY(coalesce(v_roles, ARRAY[v_role::text]));
  v_has_restaurant := 'restaurant' = ANY(coalesce(v_roles, ARRAY[v_role::text]));

  if v_has_driver then
    select d.id, d.is_active into v_driver_id, v_driver_active
    from public.drivers d where d.user_id = v_user_id;
  end if;

  if v_has_restaurant then
    select r.id, r.is_active into v_restaurant_id, v_restaurant_active
    from public.restaurants r where r.user_id = v_user_id;
  end if;

  v_effective_active := coalesce(v_user_active, false);
  if v_has_driver then
    v_effective_active := v_effective_active AND coalesce(v_driver_active, false);
  end if;
  if v_has_restaurant then
    v_effective_active := v_effective_active AND coalesce(v_restaurant_active, false);
  end if;

  claims := jsonb_set(claims, '{user_role}', to_jsonb(v_role::text));
  claims := jsonb_set(claims, '{user_roles}', to_jsonb(coalesce(v_roles, ARRAY[v_role::text])));
  claims := jsonb_set(claims, '{is_active}', to_jsonb(v_effective_active));

  if v_has_driver then
    claims := jsonb_set(claims, '{driver_active}', to_jsonb(coalesce(v_driver_active, false)));
  end if;
  if v_has_restaurant then
    claims := jsonb_set(claims, '{restaurant_active}', to_jsonb(coalesce(v_restaurant_active, false)));
  end if;

  if v_restaurant_id is not null then
    claims := jsonb_set(claims, '{restaurant_id}', to_jsonb(v_restaurant_id::text));
  end if;
  if v_driver_id is not null then
    claims := jsonb_set(claims, '{driver_id}', to_jsonb(v_driver_id::text));
  end if;

  event := jsonb_set(event, '{claims}', claims);
  return event;
end $$;

CREATE OR REPLACE FUNCTION public.revoke_user_sessions(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_revoked int := 0;
  v_deleted int := 0;
begin
  update auth.refresh_tokens
    set revoked = true, updated_at = now()
    where user_id = p_user_id::text and revoked = false;
  GET DIAGNOSTICS v_revoked = ROW_COUNT;

  delete from auth.sessions where user_id = p_user_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  return v_revoked + v_deleted;
end $$;

REVOKE ALL ON FUNCTION public.revoke_user_sessions(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_user_sessions(uuid) TO service_role;
