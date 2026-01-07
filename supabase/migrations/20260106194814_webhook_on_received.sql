-- ================================================
-- ADD WEBHOOK TRIGGER ON ORDER STATUS = RECEIVED
-- ================================================

-- Enable pg_net extension (for making HTTP requests from database)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ================================================
-- FUNCTION: Call webhook when order status = received
-- ================================================
CREATE OR REPLACE FUNCTION notify_webhook_on_received()
RETURNS TRIGGER AS $$
DECLARE
  webhook_url TEXT := 'http://3.19.185.136:5678/webhook/a86a057c-017e-48db-8f0d-54ee9161e489'; -- Replace with your actual webhook URL
  payload JSON;
BEGIN
  -- Only proceed if status changed to 'received'
  IF NEW.status = 'received' AND (OLD.status IS NULL OR OLD.status != 'received') THEN
    
    -- Build JSON payload
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
    
    -- Make async HTTP POST request to webhook
    PERFORM net.http_post(
      url := webhook_url,
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := payload::jsonb
    );
    
    -- Log the webhook call
    RAISE NOTICE 'Webhook called for order_id: % with payload: %', NEW.order_id, payload;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- CREATE TRIGGER: Call webhook after order update
-- ================================================
DROP TRIGGER IF EXISTS trigger_webhook_on_received ON public.orders;

CREATE TRIGGER trigger_webhook_on_received
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_webhook_on_received();

