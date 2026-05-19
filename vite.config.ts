import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'MANI OS — Premium Productivity',
        short_name: 'MANI OS',
        description: 'Forest Pomodoro + Book Tracker + LeetCode + Analytics Dashboard',
        theme_color: '#7c3aed',
        background_color: '#0a0b14',
        display: 'standalone',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
        shortcuts: [
          {
            name: 'Start Focus Session',
            short_name: 'Focus',
            description: 'Launch the Forest Pomodoro tree tracker immediately',
            url: '/focus',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
          },
          {
            name: 'Log Solve',
            short_name: 'Log Code',
            description: 'Log a resolved software engineering or DSA problem',
            url: '/leetcode',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
          },
          {
            name: 'Weekly Report',
            short_name: 'Report',
            description: 'View the executive performance analytics report',
            url: '/dashboard?showReport=true',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
          }
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return;
          }

          if (id.includes('recharts')) {
            return 'vendor-charts';
          }

          if (id.includes('@supabase')) {
            return 'vendor-supabase';
          }

          if (id.includes('@tanstack/react-query')) {
            return 'vendor-query';
          }

          if (id.includes('zustand') || id.includes('dexie')) {
            return 'vendor-state';
          }

          if (id.includes('framer-motion') || id.includes('gsap') || id.includes('react-confetti')) {
            return 'vendor-motion';
          }

          if (id.includes('react-router') || id.includes('react-dom') || id.includes('/react/')) {
            return 'vendor-react';
          }

          if (id.includes('lucide-react') || id.includes('@radix-ui') || id.includes('cmdk') || id.includes('react-hot-toast')) {
            return 'vendor-ui';
          }
        },
      },
    },
  },
});

// Trigger Vercel rebuild for pwa-2 fullscreen improvements

