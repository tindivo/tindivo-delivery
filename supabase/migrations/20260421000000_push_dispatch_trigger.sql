-- ═══════════════════════════════════════════════════════════════════
-- 20260421_000 — Trigger: dispatch send-push al insertar domain_events
-- ═══════════════════════════════════════════════════════════════════
--
-- Cada vez que un use case escribe en el outbox (domain_events), este
-- trigger invoca la Edge Function `send-push` via pg_net (async, no
-- bloqueante). La Edge Function luego busca los push_subscriptions
-- relevantes y envía Web Push notifications via VAPID.
--
-- La Edge Function está deployada con verify_jwt=false, así que no
-- requiere Authorization header.

create or replace function public.notify_send_push_fn()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform net.http_post(
    url := 'https://nwcdxmebsozswnjlblip.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('event_id', new.id)
  );
  return new;
end;
$$;

drop trigger if exists trg_domain_events_dispatch_push on public.domain_events;
create trigger trg_domain_events_dispatch_push
  after insert on public.domain_events
  for each row execute function public.notify_send_push_fn();

comment on function public.notify_send_push_fn is
  'Dispara Edge Function send-push async tras INSERT en domain_events';
