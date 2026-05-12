-- Adds the public marketplace business role used by tindivo.com.
-- Kept separate because Postgres enum values must be committed before use.

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'business';
