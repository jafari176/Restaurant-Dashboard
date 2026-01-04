-- Create orders table
CREATE TABLE public.orders (
  order_id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'ready', 'received', 'rejected')),
  new_order_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create order_items table
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL REFERENCES public.orders(order_id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0
);

-- Enable Row Level Security (public read for dashboard, will add auth later if needed)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (dashboard doesn't require auth per the spec)
CREATE POLICY "Allow public read access on orders" 
ON public.orders 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access on orders" 
ON public.orders 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update access on orders" 
ON public.orders 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete access on orders" 
ON public.orders 
FOR DELETE 
USING (true);

CREATE POLICY "Allow public read access on order_items" 
ON public.order_items 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access on order_items" 
ON public.order_items 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update access on order_items" 
ON public.order_items 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete access on order_items" 
ON public.order_items 
FOR DELETE 
USING (true);

-- Enable realtime for orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;

-- Create indexes for performance
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);