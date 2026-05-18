import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import {
  Palette, User, Shield, Zap, Search,
  Keyboard, Beaker, MousePointer2, Globe,
  Trash2, Check, AlertCircle, Cloud, LogIn, LogOut,
  Layout, Monitor, Activity, Bell, RefreshCw, Loader2
} from 'lucide-react';
import type { AppMood, UserSettings } from '../types';
import BackupManager from '../components/BackupManager';
import { useAuth } from '../contexts/AuthContext';
import { migrateLocalStorageToSupabase, isMigrationDone, markMigrationComplete } from '../lib/migration';
import { useProfile, useUpdateProfile } from '../hooks/useProfileQuery';
import { useHealthStore } from '../store/useHealthStore';
import { getAppVersion } from '../lib/appVersion';

type SettingsTab = 'general' | 'appearance' | 'controls' | 'notifications' | 'privacy' | 'labs';

import { THEMES } from '../lib/themes';

const DEFAULT_USER_SETTINGS: UserSettings = {
  theme: 'dark_pro',
  accentColor: '#8b5cf6',
  mood: 'focused',
  animationIntensity: 'full',
  reducedMotion: false,
  compactMode: false,
  customQuote: '',
  name: '',
  onboardingComplete: false,
  dashboardLayout: [],
  petType: 'bonsai',
  keyboardShortcuts: true,
};

