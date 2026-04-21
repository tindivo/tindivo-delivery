-- ═══════════════════════════════════════════════════════════════════
-- 20260420_009 — push_subscriptions (Web Push VAPID, multi-device)
-- ═══════════════════════════════════════════════════════════════════

create table public.push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  endpoint      text not null,
  p256dh        text not null,
  auth          text not null,
  user_agent    text,
  device_label  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index idx_push_subscriptions_user on public.push_subscriptions (user_id);

comment on table public.push_subscriptions is 'Suscripciones Web Push (VAPID) por usuario y dispositivo.';
