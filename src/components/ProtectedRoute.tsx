import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

/**
 * Wraps routes that require authentication.
 * - Shows a full-screen spinner while the session is being resolved.
 * - Redirects to /login if the user is not authenticated.
 * - Renders children if the user is authenticated.
 *
 * NOTE: Auth is currently OPTIONAL — the app works without login.
 * To make auth mandatory, remove the offline bypass comment below
 * and uncomment the redirect.
 */
export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="text-violet-400 animate-spin" />
          <p className="text-white/40 text-sm">Loading your workspace…</p>
        </div>
      </div>
    );
  }

  // ── OFFLINE BYPASS ──────────────────────────────────────────────────────────
  // Currently the app is accessible without an account (localStorage mode).
  // To enforce login, replace the line below with:
  //   if (!user) return <Navigate to="/login" replace />;
  // ────────────────────────────────────────────────────────────────────────────
  if (!user) {
    // Allow unauthenticated access — data lives in localStorage.
    return <Outlet />;
  }

  return <Outlet />;
}
