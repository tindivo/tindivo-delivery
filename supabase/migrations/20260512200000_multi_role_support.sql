-- Habilita roles múltiples por usuario manteniendo back-compat con users.role.
-- Un mismo usuario puede operar como 'business' en tindivo.com y 'restaurant'
-- en delivery.tindivo.com sin tener dos cuentas separadas.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS roles text[] NOT NULL DEFAULT ARRAY[]::text[];

UPDATE public.users SET roles = ARRAY[role::text] WHERE array_length(roles, 1) IS NULL;

ALTER TABLE public.users ADD CONSTRAINT users_roles_not_empty
  CHECK (array_length(roles, 1) >= 1);

ALTER TABLE public.users ADD CONSTRAINT users_roles_valid
  CHECK (roles <@ ARRAY['admin','restaurant','driver','customer','business']::text[]);

CREATE INDEX IF NOT EXISTS idx_users_roles_gin ON public.users USING GIN (roles);

-- Trigger: mantiene users.role = roles[1] para back-compat de policies viejas
CREATE OR REPLACE FUNCTION public.sync_role_from_roles() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.roles IS NOT NULL AND array_length(NEW.roles, 1) >= 1 THEN
    NEW.role := (NEW.roles[1])::public.user_role;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_users_sync_role
  BEFORE INSERT OR UPDATE OF roles ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_role_from_roles();

CREATE OR REPLACE FUNCTION public.current_user_roles() RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT roles FROM public.users WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.current_user_roles() TO anon, authenticated;
