import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const WEBHOOK_URL = 'http://3.19.185.136:5678/webhook/a86a057c-017e-48db-8f0d-54ee9161e489';
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // This is needed to handle the browser's preflight 'OPTIONS' request.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    // Get the order data from the request body
    const orderData = await req.json();

    // Forward the data to the actual webhook
    const webhookResponse = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    });

    if (!webhookResponse.ok) {
      throw new Error(`Webhook failed with status: ${webhookResponse.status}`);
    }

    const responseBody = await webhookResponse.json();

    // Return a success response to the client
    return new Response(JSON.stringify(responseBody), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    // Return an error response to the client
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
