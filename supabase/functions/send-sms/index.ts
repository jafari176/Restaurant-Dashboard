import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Sends the customer an SMS when their order is marked ready for pickup.
 * Replaces the n8n workflow that used to do this before its host was lost.
 *
 * Secrets (set with `supabase secrets set`):
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_FROM_NUMBER   e.g. +14388391071
 * Unset, the function reports that SMS is disabled rather than failing.
 */

/** customers.phone is stored as 10 digits; Twilio needs E.164. */
function toE164(phone: string): string | null {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

const ADDRESS = '10380 Boulevard Gouin O, Pierrefonds-Roxboro';

/**
 * Bilingual, French first: the restaurant is in Montreal and the agent
 * greets callers in French before English.
 */
function buildMessage(order: Record<string, unknown>, items: Array<{ item: string; quantity: number }>): string {
  const name = String(order.customer_name || '').split(' ')[0] || '';
  const greetFr = name ? `Bonjour ${name}` : 'Bonjour';
  const greetEn = name ? `Hi ${name}` : 'Hi';

  const summary = items.length ? items.map((i) => `${i.quantity}x ${i.item}`).join(', ') : '';
  const amount = order.subtotal_with_tax != null ? Number(order.subtotal_with_tax).toFixed(2) : '';
  // Quebec convention: comma as the decimal mark, dollar sign after the number.
  const totalFr = amount ? `${amount.replace('.', ',')} $` : '';
  const totalEn = amount ? `$${amount}` : '';

  const fr = [
    `${greetFr}, votre commande Al Quds Grill #${order.order_id} est prête!`,
    summary,
    totalFr ? `Total: ${totalFr}` : '',
    ADDRESS,
  ].filter(Boolean).join('\n');

  const en = [
    `${greetEn}, your Al Quds Grill order #${order.order_id} is ready for pickup!`,
    summary,
    totalEn ? `Total: ${totalEn}` : '',
    ADDRESS,
  ].filter(Boolean).join('\n');

  return `${fr}\n\n---\n\n${en}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER');

    if (!accountSid || !authToken || !fromNumber) {
      console.warn('Twilio secrets not configured; skipping SMS.');
      return new Response(JSON.stringify({ ok: true, skipped: 'sms_not_configured' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const order = await req.json();

    if (!order?.order_id) {
      return new Response(JSON.stringify({ error: 'missing order_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const to = toE164(String(order.phone_number || ''));
    if (!to) {
      // Web-call orders and junk numbers land here; not an error worth retrying.
      console.warn(`Order ${order.order_id} has no usable phone number; skipping SMS.`);
      return new Response(JSON.stringify({ ok: true, skipped: 'no_phone' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // The caller may post a bare order row, so read the items here rather than
    // trusting them to be attached.
    let items: Array<{ item: string; quantity: number }> = Array.isArray(order.order_items)
      ? order.order_items
      : [];

    if (items.length === 0) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      const { data } = await supabase
        .from('order_items')
        .select('item, quantity')
        .eq('order_id', order.order_id);
      items = data ?? [];
    }

    const body = buildMessage(order, items);

    const form = new URLSearchParams({ To: to, From: fromNumber, Body: body });

    const resp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form,
      },
    );

    const result = await resp.json();

    if (!resp.ok) {
      // Twilio's own error code is the useful part (21608 = unverified number
      // on a trial account, 21211 = invalid To, 20003 = auth failure).
      console.error(`Twilio error ${result.code} for order ${order.order_id}: ${result.message}`);
      return new Response(
        JSON.stringify({ error: 'twilio_failed', code: result.code, message: result.message }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log(`SMS ${result.sid} queued for order ${order.order_id} -> ${to}`);

    return new Response(
      JSON.stringify({ ok: true, sid: result.sid, to, status: result.status }),
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
