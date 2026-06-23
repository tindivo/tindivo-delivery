-- ═══════════════════════════════════════════════════════════════════
-- 20260623_182100 — Relación de customer_addresses con orders
-- ═══════════════════════════════════════════════════════════════════

-- 1. Agregar restricción UNIQUE en public.customer_addresses(address_id)
--    para poder referenciarla desde orders como foreign key.
ALTER TABLE public.customer_addresses 
  ADD CONSTRAINT customer_addresses_address_id_unique UNIQUE (address_id);

-- 2. Agregar columna customer_address_id a public.orders
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS customer_address_id uuid REFERENCES public.customer_addresses(address_id) ON DELETE SET NULL;

-- 3. Crear índice para mejorar consultas por customer_address_id
CREATE INDEX IF NOT EXISTS orders_customer_address_id_idx ON public.orders(customer_address_id);
