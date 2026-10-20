import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-retell-signature',
};

// Quebec combined GST+QST
const TAX_RATE = 1.14975;

interface OrderItem {
  item: string;
  quantity: number;
  price: number;
}

/**
 * Retell sends `items` as a JSON string inside custom_analysis_data,
 * because post-call analysis fields are flat. Parse defensively: the
 * model can emit a bare array, a wrapped object, or malformed JSON.
 */
function parseItems(raw: unknown): OrderItem[] {
  if (!raw) return [];

  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed || trimmed === '[]' || trimmed.toLowerCase() === 'null') return [];
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      console.error('items was not valid JSON:', trimmed.slice(0, 200));
      return [];
    }
  }

  // Accept either [...] or { items: [...] }
  const arr = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as Record<string, unknown>)?.items)
      ? (parsed as { items: unknown[] }).items
      : [];

  return arr
    .map((entry): OrderItem | null => {
      const e = entry as Record<string, unknown>;
      const name = typeof e?.item === 'string' ? e.item : typeof e?.name === 'string' ? e.name : '';
      if (!name) return null;
      const quantity = Number(e?.quantity ?? 1);
      const price = Number(e?.price ?? 0);
      return {
        item: name,
        quantity: Number.isFinite(quantity) && quantity > 0 ? Math.round(quantity) : 1,
        price: Number.isFinite(price) && price >= 0 ? price : 0,
      };
    })
    .filter((i): i is OrderItem => i !== null);
}

/**
 * Reduce to the 10-digit North American number, so the customers.phone
 * lookup matches whether the number came from the transcript ("514-123-4567")
 * or from Retell's caller ID ("+15141234567"). A mismatch here silently
 * creates a duplicate customer on every call.
 */
function normalizePhone(raw: unknown, fallback: unknown): string {
  const candidate = (typeof raw === 'string' && raw.trim()) || (typeof fallback === 'string' && fallback) || '';
  let digits = candidate.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  return digits.length === 10 ? digits : '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const event = body?.event;
    const call = body?.call ?? body;

    console.log(`Retell webhook: event=${event} call_id=${call?.call_id}`);

    // Only act once the analysis is ready. call_started/call_ended arrive first
    // and carry no structured order data.
    if (event && event !== 'call_analyzed') {
      return new Response(JSON.stringify({ ok: true, skipped: event }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const analysis = call?.call_analysis?.custom_analysis_data ?? {};

    // Nothing to do for inquiries, hangups, wrong numbers.
    const orderPlaced = analysis.order_placed;
    if (orderPlaced === false || orderPlaced === 'false') {
      console.log('No order placed on this call - skipping insert.');
      return new Response(JSON.stringify({ ok: true, skipped: 'no_order' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const items = parseItems(analysis.items);
    const customerName = (analysis.customer_name || '').toString().trim() || 'Phone Customer';
    const phoneNumber = normalizePhone(analysis.phone_number, call?.from_number);

    if (!phoneNumber) {
      console.error('No usable phone number; refusing insert.', { call_id: call?.call_id });
      return new Response(JSON.stringify({ error: 'missing phone_number' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (items.length === 0) {
      console.warn('Order flagged but no items parsed; refusing insert.', { call_id: call?.call_id });
      return new Response(JSON.stringify({ error: 'no items parsed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Trust our own arithmetic over the model's.
    const subtotal = Number(items.reduce((sum, i) => sum + i.price * i.quantity, 0).toFixed(2));
    const subtotalWithTax = Number((subtotal * TAX_RATE).toFixed(2));

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // order_id and customer_id are filled in by trigger_new_order.
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_name: customerName,
        phone_number: phoneNumber,
        subtotal,
        subtotal_with_tax: subtotalWithTax,
        status: 'new',
        new_order_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (orderError) {
      console.error('Order insert failed:', orderError);
      return new Response(JSON.stringify({ error: 'order insert failed', details: orderError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error: itemsError } = await supabase.from('order_items').insert(
      items.map((i) => ({ order_id: order.order_id, item: i.item, quantity: i.quantity, price: i.price })),
    );

    if (itemsError) {
      // The order is already on the kitchen screen; surface the failure rather
      // than rolling back a ticket someone may be reading.
      console.error('Order items insert failed for order', order.order_id, itemsError);
    }

    console.log(`Created order ${order.order_id} for ${order.customer_id} (${items.length} items, $${subtotal})`);

    return new Response(
      JSON.stringify({
        ok: true,
        order_id: order.order_id,
        customer_id: order.customer_id,
        items: items.length,
        subtotal,
        subtotal_with_tax: subtotalWithTax,
        items_error: itemsError ? itemsError.message : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
