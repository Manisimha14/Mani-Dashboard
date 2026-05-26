import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Modal from '../Modal';

interface TaskPromptModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (taskName: string, mood: string) => void;
}

export const TaskPromptModal = React.memo(function TaskPromptModal({
  open,
  onClose,
  onConfirm,
}: TaskPromptModalProps) {
  const [taskName, setTaskName] = useState('');
  const [mood, setMood] = useState('');

  const handleConfirm = () => {
    onConfirm(taskName, mood);
    setTaskName('');
    setMood('');
  };

  return (
    <Modal open={open} onClose={onClose} showClose={false} maxWidth="max-w-md">
      <div className="text-center mb-5">
        <div className="text-4xl mb-3">🎯</div>
        <h3 className="font-bold text-white text-lg">Set Your Intention</h3>
        <p className="text-white/40 text-sm mt-1">What are you focusing on?</p>
      </div>
      <input
        className="input-glass w-full px-4 py-3 text-sm text-center mb-4"
        placeholder="e.g. Solve DP problems, read chapter 12…"
        value={taskName}
        onChange={(e) => setTaskName(e.target.value)}
        autoFocus
        onKeyDown={(e) => e.key === 'Enter' && mood && handleConfirm()}
      />

      <div className="mb-6">
        <label className="text-xs text-white/40 mb-2 block text-center">How are you feeling?</label>
        <div className="flex flex-wrap justify-center gap-2">
          {[
            { id: 'energetic', emoji: '⚡', label: 'Energetic' },
            { id: 'calm', emoji: '🧘', label: 'Calm' },
            { id: 'motivated', emoji: '🔥', label: 'Motivated' },
            { id: 'tired', emoji: '🥱', label: 'Tired' },
            { id: 'stressed', emoji: '😫', label: 'Stressed' }
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setMood(m.id)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all border ${
                mood === m.id
                  ? 'bg-violet-600 border-violet-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]'
                  : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
              }`}
            >
              {m.emoji} {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleConfirm}
          disabled={!mood}
          className="btn-glow flex-1 py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          🌱 Plant & Focus
        </motion.button>
        <button onClick={onClose} className="btn-ghost px-4 py-2.5 text-sm">
          Cancel
        </button>
      </div>
    </Modal>
  );
});
