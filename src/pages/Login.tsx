import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Zap, ArrowRight, CheckCircle, Loader2, Home } from 'lucide-react';

// ─── Floating orb background element ─────────────────────────────────────────
function Orb({ className }: { className?: string }) {
  return (
    <div
      className={`absolute rounded-full blur-3xl opacity-20 pointer-events-none ${className}`}
    />
  );
}

// ─── Main Login Page ─────────────────────────────────────────────────────────
export default function LoginPage() {
  const { signInWithGoogle, signInWithMagicLink, authError } = useAuth();

  const [email, setEmail] = useState('');
  const [magicSent, setMagicSent] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch {
      setError('Could not open Google sign-in. Please try again.');
      setGoogleLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setMagicLoading(true);
    setError(null);
    const { error: err } = await signInWithMagicLink(email.trim());
    setMagicLoading(false);
    if (err) {
      setError(err);
    } else {
      setMagicSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center relative overflow-hidden">
      {/* Ambient orbs */}
      <Orb className="w-96 h-96 bg-violet-600 top-[-10%] left-[-5%]" />
      <Orb className="w-80 h-80 bg-indigo-500 bottom-[-8%] right-[-4%]" />
      <Orb className="w-64 h-64 bg-purple-400 top-[40%] right-[10%]" />

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(139,92,246,0.8) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139,92,246,0.8) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div
          className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl p-8 shadow-2xl"
          style={{ boxShadow: '0 0 80px rgba(139,92,246,0.15)' }}
        >
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">

          {/* Auth error banner (e.g. schema not run) */}
          {authError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs leading-relaxed">
              <span className="font-bold block mb-0.5">⚠ Sign-in failed</span>
              {authError}
            </div>
          )}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Zap size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-xl leading-none">Life OS</h1>
              <p className="text-white/40 text-xs mt-0.5">Elite Productivity Dashboard</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {magicSent ? (
              /* ── Success state ── */
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-6"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} className="text-emerald-400" />
                </div>
                <h2 className="text-white text-xl font-semibold mb-2">Check your inbox</h2>
                <p className="text-white/50 text-sm leading-relaxed">
                  We sent a magic link to <span className="text-violet-400 font-medium">{email}</span>.
                  Click it to sign in — no password needed.
                </p>
                <button
                  onClick={() => { setMagicSent(false); setEmail(''); }}
                  className="mt-6 text-sm text-white/40 hover:text-white/70 transition-colors"
                >
                  Use a different email
                </button>
              </motion.div>
            ) : (
              /* ── Login form ── */
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="text-white text-2xl font-bold mb-1">Welcome back</h2>
                <p className="text-white/40 text-sm mb-7">
                  Sign in to sync your data across devices.
                </p>

                {/* Google */}
                <button
                  id="login-google"
                  onClick={handleGoogle}
                  disabled={googleLoading || magicLoading}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-white font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group mb-4"
                >
                  {googleLoading ? (
                    <Loader2 size={18} className="animate-spin text-white/70" />
                  ) : (
                    <Home size={18} className="text-white/70 group-hover:text-white transition-colors" />
                  )}
                  Continue with Google
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-white/30 text-xs">or</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                {/* Magic link form */}
                <form onSubmit={handleMagicLink} className="space-y-3">
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                    <input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-violet-500/60 focus:bg-white/8 transition-all duration-200"
                    />
                  </div>

                  <button
                    id="login-magic-link"
                    type="submit"
                    disabled={magicLoading || googleLoading || !email}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-500/25"
                  >
                    {magicLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        Send magic link
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </form>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-3 text-rose-400 text-xs text-center"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                <p className="mt-6 text-white/25 text-xs text-center leading-relaxed">
                  By continuing, you agree to our{' '}
                  <span className="text-white/40">Terms of Service</span> and{' '}
                  <span className="text-white/40">Privacy Policy</span>.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Skip for now (offline mode) */}
        <p className="text-center mt-4 text-white/25 text-xs">
          Using without an account?{' '}
          <span className="text-white/40">
            Data is saved locally only.
          </span>
        </p>
      </motion.div>
    </div>
  );
}
