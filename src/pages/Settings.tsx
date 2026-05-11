import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { exportToJSON, importFromJSON } from '../lib/utils';
import { Download, Upload, Trash2, Moon, Sun, Palette, Sliders, User, Shield, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import type { AppTheme } from '../types';

export default function Settings() {
  const { userSettings, updateUserSettings, pomodoroSettings, exportData, importData, resetData } = useAppStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const data = exportData();
    exportToJSON(data, `dashboard-backup-${new Date().toISOString().split('T')[0]}.json`);
    toast.success('Data exported!');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await importFromJSON(file);
      importData(data);
      toast.success('Data imported successfully!');
    } catch {
      toast.error('Invalid backup file');
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset ALL data? This cannot be undone.')) {
      resetData();
      toast.success('Data reset. Fresh start! 🌱');
    }
  };

  const accentColors = [
    { id: 'violet', label: 'Violet', color: '#8b5cf6' },
    { id: 'cyan', label: 'Cyan', color: '#06b6d4' },
    { id: 'pink', label: 'Pink', color: '#ec4899' },
    { id: 'emerald', label: 'Emerald', color: '#10b981' },
    { id: 'amber', label: 'Amber', color: '#f59e0b' },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-white/40 mt-1 text-sm">Customize your Dashboard experience</p>
      </div>

      {/* Profile */}
      <Section title="Profile" icon={<User size={16} />}>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/40 mb-1 block">Display Name</label>
            <input
              className="input-glass w-full px-3 py-2 text-sm"
              placeholder="Your name"
              value={userSettings.name || ''}
              onChange={e => updateUserSettings({ name: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Custom Quote</label>
            <textarea
              className="input-glass w-full px-3 py-2 text-sm resize-none"
              rows={2}
              placeholder="Your personal motivational quote..."
              value={userSettings.customQuote || ''}
              onChange={e => updateUserSettings({ customQuote: e.target.value })}
            />
          </div>
        </div>
      </Section>

      {/* Focus Mood */}
      <Section title="Focus Vibe" icon={<Zap size={16} />}>
        <div className="grid grid-cols-5 gap-3">
          {(['focused', 'grind', 'chill', 'zen', 'creative'] as const).map(m => (
            <button
              key={m}
              onClick={() => updateUserSettings({ mood: m })}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                userSettings.mood === m
                  ? 'bg-violet-600/20 border-violet-500/50 text-white'
                  : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
              }`}
            >
              <span className="text-[10px] font-black uppercase tracking-tighter">{m}</span>
            </button>
          ))}
        </div>
        <p className="text-[10px] text-white/20 mt-3 italic text-center">Your current vibe affects the personality of your notifications and mascot.</p>
      </Section>

      {/* Appearance */}
      <Section title="Theme Studio" icon={<Palette size={16} />}>
        <div className="space-y-6">
          <div>
            <label className="text-xs text-white/40 mb-3 block uppercase tracking-widest font-black">Visual Identity</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'dark_pro', name: 'Pro Dark', emoji: '🌌' },
                { id: 'oled', name: 'OLED Black', emoji: '🌑' },
                { id: 'cyberpunk', name: 'Cyberpunk', emoji: '⚡' },
                { id: 'forest', name: 'Emerald Forest', emoji: '🌲' },
                { id: 'nebula', name: 'Cosmic Nebula', emoji: '🪐' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => updateUserSettings({ theme: t.id as AppTheme })}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                    userSettings.theme === t.id
                      ? 'bg-violet-500/20 border-violet-500/50 text-white'
                      : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                  }`}
                >
                  <span className="text-xl">{t.emoji}</span>
                  <span className="text-sm font-medium">{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-white/40 mb-3 block uppercase tracking-widest font-black">Accent Engine</label>
            <div className="flex gap-4 items-center">
              <div className="flex gap-2">
                {accentColors.map(c => (
                  <button
                    key={c.id}
                    onClick={() => updateUserSettings({ accentColor: c.color })}
                    className={`w-10 h-10 rounded-xl border-2 transition-all shadow-lg ${userSettings.accentColor === c.color ? 'border-white scale-110' : 'border-transparent'}`}
                    style={{ background: c.color }}
                    title={c.label}
                  />
                ))}
              </div>
              <div className="h-8 w-[1px] bg-white/10 mx-2" />
              <input 
                type="color" 
                value={userSettings.accentColor}
                onChange={(e) => updateUserSettings({ accentColor: e.target.value })}
                className="w-10 h-10 rounded-xl bg-transparent border-none cursor-pointer p-0"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-white/40 mb-3 block uppercase tracking-widest font-black">Motion Engine</label>
            <div className="flex gap-2">
              {(['none', 'subtle', 'full'] as const).map(a => (
                <button
                  key={a}
                  onClick={() => updateUserSettings({ animationIntensity: a })}
                  className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                    userSettings.animationIntensity === a
                      ? 'bg-violet-600/30 text-violet-300 border border-violet-500/40'
                      : 'text-white/40 border border-white/10'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
            <div>
              <span className="text-sm text-white/70 font-bold">Ultra Compact</span>
              <div className="text-[10px] text-white/30 font-bold uppercase">Denser layouts for power users</div>
            </div>
            <button
              onClick={() => updateUserSettings({ compactMode: !userSettings.compactMode })}
              className={`relative w-10 h-6 rounded-full transition-colors ${userSettings.compactMode ? 'bg-violet-600 shadow-[0_0_10px_rgba(139,92,246,0.5)]' : 'bg-white/10'}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${userSettings.compactMode ? 'translate-x-4' : ''}`} />
            </button>
          </div>
        </div>
      </Section>

      {/* Data Management */}
      <Section title="Data Management" icon={<Shield size={16} />}>
        <div className="space-y-3">
          <div className="flex gap-3">
            <button onClick={handleExport} className="btn-ghost flex-1 py-2 text-sm flex items-center justify-center gap-2">
              <Download size={14} /> Export JSON
            </button>
            <button onClick={() => fileRef.current?.click()} className="btn-ghost flex-1 py-2 text-sm flex items-center justify-center gap-2">
              <Upload size={14} /> Import Backup
            </button>
          </div>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          <div className="border-t border-white/5 pt-3">
            <button
              onClick={handleReset}
              className="w-full py-2 text-sm text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 size={14} /> Reset All Data
            </button>
            <p className="text-xs text-white/20 text-center mt-2">This will permanently delete all your progress</p>
          </div>
        </div>
      </Section>

      {/* About */}
      <div className="glass-card p-5 text-center">
        <div className="text-2xl mb-2">⚡</div>
        <div className="font-bold text-white">Dashboard v1.0</div>
        <div className="text-xs text-white/30 mt-1">Premium Productivity · Built with ♥</div>
        <div className="text-xs text-white/20 mt-1">Data stored locally · No servers · PWA ready</div>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/5">
        <span className="text-violet-400">{icon}</span>
        <h3 className="font-semibold text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}
