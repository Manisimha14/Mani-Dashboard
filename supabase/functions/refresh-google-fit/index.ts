// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Ambient declarations for Deno runtime (resolves local compiler checks)
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get authorization header from client
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing Auth Header')
    }

    const { data: { user }, error } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
    if (error || !user) {
      throw new Error('Unauthorized')
    }

    // Retrieve the provider_refresh_token for Google from the auth.identities schema
    // In Supabase, identities table stores provider data
    const { data: identities, error: identityError } = await supabaseClient
      .from('identities')
      .select('identity_data')
      .eq('user_id', user.id)
      .eq('provider', 'google')

    if (identityError || !identities || identities.length === 0) {
      throw new Error('Google identity not found')
    }

    const providerRefreshToken = identities[0].identity_data?.provider_refresh_token
    if (!providerRefreshToken) {
      throw new Error('Google refresh token not found. Please sign out and sign back in to authorize.')
    }

    const client_id = Deno.env.get('GOOGLE_CLIENT_ID')
    const client_secret = Deno.env.get('GOOGLE_CLIENT_SECRET')

    if (!client_id || !client_secret) {
      throw new Error('Server environment error: Google OAuth credentials are not configured.')
    }

    // Call Google's token endpoint to refresh the access token
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id,
        client_secret,
        grant_type: 'refresh_token',
        refresh_token: providerRefreshToken,
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(`Google OAuth API rejected the refresh token: ${data.error_description || data.error}`)
    }

    return new Response(JSON.stringify({
      access_token: data.access_token,
      expires_in: data.expires_in,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
