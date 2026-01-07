-- ================================================
-- MIGRATION: Add Customers & Sales Tables + Auto ID Generation + Customer Lookup
-- ================================================

-- 1. Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
  customer_id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE, -- Make phone unique for lookup
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

-- 4. Create sequence for order_id (4 digits: 1000-9999)
CREATE SEQUENCE IF NOT EXISTS order_id_seq START WITH 1000 MAXVALUE 9999 CYCLE;

-- 5. Create sequence for customer_id (4 digits: 1000-9999)
CREATE SEQUENCE IF NOT EXISTS customer_id_seq START WITH 1000 MAXVALUE 9999 CYCLE;

-- ================================================
-- FUNCTION: Generate unique order_id (4 digits)
-- ================================================
CREATE OR REPLACE FUNCTION generate_order_id()
RETURNS TEXT AS $$
DECLARE
  new_id TEXT;
  id_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 4-digit number
    new_id := LPAD(nextval('order_id_seq')::TEXT, 4, '0');
    
    -- Check if ID already exists
    SELECT EXISTS(SELECT 1 FROM public.orders WHERE order_id = new_id) INTO id_exists;
    
    -- If unique, return it
    IF NOT id_exists THEN
      RETURN new_id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- FUNCTION: Generate unique customer_id (cu-XXXX format)
-- ================================================
CREATE OR REPLACE FUNCTION generate_customer_id()
RETURNS TEXT AS $$
DECLARE
  new_id TEXT;
  id_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate cu-XXXX format (cu-1000 to cu-9999)
    new_id := 'cu-' || LPAD(nextval('customer_id_seq')::TEXT, 4, '0');
    
    -- Check if ID already exists
    SELECT EXISTS(SELECT 1 FROM public.customers WHERE customer_id = new_id) INTO id_exists;
    
    -- If unique, return it
    IF NOT id_exists THEN
      RETURN new_id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- TRIGGER FUNCTION: Auto-generate order_id and handle customer lookup/creation
-- ================================================
CREATE OR REPLACE FUNCTION handle_new_order()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id TEXT;
  v_customer_exists BOOLEAN;
BEGIN
  -- 1. Auto-generate order_id if not provided
  IF NEW.order_id IS NULL OR NEW.order_id = '' THEN
    NEW.order_id := generate_order_id();
  END IF;
  
  -- 2. Check if customer exists by phone number
  SELECT customer_id INTO v_customer_id
  FROM public.customers
  WHERE phone = NEW.phone_number
  LIMIT 1;
  
  -- 3. If customer exists, use their customer_id
  IF v_customer_id IS NOT NULL THEN
    NEW.customer_id := v_customer_id;
    
    -- Update customer name in case it changed
    UPDATE public.customers
    SET customer_name = NEW.customer_name
    WHERE customer_id = v_customer_id;
    
  -- 4. If customer doesn't exist, create new customer
  ELSE
    -- Generate new customer_id
    NEW.customer_id := generate_customer_id();
    
    -- Create customer record
    INSERT INTO public.customers (
      customer_id,
      customer_name,
      phone
    ) VALUES (
      NEW.customer_id,
      NEW.customer_name,
      NEW.phone_number
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger on orders table for INSERT
DROP TRIGGER IF EXISTS trigger_new_order ON public.orders;

CREATE TRIGGER trigger_new_order
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_order();

-- ================================================
-- TRIGGER FUNCTION: Handle Order Received Status
-- ================================================
CREATE OR REPLACE FUNCTION handle_order_received()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if status changed to 'received'
  IF NEW.status = 'received' AND (OLD.status IS NULL OR OLD.status != 'received') THEN
    
    -- Update customer statistics
    UPDATE public.customers
    SET 
      last_order_date = now(),
      no_of_orders = no_of_orders + 1,
      total_order_cost = total_order_cost + NEW.subtotal
    WHERE customer_id = NEW.customer_id;
    
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

-- 7. Create trigger on orders table for UPDATE
DROP TRIGGER IF EXISTS trigger_order_received ON public.orders;

CREATE TRIGGER trigger_order_received
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_order_received();

-- 8. Enable Row Level Security on new tables
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies for customers table
DROP POLICY IF EXISTS "Allow public read access on customers" ON public.customers;
DROP POLICY IF EXISTS "Allow public insert access on customers" ON public.customers;
DROP POLICY IF EXISTS "Allow public update access on customers" ON public.customers;
DROP POLICY IF EXISTS "Allow public delete access on customers" ON public.customers;

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

-- 10. Create RLS policies for sales table
DROP POLICY IF EXISTS "Allow public read access on sales" ON public.sales;
DROP POLICY IF EXISTS "Allow public insert access on sales" ON public.sales;
DROP POLICY IF EXISTS "Allow public update access on sales" ON public.sales;
DROP POLICY IF EXISTS "Allow public delete access on sales" ON public.sales;

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

-- 11. Enable realtime for new tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'customers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'sales'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
  END IF;
END $$;

-- 12. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_sales_order_id ON public.sales(order_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(date);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);

-- ================================================
-- MIGRATION COMPLETE
-- ================================================

-- Verify setup
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Triggers created: trigger_new_order, trigger_order_received';
  RAISE NOTICE 'Order IDs will auto-generate as 4-digit numbers (1000-9999)';
  RAISE NOTICE 'Customer IDs will auto-generate as cu-XXXX format (cu-1000 to cu-9999)';
  RAISE NOTICE 'Customer lookup by phone number is enabled';
END $$;