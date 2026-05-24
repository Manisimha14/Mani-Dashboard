// @ts-expect-error Deno remote import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-expect-error Deno remote import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing auth header.');
    }

    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt);
    if (userError || !user) {
      throw new Error('Unauthorized.');
    }

    const body = await req.json().catch(() => ({}));
    const refreshToken = typeof body?.refreshToken === 'string' ? body.refreshToken.trim() : '';

    if (!refreshToken) {
      throw new Error('Missing Google refresh token.');
    }

    const { error: upsertError } = await supabaseClient
      .from('google_fit_tokens')
      .upsert({
        user_id: user.id,
        refresh_token: refreshToken,
      });

    if (upsertError) {
      throw new Error(`Failed to store Google refresh token: ${upsertError.message}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to store Google refresh token.';
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
