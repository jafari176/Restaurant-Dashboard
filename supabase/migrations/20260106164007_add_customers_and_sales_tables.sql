-- ================================================
-- MIGRATION: Add Customers & Sales Tables + Triggers
-- ================================================

-- 1. Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
  customer_id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  last_order_date TIMESTAMPTZ,
  no_of_orders INTEGER NOT NULL DEFAULT 0,
  total_order_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create sales table
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL REFERENCES public.orders(order_id) ON DELETE CASCADE,
  sub_total DECIMAL(10, 2) NOT NULL,
  including_tax DECIMAL(10, 2) NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Add new columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS subtotal_with_tax DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- 4. Enable Row Level Security on new tables
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for customers table
CREATE POLICY "Allow public read access on customers" 
ON public.customers 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access on customers" 
ON public.customers 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update access on customers" 
ON public.customers 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete access on customers" 
ON public.customers 
FOR DELETE 
USING (true);

-- 6. Create RLS policies for sales table
CREATE POLICY "Allow public read access on sales" 
ON public.sales 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access on sales" 
ON public.sales 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update access on sales" 
ON public.sales 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete access on sales" 
ON public.sales 
FOR DELETE 
USING (true);

-- 7. Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_sales_order_id ON public.sales(order_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(date);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);

-- ================================================
-- TRIGGER FUNCTION: Handle Order Received Status
-- ================================================

CREATE OR REPLACE FUNCTION handle_order_received()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_exists BOOLEAN;
BEGIN
  -- Only proceed if status changed to 'received'
  IF NEW.status = 'received' AND (OLD.status IS NULL OR OLD.status != 'received') THEN
    
    -- Check if customer exists
    SELECT EXISTS(
      SELECT 1 FROM public.customers WHERE customer_id = NEW.customer_id
    ) INTO v_customer_exists;
    
    IF v_customer_exists THEN
      -- Update existing customer
      UPDATE public.customers
      SET 
        last_order_date = now(),
        no_of_orders = no_of_orders + 1,
        total_order_cost = total_order_cost + NEW.subtotal,
        customer_name = NEW.customer_name, -- Update name in case it changed
        phone = NEW.phone_number -- Update phone in case it changed
      WHERE customer_id = NEW.customer_id;
    ELSE
      -- Insert new customer
      INSERT INTO public.customers (
        customer_id,
        customer_name,
        phone,
        last_order_date,
        no_of_orders,
        total_order_cost
      ) VALUES (
        NEW.customer_id,
        NEW.customer_name,
        NEW.phone_number,
        now(),
        1,
        NEW.subtotal
      );
    END IF;
    
    -- Insert into sales table
    INSERT INTO public.sales (
      order_id,
      sub_total,
      including_tax,
      date
    ) VALUES (
      NEW.order_id,
      NEW.subtotal,
      NEW.subtotal_with_tax,
      now()
    );
    
    -- Update received_at timestamp if not already set
    IF NEW.received_at IS NULL THEN
      NEW.received_at = now();
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger on orders table
DROP TRIGGER IF EXISTS trigger_order_received ON public.orders;

CREATE TRIGGER trigger_order_received
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_order_received();

