import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Reading from './pages/Reading';
import LeetCode from './pages/LeetCode';
import FocusMode from './pages/FocusMode';
import Analytics from './pages/Analytics';
import Achievements from './pages/Achievements';
import Settings from './pages/Settings';
import Trackers from './pages/Trackers';
import Onboarding from './components/Onboarding';
import ErrorBoundary from './components/ErrorBoundary';
import { useAppStore } from './store/useAppStore';

export default function App() {
  const { userSettings } = useAppStore();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    setShowOnboarding(!userSettings.onboardingComplete);
  }, [userSettings.onboardingComplete]);

  useEffect(() => {
    import('./lib/themes').then(({ applyTheme }) => {
      applyTheme(userSettings.theme as any, userSettings.accentColor);
    });
  }, [userSettings.theme, userSettings.accentColor]);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        {showOnboarding ? (
          <Onboarding onComplete={() => setShowOnboarding(false)} />
        ) : (
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="focus" element={<FocusMode />} />
              <Route path="reading" element={<Reading />} />
              <Route path="leetcode" element={<LeetCode />} />
              <Route path="trackers" element={<Trackers />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="achievements" element={<Achievements />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<div className="p-8 text-white/50 text-center">Page not found</div>} />
            </Route>
          </Routes>
        )}
      </BrowserRouter>
    </ErrorBoundary>
  );
}
