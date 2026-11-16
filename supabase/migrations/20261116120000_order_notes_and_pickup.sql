-- ================================================
-- MIGRATION: Keep special requests and pickup time
-- ================================================
-- Retell's post-call analysis has captured special_requests and pickup_time
-- since the pipeline was rebuilt, but the webhook had nowhere to put them and
-- dropped both. The kitchen ticket needs them: "sauce on the side" and a
-- promised pickup time are what the line actually works from.
--
-- Both are nullable free text. pickup_time stays text rather than timestamptz
-- because callers say "in twenty minutes" or "around 7" as often as a clock
-- time, and a failed parse would lose the instruction entirely.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS special_requests TEXT,
  ADD COLUMN IF NOT EXISTS pickup_time TEXT;

COMMENT ON COLUMN public.orders.special_requests IS
  'Free-text note from the caller, printed on the kitchen ticket. e.g. "no onions, sauce on the side".';
COMMENT ON COLUMN public.orders.pickup_time IS
  'Pickup time as the caller said it, printed as READY BY. Free text: "in 20 minutes", "around 7".';
