import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

import { HelmetProvider } from 'react-helmet-async';

// Force PWA auto-update and instant activation on client load
registerSW({ immediate: true });

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('#root element missing from index.html');

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <HelmetProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </HelmetProvider>
  </React.StrictMode>
);
