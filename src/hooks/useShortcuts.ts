import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { toast } from 'react-hot-toast';

export function useShortcuts() {
  const navigate = useNavigate();
  const { userSettings, updateLauncher, launcher } = useAppStore();

  useEffect(() => {
    if (!userSettings.keyboardShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        if (e.key === 'Escape') {
          (document.activeElement as HTMLElement).blur();
        }
        return;
      }

      if (e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'k':
            e.preventDefault();
            updateLauncher({ launcherOpen: !launcher.launcherOpen });
            break;
          case 's':
            e.preventDefault();
            navigate('/settings');
            break;
          case 'f':
            e.preventDefault();
            navigate('/focus');
            break;
          case 'r':
            e.preventDefault();
            toast.success('Neural sync complete. System optimized.', {
              icon: '🧠',
              duration: 2000
            });
            break;
          case 'd':
            e.preventDefault();
            navigate('/');
            break;
          case 'a':
            e.preventDefault();
            navigate('/analytics');
            break;
        }
      }

      if (e.key === 'Escape') {
        if (launcher.launcherOpen) {
          updateLauncher({ launcherOpen: false });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [userSettings.keyboardShortcuts, launcher.launcherOpen, updateLauncher, navigate]);
}