export default function Settings() {
  const { data: profile } = useProfile();
  const { mutate: updateProfile } = useUpdateProfile();

  const userSettings: UserSettings = {
    ...DEFAULT_USER_SETTINGS,
    ...(profile?.settings ?? {}),
  };

  const updateUserSettings = (updates: Partial<UserSettings>) => {
    updateProfile({ settings: { ...userSettings, ...updates } });
  };

  const { user, signInWithGoogle, signOut, authError } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [search, setSearch] = useState('');
  const [migrating, setMigrating] = useState(false);
  const [migrateResult, setMigrateResult] = useState<string | null>(null);

  const [draftName, setDraftName] = useState(userSettings.name || '');
  const [draftQuote, setDraftQuote] = useState(userSettings.customQuote || '');

  React.useEffect(() => {
    setDraftName(userSettings.name || '');
  }, [userSettings.name]);

  React.useEffect(() => {
    setDraftQuote(userSettings.customQuote || '');
  }, [userSettings.customQuote]);

  const alreadyMigrated = user ? isMigrationDone(user.id) : false;

  const handleMigrate = async () => {
    if (!user) return;
    setMigrating(true);
    setMigrateResult(null);
    const result = await migrateLocalStorageToSupabase(user.id);
    const d = result.details;
    const errKeys = Object.keys(result.errors);
    if (errKeys.length === 0) {
      markMigrationComplete(user.id);
      setMigrateResult(`✅ Synced: ${Object.entries(d).filter(([,v]) => v > 0).map(([k,v]) => `${v} ${k}`).join(', ') || 'nothing to migrate (localStorage was empty)'}`);
    } else {
      // Partial success — some domains failed
      const synced = Object.entries(d).filter(([,v]) => v > 0).map(([k,v]) => `${v} ${k}`).join(', ');
      const errs = errKeys.map(k => `${k}: ${result.errors[k]}`).join(' | ');
      setMigrateResult(`⚠️ Partial: ${synced || 'nothing synced'} — Errors → ${errs}`);
    }
    setMigrating(false);
  };

  const filteredThemes = useMemo(() => 
    THEMES.filter(t => t.name.toLowerCase().includes(search.toLowerCase())),
    [search]
  );

  const accentColors = [
    { id: 'violet', label: 'Violet', color: '#8b5cf6' },
    { id: 'cyan', label: 'Cyan', color: '#06b6d4' },
    { id: 'pink', label: 'Pink', color: '#ec4899' },
    { id: 'emerald', label: 'Emerald', color: '#10b981' },
    { id: 'amber', label: 'Amber', color: '#f59e0b' },
    { id: 'rose', label: 'Rose', color: '#f43f5e' },
    { id: 'indigo', label: 'Indigo', color: '#6366f1' },
  ];

  const resetPreferences = () => {
    updateUserSettings({
      theme: 'dark_pro',
      accentColor: '#8b5cf6',
      mood: 'focused',
      animationIntensity: 'full',
      reducedMotion: false,
      compactMode: false,
      customQuote: '',
      name: '',
      keyboardShortcuts: true,
    });
  };

  const purgeAllData = () => {
    useAppStore.getState().resetData();
    useHealthStore.setState({
      meals: [],
      water: [],
      workouts: [],
      sleep: [],
      weight: [],
      goals: [],
      restrictions: [],
      steps: {},
    });
    localStorage.removeItem('dashboard-storage');
    localStorage.removeItem('health-storage-v2');
  };

  return (
    <div className="min-h-[80vh] flex flex-col md:flex-row gap-8">
      {/* --- Sidebar Navigation --- */}
      <div className="w-full md:w-64 flex flex-col gap-1">
        <div className="mb-6 px-2">
          <h1 className="text-2xl font-black tracking-tighter text-white">SYSTEM</h1>
          <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Antigravity Config {getAppVersion()}</div>
        </div>

        <NavButton 
          active={activeTab === 'general'} 
          onClick={() => setActiveTab('general')}
          icon={<User size={18} />} 
          label="Profile & Agent" 
        />
        <NavButton 
          active={activeTab === 'appearance'} 
          onClick={() => setActiveTab('appearance')}
          icon={<Palette size={18} />} 
          label="Interface Studio" 
        />
        <NavButton 
          active={activeTab === 'controls'} 
          onClick={() => setActiveTab('controls')}
          icon={<Keyboard size={18} />} 
          label="Control Deck" 
        />
        <NavButton 
          active={activeTab === 'notifications'} 
          onClick={() => setActiveTab('notifications')}
          icon={<Bell size={18} />} 
          label="Neural Alerts" 
        />
        <NavButton 
          active={activeTab === 'privacy'} 
          onClick={() => setActiveTab('privacy')}
          icon={<Shield size={18} />} 
          label="Data Vault" 
        />
        <div className="h-px bg-white/5 my-4 mx-2" />
        <NavButton 
          active={activeTab === 'labs'} 
          onClick={() => setActiveTab('labs')}
          icon={<Beaker size={18} />} 
          label="Experimental" 
          badge="BETA"
        />
      </div>

      {/* --- Main Content Area --- */}
      <div className="flex-1 max-w-3xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="space-y-8"
          >
            {/* SEARCH OVERLAY (Only if needed) */}
            <div className="relative mb-8">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
               <input 
                 type="text" 
                 placeholder={`Search in ${activeTab}...`} 
                 className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white placeholder:text-white/10 focus:outline-none focus:border-white/10 transition-all shadow-inner"
                 value={search}
                 onChange={e => setSearch(e.target.value)}
               />
            </div>

            {/* TAB CONTENT */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <Section title="Identity" icon={<User size={16} />} description="Configure how the dashboard addresses you.">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Agent Callsign</label>
                      <input
                        className="input-glass w-full px-4 py-3 text-sm focus:ring-1 focus:ring-violet-500/50"
                        placeholder="Your name..."
                        value={draftName}
                        onChange={e => setDraftName(e.target.value)}
                        onBlur={() => {
                          if (draftName !== userSettings.name) {
                            updateUserSettings({ name: draftName });
                          }
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Operating Mood</label>
                      <select 
                        className="input-glass w-full px-3 py-3 text-sm appearance-none cursor-pointer"
                        value={userSettings.mood}
                        onChange={e => updateUserSettings({ mood: e.target.value as AppMood })}
                      >
                        {['focused', 'grind', 'chill', 'zen', 'creative'].map(m => (
                          <option key={m} value={m} className="bg-slate-900">{m.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mt-6 space-y-2">
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Global Manifesto</label>
                    <textarea
                      className="input-glass w-full px-4 py-3 text-sm resize-none h-24"
                      placeholder="Enter a quote that anchors your focus..."
                      value={draftQuote}
                      onChange={e => setDraftQuote(e.target.value)}
                      onBlur={() => {
                        if (draftQuote !== userSettings.customQuote) {
                          updateUserSettings({ customQuote: draftQuote });
                        }
                      }}
                    />
                  </div>
                </Section>
                
                <Section title="Ecosystem" icon={<Monitor size={16} />} description="Dashboard layout and behavioral anchors.">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <ToggleRow 
                       label="Onboarding Active" 
                       description="Show helpful hints and setup guides"
                       active={!userSettings.onboardingComplete}
                       onToggle={() => updateUserSettings({ onboardingComplete: !userSettings.onboardingComplete })}
                     />
                     <ToggleRow 
                       label="Compact Layout" 
                       description="Denser grid for maximum data density"
                       active={userSettings.compactMode}
                       onToggle={() => updateUserSettings({ compactMode: !userSettings.compactMode })}
                     />
                  </div>
                </Section>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <Section title="Interface Studio" icon={<Palette size={16} />} description="Select a visual framework that aligns with your environment.">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredThemes.map(t => (
                      <button
                        key={t.id}
                        onClick={() => updateUserSettings({ theme: t.id })}
                        className={`group relative flex flex-col p-4 rounded-2xl border transition-all overflow-hidden text-left ${
                          userSettings.theme === t.id
                            ? 'bg-white/10 border-white/20 ring-1 ring-white/10 shadow-2xl'
                            : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10'
                        }`}
                      >
                         <div className="flex items-center gap-3 mb-3">
                            <div 
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-lg group-hover:scale-110 transition-transform overflow-hidden relative"
                              style={{ backgroundColor: t.previewColors[0] }}
                            >
                              <div className="absolute inset-0 flex flex-col">
                                <div className="flex-1" style={{ backgroundColor: t.previewColors[0] }} />
                                <div className="flex-1" style={{ backgroundColor: t.previewColors[1] }} />
                                <div className="h-1" style={{ backgroundColor: t.previewColors[2] }} />
                              </div>
                              <span className="relative z-10">{t.emoji}</span>
                            </div>
                            <div className="font-bold text-white text-sm tracking-tight">{t.name}</div>
                         </div>
                         <p className="text-[10px] text-white/30 font-medium leading-relaxed">{t.description}</p>
                        {userSettings.theme === t.id && (
                          <motion.div layoutId="active-theme" className="absolute top-4 right-4 text-violet-400">
                             <Check size={16} />
                          </motion.div>
                        )}
                      </button>
                    ))}
                  </div>
                </Section>

                <Section title="Chromatic Engine" icon={<Activity size={16} />} description="Accentuate the interface with your personal energy.">
                  <div className="flex flex-wrap gap-3 items-center">
                    {accentColors.map(c => (
                      <button
                        key={c.id}
                        onClick={() => updateUserSettings({ accentColor: c.color })}
                        className={`w-12 h-12 rounded-2xl border-4 transition-all ${userSettings.accentColor === c.color ? 'border-white scale-110 shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'border-transparent opacity-40 hover:opacity-100'}`}
                        style={{ background: c.color }}
                      />
                    ))}
                    <div className="h-10 w-px bg-white/10 mx-2" />
                    <div className="relative group">
                      <input 
                        type="color" 
                        value={userSettings.accentColor}
                        onChange={(e) => updateUserSettings({ accentColor: e.target.value })}
                        className="w-12 h-12 rounded-2xl bg-transparent border-none cursor-pointer p-0 opacity-0 absolute inset-0 z-10"
                      />
                      <div className="w-12 h-12 rounded-2xl border border-white/10 flex items-center justify-center bg-white/5 group-hover:bg-white/10 transition-colors">
                        <Globe size={18} className="text-white/40" />
                      </div>
                    </div>
                  </div>
                </Section>

                <Section title="Motion Physics" icon={<Zap size={16} />} description="Configure the fluidity of transitions and interactions.">
                  <div className="grid grid-cols-4 gap-2 p-1 bg-white/[0.02] border border-white/5 rounded-2xl">
                    {(['none', 'subtle', 'full', 'system'] as const).map(a => (
                      <button
                        key={a}
                        onClick={() => updateUserSettings({ animationIntensity: a })}
                        className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          userSettings.animationIntensity === a
                            ? 'bg-white/10 text-white shadow-lg'
                            : 'text-white/20 hover:text-white/40 hover:bg-white/[0.02]'
                        }`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </Section>
              </div>
            )}

            {activeTab === 'controls' && (
              <div className="space-y-6">
                <Section title="Control Deck" icon={<Keyboard size={16} />} description="Master the dashboard with precision keyboard inputs.">
                   <div className="space-y-4">
                     <ToggleRow 
                       label="Global Shortcuts" 
                       description="Enable Alt+K and other system hotkeys"
                       active={userSettings.keyboardShortcuts}
                       onToggle={() => updateUserSettings({ keyboardShortcuts: !userSettings.keyboardShortcuts })}
                     />
                     
                     <AnimatePresence>
                       {userSettings.keyboardShortcuts && (
                         <motion.div 
                           initial={{ height: 0, opacity: 0 }}
                           animate={{ height: 'auto', opacity: 1 }}
                           exit={{ height: 0, opacity: 0 }}
                           className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2"
                         >
                            <KbdAction action="Open Launcher" keys={['Alt', 'K']} />
                            <KbdAction action="Focus Toggle" keys={['Alt', 'F']} />
                            <KbdAction action="Neural Sync" keys={['Alt', 'R']} />
                            <KbdAction action="Quick Settings" keys={['Alt', 'S']} />
                            <KbdAction action="Close All" keys={['Esc']} />
                         </motion.div>
                       )}
                     </AnimatePresence>
                   </div>
                </Section>
                
                <Section title="Mouse Behavior" icon={<MousePointer2 size={16} />} description="Refine tactile interaction feedback.">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <ToggleRow 
                        label="Reduced Motion" 
                        description="Prioritize system accessibility"
                        active={userSettings.reducedMotion}
                        onToggle={() => updateUserSettings({ reducedMotion: !userSettings.reducedMotion })}
                      />
                   </div>
                </Section>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <Section title="Cloud Sync" icon={<Cloud size={16} />} description="Backup your data to the cloud and sync across devices via Supabase.">
                  {user ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                          <Check size={14} className="text-emerald-400" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-emerald-400">Signed in</div>
                          <div className="text-[10px] text-white/40 truncate max-w-[240px]">{user.email}</div>
                        </div>
                        <button
                          onClick={() => signOut()}
                          className="ml-auto flex items-center gap-1.5 text-[10px] text-white/30 hover:text-rose-400 transition-colors"
                        >
                          <LogOut size={12} /> Sign out
                        </button>
                      </div>

                      <button
                        id="settings-import-cloud"
                        onClick={handleMigrate}
                        disabled={migrating || alreadyMigrated}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-violet-600/20 border border-violet-500/30 hover:bg-violet-600/30 text-white font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {migrating ? (
                          <><Loader2 size={15} className="animate-spin" /> Importing…</>
                        ) : alreadyMigrated ? (
                          <><Check size={15} className="text-emerald-400" /> Already imported to cloud</>
                        ) : (
                          <><Cloud size={15} /> Import local data to cloud</>
                        )}
                      </button>

                      {migrateResult && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                          className={`text-xs leading-relaxed ${
                            migrateResult.startsWith('✅') ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {migrateResult}
                        </motion.p>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4 py-4">
                      {authError && (
                        <div className="p-3 w-full rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs leading-relaxed text-center mb-2">
                          <span className="font-bold block mb-0.5">⚠ Sign-in failed</span>
                          {authError}
                        </div>
                      )}
                      <p className="text-sm text-white/40 text-center">Sign in to enable cloud backup and cross-device sync.</p>
                      <button
                        onClick={() => signInWithGoogle()}
                        className="flex items-center gap-2 py-2.5 px-5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-sm font-semibold transition-all"
                      >
                        <LogIn size={15} /> Sign in with Google
                      </button>
                    </div>
                  )}
                </Section>

                <Section title="Data Crypt" icon={<Shield size={16} />} description="Your data is stored locally. We never track or export your metrics.">
                  <BackupManager />
                </Section>
                
                <Section title="Danger Zone" icon={<AlertCircle size={16} />} description="Irreversible system operations. Handle with caution.">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button 
                        onClick={() => { if(confirm('Reset all preferences?')) resetPreferences(); }}
                        className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/5 transition-all group"
                      >
                         <div className="text-left">
                            <div className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">Soft Reset</div>
                            <div className="text-[10px] text-white/20 font-medium">Reset preferences only</div>
                         </div>
                         <RefreshCw size={18} className="text-white/10 group-hover:text-amber-400 group-hover:rotate-180 transition-all duration-500" />
                      </button>
                      <button 
                         onClick={() => { if(confirm('WIPE ALL DATA? This cannot be undone.')) purgeAllData(); }}
                         className="flex items-center justify-between p-4 rounded-2xl bg-red-500/[0.02] border border-red-500/10 hover:bg-red-500/10 transition-all group"
                      >
                         <div className="text-left">
                            <div className="text-sm font-bold text-red-400/80 group-hover:text-red-400 transition-colors">System Purge</div>
                            <div className="text-[10px] text-red-500/20 font-medium">Wipe everything permanently</div>
                         </div>
                         <Trash2 size={18} className="text-red-500/20 group-hover:text-red-400 transition-colors" />
                      </button>
                   </div>
                </Section>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <Section title="Cognitive Anchors" icon={<Bell size={16} />} description="Configure non-intrusive smart alerts that keep your streak alive and mind sharp.">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <ToggleRow 
                       label="Drink Water Alert" 
                       description="Gentle prompts when hydration falls below daily milestone"
                       active={userSettings.waterAlerts ?? true}
                       onToggle={() => updateUserSettings({ waterAlerts: !(userSettings.waterAlerts ?? true) })}
                     />
                     <ToggleRow 
                       label="Protein Threshold Warning" 
                       description="Flashes an update if protein intake is critically low by evening"
                       active={userSettings.proteinAlerts ?? true}
                       onToggle={() => updateUserSettings({ proteinAlerts: !(userSettings.proteinAlerts ?? true) })}
                     />
                     <ToggleRow 
                       label="Focus Block Reminders" 
                       description="Tactile alerts when it is time to start a deep work tree block"
                       active={userSettings.focusAlerts ?? true}
                       onToggle={() => updateUserSettings({ focusAlerts: !(userSettings.focusAlerts ?? true) })}
                     />
                     <ToggleRow 
                       label="Streak Vulnerability Warnings" 
                       description="Alarms when coding, reading, or focus streaks are at risk of resetting"
                       active={userSettings.streakAlerts ?? true}
                       onToggle={() => updateUserSettings({ streakAlerts: !(userSettings.streakAlerts ?? true) })}
                     />
                     <ToggleRow 
                       label="LeetCode Daily Quest" 
                       description="Polite prompt to keep your algorithmic problem solving sharp"
                       active={userSettings.leetcodeAlerts ?? true}
                       onToggle={() => updateUserSettings({ leetcodeAlerts: !(userSettings.leetcodeAlerts ?? true) })}
                     />
                     <ToggleRow 
                       label="Active Workout Prompts" 
                       description="Tactful reminders when sedentary metrics exceed safe guidelines"
                       active={userSettings.workoutAlerts ?? true}
                       onToggle={() => updateUserSettings({ workoutAlerts: !(userSettings.workoutAlerts ?? true) })}
                     />
                  </div>
                </Section>

                <Section title="Restrictions Registry" icon={<Shield size={16} />} description="Enforce strict behavioral guidelines to maintain physical and cognitive discipline.">
                  <div className="space-y-4">
                    <p className="text-[11px] text-white/30 leading-relaxed font-medium">
                      Enabling restrictions populates the Contextual Pulse on your Dashboard with real-time feedback and high-priority alarms.
                    </p>
                    
                    {/* Calorie cap */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 gap-4">
                      <div>
                        <div className="text-sm font-bold text-white/80">🔴 Calorie Intake Cap</div>
                        <div className="text-[10px] text-white/20 mt-1">Restrict daily maximum calorie input</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <input 
                          type="number" 
                          value={userSettings.calorieCap ?? 2100}
                          onChange={e => updateUserSettings({ calorieCap: +e.target.value })}
                          className="input-glass w-24 px-3 py-1.5 text-xs text-center font-bold"
                        />
                        <span className="text-[10px] text-white/30 font-bold">kcal</span>
                        <div 
                          onClick={() => updateUserSettings({ calorieCapEnabled: !(userSettings.calorieCapEnabled ?? true) })}
                          className={`relative w-12 h-7 rounded-full cursor-pointer transition-all duration-300 ${(userSettings.calorieCapEnabled ?? true) ? 'bg-rose-500 shadow-lg shadow-rose-900/20' : 'bg-white/10'}`}
                        >
                          <div className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${(userSettings.calorieCapEnabled ?? true) ? 'translate-x-5' : ''}`} />
                        </div>
                      </div>
                    </div>

                    {/* Sugar cap */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 gap-4">
                      <div>
                        <div className="text-sm font-bold text-white/80">🍭 Daily Sugar Limit</div>
                        <div className="text-[10px] text-white/20 mt-1">Enforce sugar consumption restrictions</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <input 
                          type="number" 
                          value={userSettings.sugarCap ?? 25}
                          onChange={e => updateUserSettings({ sugarCap: +e.target.value })}
                          className="input-glass w-24 px-3 py-1.5 text-xs text-center font-bold"
                        />
                        <span className="text-[10px] text-white/30 font-bold">g</span>
                        <div 
                          onClick={() => updateUserSettings({ sugarCapEnabled: !(userSettings.sugarCapEnabled ?? true) })}
                          className={`relative w-12 h-7 rounded-full cursor-pointer transition-all duration-300 ${(userSettings.sugarCapEnabled ?? true) ? 'bg-rose-500 shadow-lg shadow-rose-900/20' : 'bg-white/10'}`}
                        >
                          <div className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${(userSettings.sugarCapEnabled ?? true) ? 'translate-x-5' : ''}`} />
                        </div>
                      </div>
                    </div>

                    {/* Caffeine cap */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 gap-4">
                      <div>
                        <div className="text-sm font-bold text-white/80">☕ Caffeine Intake Cap</div>
                        <div className="text-[10px] text-white/20 mt-1">Enforce safe daily caffeinated beverage limit</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <input 
                          type="number" 
                          value={userSettings.caffeineCap ?? 2}
                          onChange={e => updateUserSettings({ caffeineCap: +e.target.value })}
                          className="input-glass w-24 px-3 py-1.5 text-xs text-center font-bold"
                        />
                        <span className="text-[10px] text-white/30 font-bold">cups</span>
                        <div 
                          onClick={() => updateUserSettings({ caffeineCapEnabled: !(userSettings.caffeineCapEnabled ?? true) })}
                          className={`relative w-12 h-7 rounded-full cursor-pointer transition-all duration-300 ${(userSettings.caffeineCapEnabled ?? true) ? 'bg-rose-500 shadow-lg shadow-rose-900/20' : 'bg-white/10'}`}
                        >
                          <div className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${(userSettings.caffeineCapEnabled ?? true) ? 'translate-x-5' : ''}`} />
                        </div>
                      </div>
                    </div>

                    {/* Weekday junk cap */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 gap-4">
                      <div>
                        <div className="text-sm font-bold text-white/80">🚫 Weekday Junk Restrict</div>
                        <div className="text-[10px] text-white/20 mt-1">Strict behavioral guidelines against fast food on weekdays</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div 
                          onClick={() => updateUserSettings({ junkCapEnabled: !(userSettings.junkCapEnabled ?? true) })}
                          className={`relative w-12 h-7 rounded-full cursor-pointer transition-all duration-300 ${(userSettings.junkCapEnabled ?? true) ? 'bg-rose-500 shadow-lg shadow-rose-900/20' : 'bg-white/10'}`}
                        >
                          <div className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${(userSettings.junkCapEnabled ?? true) ? 'translate-x-5' : ''}`} />
                        </div>
                      </div>
                    </div>
                  </div>
                </Section>
              </div>
            )}

            {activeTab === 'labs' && (
              <div className="space-y-6">
                <Section title="Experimental Labs" icon={<Beaker size={16} />} description="Test emerging features before they are finalized.">
                   <div className="space-y-4">
                      <LabFeature 
                        title="AI Companion Prototype" 
                        desc="Neural-driven motivation mascot for focus sessions."
                        status="STABLE"
                      />
                      <LabFeature 
                        title="Holographic Backgrounds" 
                        desc="GPU-accelerated dynamic mesh patterns."
                        status="HEAVY"
                      />
                      <LabFeature 
                        title="Cloud Sync Alpha" 
                        desc="End-to-end encrypted multi-device relay."
                        status="DEV"
                      />
                   </div>
                </Section>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// --- Internal Components ---

function NavButton({ active, icon, label, badge, onClick }: { active: boolean, icon: React.ReactNode, label: string, badge?: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`group flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all relative overflow-hidden ${
        active 
          ? 'bg-white/[0.07] text-white shadow-[0_4px_20px_rgba(0,0,0,0.2)] border border-white/5' 
          : 'text-white/30 hover:bg-white/[0.03] hover:text-white/60'
      }`}
    >
      <span className={`${active ? 'text-violet-400' : 'group-hover:text-white/80'} transition-colors`}>{icon}</span>
      <span className="text-sm font-bold tracking-tight">{label}</span>
      {badge && (
        <span className="ml-auto text-[8px] font-black bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded-md border border-violet-500/20 tracking-tighter uppercase">
          {badge}
        </span>
      )}
      {active && (
        <motion.div 
          layoutId="nav-pill" 
          className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-violet-500 rounded-r-full"
        />
      )}
    </button>
  );
}

function Section({ title, icon, description, children }: { title: string, icon: React.ReactNode, description?: string, children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 px-1">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-white/[0.03] text-white/40">
            {icon}
          </div>
          <h3 className="text-sm font-black text-white uppercase tracking-widest">{title}</h3>
        </div>
        {description && <p className="text-[11px] text-white/20 font-medium leading-relaxed">{description}</p>}
      </div>
      <div className="glass-card p-6 border-white/[0.03] relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
          {icon}
        </div>
        {children}
      </div>
    </div>
  );
}

function ToggleRow({ label, description, active, onToggle }: { label: string, description: string, active: boolean, onToggle: () => void }) {
  return (
    <button 
      onClick={onToggle}
      className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all text-left"
    >
      <div className="max-w-[70%]">
        <div className="text-sm font-bold text-white/80">{label}</div>
        <div className="text-[10px] text-white/20 font-medium leading-tight mt-1">{description}</div>
      </div>
      <div className={`relative w-12 h-7 rounded-full transition-all duration-300 ${active ? 'bg-violet-600 shadow-lg shadow-violet-900/20' : 'bg-white/10'}`}>
        <div className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${active ? 'translate-x-5' : ''}`} />
      </div>
    </button>
  );
}

function KbdAction({ action, keys }: { action: string, keys: string[] }) {
  return (
    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.01] border border-white/[0.03]">
      <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{action}</span>
      <div className="flex gap-1.5">
        {keys.map(k => (
          <kbd key={k} className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black text-white/60 min-w-[28px] text-center shadow-inner">
            {k}
          </kbd>
        ))}
      </div>
    </div>
  );
}

function LabFeature({ title, desc, status }: { title: string, desc: string, status: 'STABLE' | 'HEAVY' | 'DEV' }) {
  const colors = {
    STABLE: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    HEAVY: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    DEV: 'text-violet-400 bg-violet-500/10 border-violet-500/20'
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.01] border border-white/[0.03] group hover:bg-white/[0.02] transition-all">
      <div className="flex flex-col gap-1">
        <div className="text-sm font-bold text-white/80">{title}</div>
        <p className="text-[10px] text-white/20 font-medium">{desc}</p>
      </div>
      <span className={`text-[8px] font-black px-2 py-1 rounded-md border tracking-tighter ${colors[status]}`}>
        {status}
      </span>
    </div>
  );
}
