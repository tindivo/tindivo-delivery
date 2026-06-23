-- ═══════════════════════════════════════════════════════════════════
-- 20260623190000_add_rpc_set_customer_address_default.sql — Swap de default y logueo
-- ═══════════════════════════════════════════════════════════════════

-- TODO: Revisar la seguridad en V2. En V1 se asume confianza entre restaurantes 
-- en el pueblo (San Jacinto) y se permite cambiar el default de cualquier teléfono.
-- En V2, se debería restringir para que el restaurante solo pueda modificar teléfonos
-- que tengan al menos un pedido creado para su propio restaurant_id.

CREATE OR REPLACE FUNCTION public.set_customer_address_default(p_address_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text;
  v_old_default_id uuid;
  v_role text;
BEGIN
  -- 1. Validar autorización del invocador
  IF NOT (
    'restaurant' = ANY(public.current_user_roles()) OR
    'driver' = ANY(public.current_user_roles()) OR
    'admin' = ANY(public.current_user_roles())
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- 2. Obtener teléfono de la dirección
  SELECT phone INTO v_phone
  FROM public.customer_addresses
  WHERE address_id = p_address_id;

  IF v_phone IS NULL THEN
    RAISE EXCEPTION 'Address not found';
  END IF;

  -- 3. Obtener el ID del default anterior (si existe)
  SELECT address_id INTO v_old_default_id
  FROM public.customer_addresses
  WHERE phone = v_phone AND is_default = true;

  -- 4. Swap transaccional de is_default (dos UPDATEs explícitos)
  UPDATE public.customer_addresses
  SET is_default = false, updated_at = now()
  WHERE phone = v_phone AND is_default = true AND address_id <> p_address_id;

  UPDATE public.customer_addresses
  SET is_default = true, updated_at = now()
  WHERE address_id = p_address_id;

  -- 5. Detectar rol del usuario
  IF 'admin' = ANY(public.current_user_roles()) THEN
    v_role := 'admin';
  ELSIF 'restaurant' = ANY(public.current_user_roles()) THEN
    v_role := 'cashier';
  ELSIF 'driver' = ANY(public.current_user_roles()) THEN
    v_role := 'driver';
  ELSE
    v_role := 'unknown';
  END IF;

  -- 6. Loguear evento de telemetría de manera atómica
  INSERT INTO public.address_capture_events (
    phone,
    action,
    metadata
  ) VALUES (
    v_phone,
    'admin_edited',
    jsonb_build_object(
      'changed', 'is_default',
      'from_address_id', v_old_default_id,
      'to_address_id', p_address_id,
      'changed_by_role', v_role
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_customer_address_default(uuid) TO authenticated;
