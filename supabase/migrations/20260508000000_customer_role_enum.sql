-- Añade el rol 'customer' al enum user_role para que el cliente final pueda
-- crearse cuenta en tindivo.com. Postgres requiere que el ADD VALUE se
-- commitee antes de poder usarse en queries — por eso esta migration es
-- separada de las que crean tablas/policies dependientes.

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'customer';
