import React, { Suspense, lazy, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import AppQueryProvider from './components/AppQueryProvider';
import { useAppStore } from './store/useAppStore';
import { useAuth } from './contexts/AuthContext';
import { applyTheme } from './lib/themes';

const Layout = lazy(() => import('./components/Layout'));

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Reading = lazy(() => import('./pages/Reading'));
const LeetCode = lazy(() => import('./pages/LeetCode'));
const FocusMode = lazy(() => import('./pages/FocusMode'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Achievements = lazy(() => import('./pages/Achievements'));
const Settings = lazy(() => import('./pages/Settings'));
const Trackers = lazy(() => import('./pages/Trackers'));
const Health = lazy(() => import('./pages/Health'));
const Ambient = lazy(() => import('./pages/Ambient'));
const Onboarding = lazy(() => import('./components/Onboarding'));

function RouteFallback() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
    >
      <div className="glass-card px-6 py-5 text-center">
        <div className="text-xs font-black uppercase tracking-[0.3em] text-white/40">Loading</div>
        <div className="mt-2 text-sm text-white/70">Preparing the next surface.</div>
      </div>
    </div>
  );
}

export default function App() {
  const { userSettings } = useAppStore();
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    setShowOnboarding(Boolean(user) && !userSettings.onboardingComplete);
  }, [user, userSettings.onboardingComplete]);

  useEffect(() => {
    applyTheme(userSettings.theme, userSettings.accentColor);
  }, [userSettings.theme, userSettings.accentColor]);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          {showOnboarding ? (
            <Onboarding onComplete={() => setShowOnboarding(false)} />
          ) : (
            <Routes>
              {/* Public route */}
              <Route path="/login" element={<Login />} />

              {/* Protected routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<AppQueryProvider><Layout /></AppQueryProvider>}>
                  <Route index element={<Dashboard />} />
                  <Route path="focus" element={<FocusMode />} />
                  <Route path="reading" element={<Reading />} />
                  <Route path="leetcode" element={<LeetCode />} />
                  <Route path="trackers" element={<Trackers />} />
                  <Route path="health" element={<Health />} />
                  <Route path="ambient" element={<Ambient />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="achievements" element={<Achievements />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Route>
            </Routes>
          )}
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
