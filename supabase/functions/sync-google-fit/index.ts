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

function parseAggregate(data: unknown) {
  const payload = data as {
    bucket?: Array<{
      dataset?: Array<{
        dataSourceId?: string;
        point?: Array<{
          value?: Array<{
            intVal?: number;
            fpVal?: number;
          }>;
        }>;
      }>;
    }>;
  };
  let steps = 0;
  let calories = 0;
  let activeMinutes = 0;

  if (!payload.bucket?.[0]?.dataset) {
    return { steps, calories, activeMinutes };
  }

  for (const dataset of payload.bucket[0].dataset) {
    const source = dataset.dataSourceId || '';
    const point = dataset.point?.[0];

    if (!point) continue;

    if (source.includes('step_count')) {
      steps = point.value?.[0]?.intVal ?? Math.round(point.value?.[0]?.fpVal ?? 0);
    }

    if (source.includes('calories')) {
      calories = Math.round(point.value?.[0]?.fpVal ?? point.value?.[0]?.intVal ?? 0);
    }

    if (source.includes('active_minutes')) {
      activeMinutes = point.value?.[0]?.intVal ?? Math.round(point.value?.[0]?.fpVal ?? 0);
    }
  }

  return { steps, calories, activeMinutes };
}

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

    const { data: identities, error: identityError } = await supabaseClient
      .from('identities')
      .select('identity_data')
      .eq('user_id', user.id)
      .eq('provider', 'google');

    if (identityError || !identities?.length) {
      throw new Error('Google identity not found for this account.');
    }

    const providerRefreshToken = identities[0].identity_data?.provider_refresh_token;
    if (!providerRefreshToken) {
      throw new Error('Google refresh token not found. Sign in with Google again to reconnect Fit sync.');
    }

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials are not configured on the server.');
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: providerRefreshToken,
      }),
    });

    const tokenPayload = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenPayload?.access_token) {
      throw new Error(`Google OAuth refresh failed: ${tokenPayload?.error_description || tokenPayload?.error || 'unknown error'}`);
    }

    const requestBody = await req.json().catch(() => ({}));
    const startTimeMillis = Number.isFinite(requestBody?.startTimeMillis) ? requestBody.startTimeMillis : undefined;
    const endTimeMillis = Number.isFinite(requestBody?.endTimeMillis) ? requestBody.endTimeMillis : undefined;

    if (!startTimeMillis || !endTimeMillis) {
      throw new Error('Missing Google Fit time range.');
    }

    const aggregateResponse = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenPayload.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        aggregateBy: [
          { dataTypeName: 'com.google.step_count.delta' },
          { dataTypeName: 'com.google.calories.expended' },
          { dataTypeName: 'com.google.active_minutes' },
        ],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis,
        endTimeMillis,
      }),
    });

    const aggregatePayload = await aggregateResponse.json();
    if (!aggregateResponse.ok) {
      throw new Error(`Google Fit API error ${aggregateResponse.status}: ${aggregatePayload?.error?.message || 'unknown error'}`);
    }

    return new Response(JSON.stringify(parseAggregate(aggregatePayload)), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Google Fit sync failed.';
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
