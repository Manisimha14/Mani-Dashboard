import { createClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string) ?? '';
const rawAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ?? '';

const isConfigured = !!rawUrl && !!rawAnonKey;

if (!isConfigured) {
  console.warn(
    '[Supabase] Missing env vars. Create a .env file with:\n' +
    '  VITE_SUPABASE_URL=https://<project>.supabase.co\n' +
    '  VITE_SUPABASE_ANON_KEY=<anon-key>\n' +
    'The app will run in offline (localStorage) mode until then.'
  );
}

// Fallback to valid-looking URL structure and key to prevent supabase-js constructor from throwing a fatal crash
const supabaseUrl = rawUrl || 'https://placeholder-project-url.supabase.co';
const supabaseAnonKey = rawAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
