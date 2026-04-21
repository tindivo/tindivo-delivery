-- ═══════════════════════════════════════════════════════════════════
-- 20260420_000 — Extensiones necesarias
-- ═══════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto"    with schema extensions;
create extension if not exists "uuid-ossp"   with schema extensions;
create extension if not exists "postgis"     with schema extensions;
create extension if not exists "pg_cron"     with schema extensions;
create extension if not exists "pg_net"      with schema extensions;
