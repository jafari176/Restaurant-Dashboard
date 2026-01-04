import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderItem {
  item: string;
  quantity: number;
  price: number;
}

interface NewOrderPayload {
  order_id: string;
  customer_id: string;
  customer_name: string;
  phone_number: string;
  items: OrderItem[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: NewOrderPayload = await req.json();
    
    console.log('Received new order:', payload);

    // Validate required fields
    if (!payload.order_id || !payload.customer_id || !payload.customer_name || !payload.phone_number) {
      console.error('Missing required fields in payload');
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert order
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_id: payload.order_id,
        customer_id: payload.customer_id,
        customer_name: payload.customer_name,
        phone_number: payload.phone_number,
        status: 'new',
        new_order_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error inserting order:', orderError);
      return new Response(
        JSON.stringify({ error: 'Failed to create order', details: orderError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Order created:', orderData);

    // Insert order items if provided
    if (payload.items && payload.items.length > 0) {
      const orderItems = payload.items.map((item) => ({
        order_id: payload.order_id,
        item: item.item,
        quantity: item.quantity,
        price: item.price,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('Error inserting order items:', itemsError);
        // Order was created but items failed - log but don't fail the request
      } else {
        console.log('Order items created:', orderItems.length);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Order created successfully',
        order_id: payload.order_id 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
