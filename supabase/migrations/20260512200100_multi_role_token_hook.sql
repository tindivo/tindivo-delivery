-- Emite user_roles[] en el JWT además del user_role legacy.
-- También emite restaurant_id/driver_id si el user tiene esos roles en su
-- arreglo (no solo si role es exactamente uno de ellos).
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
declare
  claims jsonb;
  v_user_id uuid;
  v_role public.user_role;
  v_roles text[];
  v_restaurant_id uuid;
  v_driver_id uuid;
  v_is_active boolean;
begin
  v_user_id := (event ->> 'user_id')::uuid;
  claims := event -> 'claims';

  select u.role, u.roles, u.is_active
    into v_role, v_roles, v_is_active
  from public.users u
  where u.id = v_user_id;

  if v_role is not null then
    claims := jsonb_set(claims, '{user_role}', to_jsonb(v_role::text));
    claims := jsonb_set(claims, '{user_roles}', to_jsonb(coalesce(v_roles, ARRAY[v_role::text])));
    claims := jsonb_set(claims, '{is_active}', to_jsonb(coalesce(v_is_active, false)));

    if 'restaurant' = ANY(coalesce(v_roles, ARRAY[v_role::text])) then
      select id into v_restaurant_id from public.restaurants where user_id = v_user_id;
      if v_restaurant_id is not null then
        claims := jsonb_set(claims, '{restaurant_id}', to_jsonb(v_restaurant_id::text));
      end if;
    end if;

    if 'driver' = ANY(coalesce(v_roles, ARRAY[v_role::text])) then
      select id into v_driver_id from public.drivers where user_id = v_user_id;
      if v_driver_id is not null then
        claims := jsonb_set(claims, '{driver_id}', to_jsonb(v_driver_id::text));
      end if;
    end if;
  end if;

  event := jsonb_set(event, '{claims}', claims);
  return event;
end $$;
