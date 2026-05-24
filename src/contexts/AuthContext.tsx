import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';
import { useHealthStore } from '../store/useHealthStore';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Detect OAuth error params in the URL (e.g. ?error=server_error&error_description=Database+error)
    const params = new URLSearchParams(window.location.search);
    const urlError = params.get('error');
    const urlDesc  = params.get('error_description');
    if (urlError) {
      const msg = urlDesc
        ? decodeURIComponent(urlDesc.replace(/\+/g, ' '))
        : urlError;
      // If it's a database error, it almost always means the schema hasn't been run
      const hint = msg.toLowerCase().includes('database')
        ? ' — Have you run supabase/schema.sql in your Supabase project?'
        : '';
      setAuthError(`Auth error: ${msg}${hint}`);
      // Clean the URL so the error doesn't persist on refresh
      window.history.replaceState({}, '', window.location.pathname);
    }

    // Fetch initial session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    // Listen for auth state changes
    let previousUser: User | null = null;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      const currentUser = newSession?.user ?? null;
      setSession(newSession);
      setLoading(false);
      
      if (newSession) {
        setAuthError(null); // clear error once successfully signed in
      }
      if (event === 'SIGNED_OUT') {
        // Only clear stores and local storage if we actually had a previous authenticated user session.
        // This stops the initial passive unauthenticated load from destroying local guest data.
        if (previousUser) {
          useAppStore.getState().resetData();
          useHealthStore.setState({
            meals: [],
            water: [],
            workouts: [],
            sleep: [],
            weight: [],
            steps: {},
          });
          localStorage.removeItem('dashboard-storage');
          localStorage.removeItem('health-storage-v2');
        }
      }
      previousUser = currentUser;
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        scopes: 'https://www.googleapis.com/auth/fitness.activity.read https://www.googleapis.com/auth/fitness.body.read',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    if (error) {
      setAuthError(`OAuth Config Error: ${error.message} (Did you enable Google in Supabase Auth -> Providers?)`);
    }
  };

  const signInWithMagicLink = async (email: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    useAppStore.getState().resetData();
    useHealthStore.setState({
      meals: [],
      water: [],
      workouts: [],
      sleep: [],
      weight: [],
      steps: {},
    });
    localStorage.removeItem('dashboard-storage');
    localStorage.removeItem('health-storage-v2');
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        authError,
        signInWithGoogle,
        signInWithMagicLink,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
