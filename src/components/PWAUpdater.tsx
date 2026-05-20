import React, { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import toast from 'react-hot-toast';
import { RefreshCw } from 'lucide-react';

export default function PWAUpdater() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Periodically check for updates every 60 minutes
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.warn('SW registration error', error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      toast(
        (t) => (
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="font-semibold text-white">New Version Available</p>
              <p className="text-sm text-white/70">A new update has been seamlessly downloaded in the background.</p>
            </div>
            <button
              onClick={() => {
                updateServiceWorker(true);
                toast.dismiss(t.id);
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
            >
              <RefreshCw size={14} /> Update Now
            </button>
          </div>
        ),
        { duration: Infinity, position: 'top-center' }
      );
    }
  }, [needRefresh, updateServiceWorker]);

  return null;
}
