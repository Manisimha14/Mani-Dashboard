import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { Zap, BookOpen, Code2, Timer, ChevronRight, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useProfile, useUpdateProfile } from '../hooks/useProfileQuery';
import { useSetBookMeta } from '../hooks/useBookQuery';

const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to MANI OS',
    subtitle: 'Your premium productivity companion',
    emoji: '⚡',
    content: null,
  },
  {
    id: 'profile',
    title: 'Set up your profile',
    subtitle: 'Let us personalize your experience',
    emoji: '👤',
    content: 'profile',
  },
  {
    id: 'book',
    title: 'Your Book Journey',
    subtitle: 'Track your 51-chapter reading marathon',
    emoji: '📖',
    content: 'book',
  },
  {
    id: 'features',
    title: "You're all set!",
    subtitle: 'Start with any feature below',
    emoji: '🚀',
    content: 'features',
  },
];

interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const { updateUserSettings, setBookMeta } = useAppStore();

  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { mutate: updateProfile } = useUpdateProfile();
  const { mutate: setBookMetaMutate } = useSetBookMeta();

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handleNext = () => {
    if (step === 1 && name) {
      updateUserSettings({ name });
      if (user && profile) {
        updateProfile({ settings: { ...profile.settings, name } });
      }
    }
    if (step === 2) {
      const meta: any = {};
      if (bookTitle) meta.title = bookTitle;
      if (bookAuthor) meta.author = bookAuthor;
      
      if (Object.keys(meta).length > 0) {
        if (user) {
          setBookMetaMutate(meta);
        } else {
          setBookMeta(meta);
        }
      }
    }
    if (isLast) {
      updateUserSettings({ onboardingComplete: true });
      if (user && profile) {
        updateProfile({ settings: { ...profile.settings, onboardingComplete: true } });
      }
      onComplete();
    } else {
      setStep(s => s + 1);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(225,20%,6%)] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background blobs */}
      <div className="ambient-blob w-96 h-96 bg-violet-600 top-[-10%] left-[-10%]" />
      <div className="ambient-blob w-80 h-80 bg-purple-800 bottom-[-10%] right-[-10%]" style={{ animationDelay: '3s' }} />

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="glass-card p-10 w-full max-w-lg relative z-10"
        >
          {/* Step dots */}
          <div className="flex gap-1.5 mb-8 justify-center">
            {STEPS.map((_, i) => (
              <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === step ? 'w-6 bg-violet-500' : i < step ? 'w-4 bg-violet-500/40' : 'w-4 bg-white/10'}`} />
            ))}
          </div>

          {/* Content */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-4 animate-bounce">{currentStep.emoji}</div>
            <h1 className="text-2xl font-bold text-white mb-2">{currentStep.title}</h1>
            <p className="text-white/40">{currentStep.subtitle}</p>
          </div>

          {/* Step-specific content */}
          {currentStep.content === 'profile' && (
            <div className="space-y-3 mb-6">
              <input
                className="input-glass w-full px-4 py-3 text-center"
                placeholder="What's your name?"
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
              />
            </div>
          )}

          {currentStep.content === 'book' && (
            <div className="space-y-3 mb-6">
              <input
                className="input-glass w-full px-4 py-3"
                placeholder="Book title (e.g. Clean Code)"
                value={bookTitle}
                onChange={e => setBookTitle(e.target.value)}
              />
              <input
                className="input-glass w-full px-4 py-3"
                placeholder="Author name"
                value={bookAuthor}
                onChange={e => setBookAuthor(e.target.value)}
              />
              <p className="text-xs text-white/30 text-center">You can change this anytime in the Reading section</p>
            </div>
          )}

          {currentStep.content === 'features' && (
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { icon: '🌳', label: 'Forest Mode', desc: 'Deep focus' },
                { icon: '📚', label: 'Reading', desc: '51 chapters' },
                { icon: '💻', label: 'LeetCode', desc: 'Daily tracking' },
              ].map(f => (
                <div key={f.label} className="glass-card p-3 text-center">
                  <div className="text-2xl mb-1">{f.icon}</div>
                  <div className="text-xs font-semibold text-white">{f.label}</div>
                  <div className="text-xs text-white/30">{f.desc}</div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleNext}
            className="btn-glow w-full py-3 flex items-center justify-center gap-2 font-semibold"
          >
            {isLast ? (
              <>Let's Go! <Zap size={16} /></>
            ) : (
              <>Continue <ChevronRight size={16} /></>
            )}
          </button>

          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} className="w-full py-2 mt-2 text-sm text-white/30 hover:text-white/60 transition-colors">
              ← Back
            </button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
