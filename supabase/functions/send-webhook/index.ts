import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

// Was hardcoded to http://3.19.185.136:5678/webhook/a86a057c-... until that
// host was lost. Set the ORDER_RECEIVED_WEBHOOK_URL secret to point it at a
// replacement; unset, the function reports that forwarding is disabled rather
// than failing against a dead address.
const WEBHOOK_URL = Deno.env.get('ORDER_RECEIVED_WEBHOOK_URL') ?? '';
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

console.log('Edge function `send-webhook` booting up.');

serve(async (req) => {
  console.log(`[${new Date().toISOString()}] Received request with method: ${req.method}`);

  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request.');
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    console.log('Parsing request body...');
    const orderData = await req.json();
    console.log('Successfully parsed order data.');

    if (!WEBHOOK_URL) {
      console.warn('ORDER_RECEIVED_WEBHOOK_URL is not set; skipping forward.');
      return new Response(
        JSON.stringify({ ok: true, skipped: 'webhook_not_configured' }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }, status: 200 },
      );
    }
    
    // For privacy, you might want to remove this log in production
    // console.log('Order Data:', JSON.stringify(orderData, null, 2));

    console.log(`Forwarding request to webhook URL: ${WEBHOOK_URL}`);
    const webhookResponse = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    });

    console.log(`Received response from webhook with status: ${webhookResponse.status}`);

    if (!webhookResponse.ok) {
      const errorBody = await webhookResponse.text();
      console.error(`Webhook server returned an error. Status: ${webhookResponse.status}, Body: ${errorBody}`);
      throw new Error(`Webhook failed with status: ${webhookResponse.status}. Body: ${errorBody}`);
    }

    console.log('Webhook call was successful. Reading response body...');
    const responseBodyText = await webhookResponse.text();
    
    console.log('Webhook response body:', responseBodyText);
    
    // Attempt to parse as JSON, but return plain text if it fails
    let finalResponseBody;
    try {
        finalResponseBody = JSON.parse(responseBodyText);
    } catch {
        finalResponseBody = { message: responseBodyText };
    }

    return new Response(JSON.stringify(finalResponseBody), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('!!! An error occurred in the Edge Function !!!');
    console.error('Error object:', error);
    console.error('Error message:', error.message);
    
    return new Response(JSON.stringify({ error: `Internal Server Error: ${error.message}` }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
