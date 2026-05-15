import React, { useState, useMemo } from 'react';
import { 
  Plus, Search, ExternalLink, Pin, PinOff, 
  Trash2, MoreVertical, LayoutGrid, Play, 
  MessageSquare, Code2, Globe, Command,
  Sparkles, Wrench, Briefcase, BookOpen, 
  Smartphone, CreditCard, ShoppingCart, 
  ChevronDown, Filter, List, Layout
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import type { AppLink, AppCategory, IconType } from '../types/launcher';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from './Modal';

const CATEGORIES: { value: AppCategory; label: string; icon: any; color: string }[] = [
  { value: 'productivity', label: 'Productivity', icon: Sparkles, color: '#8b5cf6' },
  { value: 'development', label: 'Development', icon: Code2, color: '#06b6d4' },
  { value: 'learning', label: 'Learning', icon: BookOpen, color: '#10b981' },
  { value: 'communication', label: 'Communication', icon: MessageSquare, color: '#ec4899' },
  { value: 'entertainment', label: 'Entertainment', icon: Play, color: '#ef4444' },
  { value: 'utilities', label: 'Utilities', icon: Wrench, color: '#6b7280' },
  { value: 'finance', label: 'Finance', icon: CreditCard, color: '#f59e0b' },
  { value: 'shopping', label: 'Shopping', icon: ShoppingCart, color: '#f43f5e' },
  { value: 'other', label: 'Other', icon: Globe, color: '#94a3b8' },
];

const LUCIDE_ICONS: Record<string, any> = {
  LayoutGrid, Play, MessageSquare, Code2, Globe, Command, 
  Sparkles, Briefcase, BookOpen, Smartphone, CreditCard, ShoppingCart, Wrench
};

export default function QuickLauncher() {
  const { launcher, recordAppVisit, toggleAppPin, deleteAppLink, addAppLink, updateLauncher } = useAppStore();
  const { appLinks, searchQuery, selectedCategory, layoutMode, showPinnedOnly } = launcher;
  
  const [isAdding, setIsAdding] = useState(false);

  const [form, setForm] = useState<Omit<AppLink, 'id' | 'visitCount' | 'isPinned' | 'createdAt' | 'updatedAt'>>({
    name: '',
    url: '',
    description: '',
    iconType: 'lucide',
    iconValue: 'Globe',
    category: 'other',
    color: '#8b5cf6',
    openMode: 'new-tab'
  });

  const filteredLinks = useMemo(() => {
    let links = [...appLinks];
    
    if (searchQuery) {
      const s = searchQuery.toLowerCase();
      links = links.filter(l => 
        l.name.toLowerCase().includes(s) || 
        l.url.toLowerCase().includes(s) ||
        l.description?.toLowerCase().includes(s) ||
        l.tags?.some(t => t.toLowerCase().includes(s))
      );
    }

    if (selectedCategory) {
      links = links.filter(l => l.category === selectedCategory);
    }

    if (showPinnedOnly) {
      links = links.filter(l => l.isPinned);
    }

    // Sort: Pinned first, then by visitCount descending
    return links.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      if (a.sortOrder !== undefined && b.sortOrder !== undefined) return a.sortOrder - b.sortOrder;
      return (b.visitCount || 0) - (a.visitCount || 0);
    });
  }, [appLinks, searchQuery, selectedCategory, showPinnedOnly]);

  const handleOpen = (link: AppLink) => {
    recordAppVisit(link.id);
    if (link.openMode === 'same-tab') {
      window.location.href = link.url;
    } else {
      window.open(link.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.url) return;
    
    // URL Validation
    let url = form.url.trim();
    if (!url.match(/^https?:\/\//)) {
      url = 'https://' + url;
    }
    
    try {
      new URL(url);
    } catch {
      alert("Invalid URL format");
      return;
    }
    
    addAppLink({ ...form, url });
    setIsAdding(false);
    setForm({
      name: '', url: '', description: '',
      iconType: 'lucide', iconValue: 'Globe',
      category: 'other', color: '#8b5cf6', openMode: 'new-tab'
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header & Main Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-400 shadow-inner">
            <Command size={20} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">Launcher</h2>
            <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{appLinks.length} APPS INDEXED</div>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => updateLauncher({ layoutMode: layoutMode === 'grid' ? 'list' : 'grid' })}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 transition-all"
            title="Toggle Layout"
          >
            {layoutMode === 'grid' ? <List size={18} /> : <Layout size={18} />}
          </button>
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all shadow-lg shadow-violet-900/20"
          >
            <Plus size={16} />
            ADD APP
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
          <input 
            type="text"
            placeholder="Search commands, apps, or tags... (Alt+K)"
            value={searchQuery}
            onChange={(e) => updateLauncher({ searchQuery: e.target.value })}
            className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/30 transition-all shadow-inner"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button 
            onClick={() => updateLauncher({ selectedCategory: undefined })}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${!selectedCategory ? 'bg-white/10 text-white border border-white/10' : 'text-white/30 hover:text-white/50'}`}
          >
            ALL
          </button>
          {CATEGORIES.map(c => (
            <button 
              key={c.value}
              onClick={() => updateLauncher({ selectedCategory: c.value })}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedCategory === c.value ? 'bg-white/10 text-white border border-white/10' : 'text-white/30 hover:text-white/50'}`}
            >
              <c.icon size={12} style={{ color: c.color }} />
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Apps Grid/List */}
      <div className={layoutMode === 'grid' ? "grid grid-cols-4 gap-4" : "flex flex-col gap-2"}>
        <AnimatePresence mode="popLayout">
          {filteredLinks.map((link) => (
            <AppItem 
              key={link.id} 
              link={link} 
              layout={layoutMode} 
              onOpen={() => handleOpen(link)} 
            />
          ))}
        </AnimatePresence>
      </div>

      {filteredLinks.length === 0 && (
        <div className="text-center py-12 glass-card border-dashed">
          <Globe className="mx-auto text-white/10 mb-4" size={40} />
          <div className="text-sm font-bold text-white/30 uppercase tracking-widest">No apps found matching your search</div>
        </div>
      )}

      {/* Add Modal */}
      <Modal 
        open={isAdding} 
        onClose={() => setIsAdding(false)}
        title="Index New Application"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1.5 block">Display Name</label>
              <input 
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. GitHub"
                className="input-glass w-full py-2.5 px-4"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1.5 block">Category</label>
              <select 
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as AppCategory })}
                className="input-glass w-full py-2.5 px-4 appearance-none"
              >
                {CATEGORIES.map(c => <option key={c.value} value={c.value} className="bg-slate-900">{c.label}</option>)}
              </select>
            </div>
          </div>
          
          <div>
            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1.5 block">Destination URL</label>
            <input 
              type="text"
              required
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://github.com"
              className="input-glass w-full py-2.5 px-4"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1.5 block">Icon Mode</label>
              <select 
                value={form.iconType}
                onChange={(e) => setForm({ ...form, iconType: e.target.value as IconType })}
                className="input-glass w-full py-2.5 px-4 appearance-none"
              >
                <option value="lucide" className="bg-slate-900">Lucide Icon</option>
                <option value="emoji" className="bg-slate-900">Emoji</option>
                <option value="favicon" className="bg-slate-900">Auto Favicon</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1.5 block">Accent Color</label>
              <input 
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-1 py-1 cursor-pointer"
              />
            </div>
          </div>
          
          <div className="flex gap-3 pt-4">
            <button 
              type="button"
              onClick={() => setIsAdding(false)}
              className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-widest transition-colors"
            >
              Discard
            </button>
            <button 
              type="submit"
              className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs uppercase tracking-widest transition-colors shadow-lg shadow-violet-900/20"
            >
              Index App
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function AppItem({ link, layout, onOpen }: { link: AppLink; layout: 'grid' | 'list' | 'compact'; onOpen: () => void }) {
  const { toggleAppPin, deleteAppLink } = useAppStore();
  
  const Icon = useMemo(() => {
    if (link.iconType === 'lucide') return LUCIDE_ICONS[link.iconValue] || Globe;
    return null;
  }, [link]);

  if (layout === 'list') {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="group flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all cursor-pointer"
        onClick={onOpen}
      >
        <div className="flex items-center gap-4">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner"
            style={{ backgroundColor: `${link.color}20`, color: link.color }}
          >
            {link.iconType === 'emoji' ? <span className="text-xl">{link.iconValue}</span> : <Icon size={20} />}
          </div>
          <div>
            <div className="text-sm font-bold text-white">{link.name}</div>
            <div className="text-[10px] text-white/20 font-medium truncate max-w-[200px]">{link.url}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
           <button 
            onClick={(e) => { e.stopPropagation(); toggleAppPin(link.id); }}
            className={`p-2 rounded-lg bg-black/20 border border-white/5 hover:text-white transition-colors ${link.isPinned ? 'text-violet-400' : 'text-white/20'}`}
          >
            {link.isPinned ? <PinOff size={14} /> : <Pin size={14} />}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); deleteAppLink(link.id); }}
            className="p-2 rounded-lg bg-black/20 border border-white/5 text-white/20 hover:text-red-500 hover:bg-red-500/10 transition-all"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="group relative"
    >
      <button
        onClick={onOpen}
        className="w-full aspect-square glass-card flex flex-col items-center justify-center gap-3 group-hover:border-white/20 transition-all duration-300 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${link.color}10 0%, transparent 100%)` }}
      >
        <div 
          className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-500 group-hover:scale-110 shadow-lg"
          style={{ backgroundColor: `${link.color}20`, color: link.color }}
        >
          {link.iconType === 'emoji' ? <span className="text-2xl">{link.iconValue}</span> : <Icon size={24} />}
        </div>
        <div className="flex flex-col items-center">
          <span className="text-xs font-black text-white/70 group-hover:text-white transition-colors">
            {link.name}
          </span>
          <span className="text-[8px] font-black text-white/10 uppercase tracking-widest mt-0.5">
            {link.visitCount || 0} VISITS
          </span>
        </div>

        {link.isPinned && (
          <div className="absolute top-2 right-2 text-violet-400 opacity-60">
            <Pin size={10} fill="currentColor" />
          </div>
        )}
      </button>

      {/* Hover Actions */}
      <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 flex gap-1 z-10 transition-all scale-75 group-hover:scale-100">
        <button 
          onClick={(e) => { e.stopPropagation(); toggleAppPin(link.id); }}
          className="p-1.5 rounded-lg bg-slate-900 border border-white/10 text-white/40 hover:text-white shadow-xl"
        >
          {link.isPinned ? <PinOff size={12} /> : <Pin size={12} />}
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); deleteAppLink(link.id); }}
          className="p-1.5 rounded-lg bg-slate-900 border border-white/10 text-red-500/40 hover:text-red-500 shadow-xl"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </motion.div>
  );
}
