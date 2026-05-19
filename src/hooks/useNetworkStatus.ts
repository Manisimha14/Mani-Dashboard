import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  
  // Connect to Zustand store to see if offline mode is simulated in settings
  const simulateOffline = useAppStore(s => s.userSettings?.simulateOffline ?? false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Sync initial state
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Return simulated offline state if active, otherwise standard network state
  return simulateOffline ? false : isOnline;
}
