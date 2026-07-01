-- ═══════════════════════════════════════════════════════════════════
-- 20260701125000 — domain_event_status_processing
-- ═══════════════════════════════════════════════════════════════════
--
-- Agrega el valor 'processing' al enum domain_event_status.
--

alter type public.domain_event_status add value if not exists 'processing';
