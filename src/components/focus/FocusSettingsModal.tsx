import React from 'react';
import Modal from '../Modal';
import { toast } from 'react-hot-toast';
import { useAppStore } from '../../store/useAppStore';
import type { GrowthTheme } from '../../types';

interface FocusSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const GROWTH_THEMES: { type: GrowthTheme; emoji: string; label: string }[] = [
  { type: 'tree',    emoji: '🌳', label: 'Tree'        },
  { type: 'crystal', emoji: '💎', label: 'Crystal'     },
  { type: 'bonsai',  emoji: '🎋', label: 'Bonsai'      },
  { type: 'space',   emoji: '🚀', label: 'Space'       },
  { type: 'cyber',   emoji: '🌿', label: 'Cyber Plant' },
];

export const FocusSettingsModal = React.memo(function FocusSettingsModal({
  open,
  onClose,
}: FocusSettingsModalProps) {
  const pomodoroSettings = useAppStore((s) => s.pomodoroSettings);
  const updatePomodoroSettings = useAppStore((s) => s.updatePomodoroSettings);

  return (
    <Modal open={open} onClose={onClose} title="Timer Settings" maxWidth="max-w-md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Focus (min)',            key: 'focusDuration',              min: 1,  max: 120 },
            { label: 'Short Break (min)',       key: 'shortBreakDuration',         min: 1,  max: 30  },
            { label: 'Long Break (min)',        key: 'longBreakDuration',          min: 5,  max: 60  },
            { label: 'Sessions → Long Break',  key: 'sessionsBeforeLongBreak',    min: 1,  max: 8   },
          ].map(({ label, key, min, max }) => (
            <div key={key}>
              <label className="text-xs text-white/40 mb-1 block">{label}</label>
              <input
                type="number"
                min={min}
                max={max}
                className="input-glass w-full px-3 py-2 text-sm"
                value={(pomodoroSettings as any)[key]}
                onChange={(e) => updatePomodoroSettings({ [key]: +e.target.value } as any)}
              />
            </div>
          ))}
        </div>

        <div>
          <label className="text-xs text-white/40 mb-2 block">Growth Theme</label>
          <div className="flex gap-2 flex-wrap">
            {GROWTH_THEMES.map((t) => (
              <button
                key={t.type}
                onClick={() => updatePomodoroSettings({ growthTheme: t.type })}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all border ${
                  pomodoroSettings.growthTheme === t.type
                    ? 'bg-white/10 text-white border-white/25'
                    : 'text-white/30 border-white/8 hover:text-white/60'
                }`}
              >
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => {
            onClose();
            toast.success('Settings saved!');
          }}
          className="btn-glow w-full py-2 text-sm"
        >
          Save Settings
        </button>
      </div>
    </Modal>
  );
});
