const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-neuva-secret',
};

/**
 * Called by the voice platform at the start of every inbound call. Returns the
 * live weekend specials as dynamic variables so the agent can offer them
 * without a prompt edit.
 *
 * The call is waiting on this response, so it must stay fast and must never
 * fail: any error returns empty specials rather than a non-200, so a database
 * problem can slow a call but never break one.
 *
 * Secret: CALL_START_SECRET, sent as the x-neuva-secret header.
 */

interface Special {
  name_en: string;
  name_fr: string | null;
  price: number;
}

/** "Lamb mansaf plate, 24.99. Chicken shawarma family pack, 39.99." */
function speakEn(specials: Special[]): string {
  return specials.map((s) => `${s.name_en}, ${s.price.toFixed(2)}`).join('. ') + (specials.length ? '.' : '');
}

/** Same, in French, with the Quebec decimal comma: "24,99". */
function speakFr(specials: Special[]): string {
  return (
    specials
      .map((s) => `${s.name_fr || s.name_en}, ${s.price.toFixed(2).replace('.', ',')}`)
      .join('. ') + (specials.length ? '.' : '')
  );
}

function respond(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Retell reads dynamic variables from `call_inbound.dynamic_variables`;
 * the spec's ElevenLabs shape puts them at the top level. Returning both
 * keys satisfies either platform, and the unused one is ignored.
 */
function variables(specials: string, specialsFr: string, has: boolean) {
  const vars = { specials, specials_fr: specialsFr, has_specials: String(has) };
  return { dynamic_variables: vars, call_inbound: { dynamic_variables: vars } };
}

const EMPTY = variables('', '', false);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Two accepted callers. Retell's inbound webhook has no custom-header
  // setting, so it cannot send x-neuva-secret; it signs with
  // x-retell-signature instead. The shared secret stays for our own calls and
  // for any platform that can set a header (the spec's ElevenLabs path).
  const expected = Deno.env.get('CALL_START_SECRET');
  const hasSecret = expected && req.headers.get('x-neuva-secret') === expected;
  const hasRetellSignature = req.headers.has('x-retell-signature');

  if (expected && !hasSecret && !hasRetellSignature) {
    console.warn('call-start rejected: no valid x-neuva-secret or x-retell-signature');
    return respond({ error: 'unauthorized' }, 401);
  }

  try {
    // A direct PostgREST GET rather than supabase-js: the client's first call
    // pays an extra round trip, and the call is waiting on this response.
    // The filter mirrors live_specials() in SQL — same is_active plus
    // date-range rule the dashboard badge uses.
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });

    const resp = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/rest/v1/specials` +
        `?select=name_en,name_fr,price&is_active=eq.true` +
        `&start_date=lte.${today}&end_date=gte.${today}&order=price`,
      {
        headers: {
          apikey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
          Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        // Generous enough that a cold start still returns the specials, short
        // enough that a hung database cannot hold the call open. A tighter
        // budget silently dropped specials on cold invocations, which is worse
        // than a slower answer: the owner's specials would go unoffered with
        // nothing to show why.
        signal: AbortSignal.timeout(2500),
      },
    );

    if (!resp.ok) {
      console.error('specials query failed:', resp.status, await resp.text());
      return respond(EMPTY);
    }

    const rows = (await resp.json()) as Array<Record<string, unknown>>;

    const specials: Special[] = rows.map((s) => ({
      name_en: String(s.name_en),
      name_fr: s.name_fr ? String(s.name_fr) : null,
      price: Number(s.price),
    }));

    if (specials.length === 0) {
      return respond(EMPTY);
    }

    console.log(`call-start: returning ${specials.length} live special(s)`);

    return respond(variables(speakEn(specials), speakFr(specials), true));
  } catch (err) {
    // Never fail the call over specials.
    console.error('call-start error:', err);
    return respond(EMPTY);
  }
});
