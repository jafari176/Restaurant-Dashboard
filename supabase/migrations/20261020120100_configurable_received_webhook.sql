-- ================================================
-- MIGRATION: Make the order-received webhook configurable
-- ================================================
-- notify_webhook_on_received() hardcoded http://3.19.185.136:5678/webhook/...
-- That host is gone, so every order reaching status='received' queued a
-- pg_net request to a dead address. pg_net swallows the failure, so nothing
-- surfaced in the app, but each received order left a failed request behind.
--
-- The URL now comes from app_settings, so pointing it at a replacement is an
-- UPDATE rather than a migration. An empty or NULL url disables the call.

CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Settings may hold endpoints and tokens: no public access. Edge functions
-- use the service role, which bypasses RLS.
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Seeded empty, which disables the webhook until a real URL is set.
INSERT INTO public.app_settings (key, value, description)
VALUES (
  'order_received_webhook_url',
  '',
  'POST target fired when an order reaches status=received. Empty disables it. Was http://3.19.185.136:5678/webhook/a86a057c-017e-48db-8f0d-54ee9161e489 until that host was lost.'
)
ON CONFLICT (key) DO NOTHING;

-- ------------------------------------------------
-- Rewrite the trigger function to read the URL and skip when unset.
-- ------------------------------------------------
CREATE OR REPLACE FUNCTION notify_webhook_on_received()
RETURNS TRIGGER AS $$
DECLARE
  webhook_url TEXT;
  payload JSON;
BEGIN
  IF NEW.status = 'received' AND (OLD.status IS NULL OR OLD.status != 'received') THEN

    SELECT value INTO webhook_url
    FROM public.app_settings
    WHERE key = 'order_received_webhook_url';

    IF webhook_url IS NULL OR webhook_url = '' THEN
      RAISE NOTICE 'order_received_webhook_url is not set; skipping webhook for order %', NEW.order_id;
      RETURN NEW;
    END IF;

    payload := json_build_object(
      'customer_name', NEW.customer_name,
      'phone_number', NEW.phone_number,
      'subtotal', NEW.subtotal,
      'subtotal_with_tax', NEW.subtotal_with_tax,
      'order_id', NEW.order_id,
      'customer_id', NEW.customer_id,
      'status', NEW.status,
      'received_at', NEW.received_at
    );

    PERFORM net.http_post(
      url := webhook_url,
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := payload::jsonb
    );

    RAISE NOTICE 'Webhook called for order_id: %', NEW.order_id;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- The trigger itself is unchanged; recreated so this migration is self-contained.
DROP TRIGGER IF EXISTS trigger_webhook_on_received ON public.orders;

CREATE TRIGGER trigger_webhook_on_received
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_webhook_on_received();

-- To re-enable once a replacement endpoint exists:
--   UPDATE public.app_settings
--   SET value = 'https://your-endpoint.example.com/hook', updated_at = now()
--   WHERE key = 'order_received_webhook_url';
