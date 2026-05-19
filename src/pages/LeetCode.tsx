import React, { Suspense, lazy, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { useProblems, useAddProblem, useDeleteProblem, useToggleProblem } from '../hooks/useLeetCodeQuery';
import { 
  Plus, X, ExternalLink, Trash2, Check, Filter, Search, Flame, 
  ChevronDown, MessageSquare, AlertCircle, Loader2 
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import { LEETCODE_TOPICS } from '../lib/data';
import type { LeetCodeProblem, LeetCodeDifficulty, LeetCodeStatus } from '../types';
import { todayString, generateId } from '../lib/utils';
import { format } from 'date-fns';
import { showUndoToast } from '../components/UndoToast';
import { useMemo, useEffect, useCallback, useRef } from 'react';
import { useSoundFX } from '../hooks/useSoundFX';
import DeferredOnVisible from '../components/DeferredOnVisible';
import { LeetCodeSkeleton } from '../components/Skeletons';

const LeetCodeCharts = lazy(() => import('../components/leetcode/LeetCodeCharts'));

const DIFFICULTIES: LeetCodeDifficulty[] = ['Easy', 'Medium', 'Hard'];
const DIFF_COLORS: Record<LeetCodeDifficulty, string> = { Easy: '#34d399', Medium: '#fbbf24', Hard: '#f87171' };

export default function LeetCode() {
  const { codingStreak } = useAppStore();
  const { data: problems = [], isLoading } = useProblems();
  const addProblemMut = useAddProblem();
  const deleteProblemMut = useDeleteProblem();
  const toggleProblemMut = useToggleProblem();
  const { play } = useSoundFX();
  const [showForm, setShowForm] = useState(false);
  const [logMode, setLogMode] = useState<'single' | 'bulk'>('single');
  const [bulkNames, setBulkNames] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filterDiff, setFilterDiff] = useState<LeetCodeDifficulty | 'All'>('All');
  const [filterStatus, setFilterStatus] = useState<'All' | 'solved' | 'attempted' | 'todo'>('All');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    name: '', link: '', difficulty: 'Easy' as LeetCodeDifficulty,
    topic: 'Array', status: 'solved' as LeetCodeStatus, notes: '',
    date: todayString(), completed: true,
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 150);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'n' && !showForm && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setShowForm(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showForm]);

  // Stats
  const solved = useMemo(() => problems.filter(p => p.completed), [problems]);
  const easy = useMemo(() => solved.filter(p => p.difficulty === 'Easy').length, [solved]);
  const medium = useMemo(() => solved.filter(p => p.difficulty === 'Medium').length, [solved]);
  const hard = useMemo(() => solved.filter(p => p.difficulty === 'Hard').length, [solved]);

  const filtered = useMemo(() => {
    return problems.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.topic.toLowerCase().includes(search.toLowerCase());
      const matchDiff = filterDiff === 'All' || p.difficulty === filterDiff;
      const matchStatus = filterStatus === 'All' || p.status === filterStatus;
      return matchSearch && matchDiff && matchStatus;
    });
  }, [problems, search, filterDiff, filterStatus]);

  // Topic distribution
  const topicData = useMemo(() => LEETCODE_TOPICS
    .map(t => ({ topic: t, count: solved.filter(p => p.topic === t).length }))
    .filter(t => t.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8), [solved]);

  const diffData = useMemo(() => [
    { name: 'Easy', value: easy, color: DIFF_COLORS.Easy },
    { name: 'Medium', value: medium, color: DIFF_COLORS.Medium },
    { name: 'Hard', value: hard, color: DIFF_COLORS.Hard },
  ], [easy, medium, hard]);

  const solvedByDate = useMemo(() => {
    const counts: Record<string, number> = {};
    problems.forEach(p => {
      if (p.completed && p.date) {
        counts[p.date] = (counts[p.date] || 0) + 1;
      }
    });
    return counts;
  }, [problems]);

  const last14Days = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      const key = format(d, 'yyyy-MM-dd');
      const count = solvedByDate[key] || 0;
      return {
        date: key,
        displayDate: format(d, 'MMM d'),
        count
      };
    });
  }, [solvedByDate]);

  const handleAdd = () => {
    if (!form.name.trim()) { toast.error('Problem/Task name required'); return; }
    if (form.link && !form.link.startsWith('http://') && !form.link.startsWith('https://')) {
      toast.error('Please enter a valid URL (starting with http:// or https://)');
      return;
    }
    
    play('success');
    addProblemMut.mutate({ ...form, timeSpent: 0 });
    toast.success('Task logged! 💻');
    setForm({ name: '', link: '', difficulty: 'Easy', topic: 'Array', status: 'solved', notes: '', date: todayString(), completed: true });
    setShowForm(false);
  };

  const handleBulkAdd = () => {
    if (!bulkNames.trim()) { toast.error('At least one name required'); return; }
    if (form.link && !form.link.startsWith('http://') && !form.link.startsWith('https://')) {
      toast.error('Please enter a valid URL (starting with http:// or https://)');
      return;
    }

    const names = bulkNames
      .split('\n')
      .map(name => name.trim())
      .filter(name => name.length > 0);

    if (names.length === 0) {
      toast.error('Please enter at least one valid name');
      return;
    }

    play('success');
    
    // Mutate each problem sequentially
    names.forEach((name) => {
      addProblemMut.mutate({
        name,
        link: form.link,
        difficulty: form.difficulty,
        topic: form.topic,
        status: form.status,
        notes: form.notes,
        date: form.date,
        completed: form.completed,
        timeSpent: 0
      });
    });

    toast.success(`Successfully logged ${names.length} tasks! 💻`);
    setBulkNames('');
    setForm({ name: '', link: '', difficulty: 'Easy', topic: 'Array', status: 'solved', notes: '', date: todayString(), completed: true });
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    play('click');
    // Immediate state removal for UI snappiness
    deleteProblemMut.mutate(id);
    toast.success('Problem deleted');
    setTimeout(() => setDeletingId(null), 500);
  };

  if (isLoading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <LeetCodeSkeleton />
      </motion.div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white uppercase">LeetCode Forge</h1>
          <p className="text-white/40 text-xs md:text-sm mt-0.5">Daily problem solving log</p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          {codingStreak.currentStreak > 0 && (
            <div className="glass-card px-3 py-1.5 flex items-center gap-1.5">
              <Flame size={13} className="text-orange-400" />
              <span className="text-xs font-bold text-orange-400">{codingStreak.currentStreak}d streak</span>
            </div>
          )}
          <button onClick={() => { setForm(f => ({ ...f, date: todayString() })); setShowForm(true); }} className="btn-glow px-4 py-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
            <Plus size={14} /> Log Problem
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: 'Total Solved', value: solved.length, color: 'text-white' },
          { label: 'Easy', value: easy, color: 'text-emerald-400' },
          { label: 'Medium', value: medium, color: 'text-yellow-400' },
          { label: 'Hard', value: hard, color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="glass-card p-4 md:p-5 flex flex-col justify-between">
            <div className={`text-2xl md:text-3xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-[10px] md:text-xs text-white/40 uppercase tracking-widest font-bold mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Coding Consistency Matrix */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-white text-sm">Coding Consistency Matrix</h3>
            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-0.5">Solve momentum over the last 14 days</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-white/30">
            <span>Less</span>
            <span className="w-3 h-3 rounded bg-white/[0.02] border border-white/5" />
            <span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/30" />
            <span className="w-3 h-3 rounded bg-emerald-500/50 border border-emerald-500/50" />
            <span className="w-3 h-3 rounded bg-emerald-500/80" />
            <span>More</span>
          </div>
        </div>

        <div className="grid grid-cols-7 sm:grid-cols-14 gap-1.5 xs:gap-2 sm:gap-3">
          {last14Days.map((day) => (
            <motion.div
              key={day.date}
              whileHover={{ scale: 1.08, y: -2 }}
              className={`p-1.5 sm:p-3 rounded-xl flex flex-col items-center justify-between min-h-[50px] sm:min-h-[70px] transition-all relative group/cell cursor-pointer ${
                day.count === 0 ? 'bg-white/[0.02] border border-white/5 hover:bg-white/[0.04]' :
                day.count === 1 ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' :
                day.count === 2 ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300' :
                'bg-emerald-500/40 border border-emerald-500/60 text-emerald-100'
              }`}
            >
              <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-white/40">{day.displayDate}</span>
              <span className="text-sm sm:text-lg font-black">{day.count}</span>
              
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 rounded bg-[#0f101c] border border-white/10 text-[10px] text-white font-bold whitespace-nowrap opacity-0 pointer-events-none group-hover/cell:opacity-100 transition-opacity z-10 shadow-xl">
                {day.count} {day.count === 1 ? 'problem' : 'problems'} solved
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Charts Row */}
      <DeferredOnVisible
        minHeight={252}
        fallback={<div className="grid grid-cols-2 gap-4"><div className="glass-card p-5 h-[252px]" /><div className="glass-card p-5 h-[252px]" /></div>}
      >
        <Suspense fallback={<div className="grid grid-cols-2 gap-4"><div className="glass-card p-5 h-[252px]" /><div className="glass-card p-5 h-[252px]" /></div>}>
          <LeetCodeCharts solvedCount={solved.length} diffData={diffData} topicData={topicData} />
        </Suspense>
      </DeferredOnVisible>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            className="input-glass w-full pl-9 pr-3 py-2 text-xs md:text-sm"
            placeholder="Search problems or topics... (N for new)"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <select
            className="input-glass px-3 py-2 text-xs md:text-sm bg-transparent w-full sm:w-auto"
            value={filterDiff}
            onChange={e => setFilterDiff(e.target.value as any)}
          >
            <option className="bg-[#10111a] text-white" value="All">All Difficulties</option>
            {DIFFICULTIES.map(d => <option className="bg-[#10111a] text-white" key={d} value={d}>{d}</option>)}
          </select>
          <select
            className="input-glass px-3 py-2 text-xs md:text-sm bg-transparent w-full sm:w-auto"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as any)}
          >
            <option className="bg-[#10111a] text-white" value="All">All Status</option>
            <option className="bg-[#10111a] text-white" value="solved">Solved</option>
            <option className="bg-[#10111a] text-white" value="attempted">Attempted</option>
            <option className="bg-[#10111a] text-white" value="todo">Todo</option>
          </select>
        </div>
      </div>

      {/* Problem List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="text-4xl mb-3">💻</div>
            <div className="text-white/50 font-medium">No problems yet</div>
            <div className="text-sm text-white/30 mt-1">Log your first LeetCode problem!</div>
            <button onClick={() => setShowForm(true)} className="btn-glow px-4 py-2 text-sm mt-4">Log Problem</button>
          </div>
        ) : (
          filtered.map(problem => (
            <motion.div
              key={problem.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-4 flex items-center gap-4"
            >
              <button
                onClick={() => {
                  play(problem.completed ? 'click' : 'success');
                  toggleProblemMut.mutate({ id: problem.id, current: problem.completed, status: problem.status });
                }}
                className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  problem.completed ? 'bg-emerald-500 border-emerald-500' : 'border-white/20 hover:border-violet-400'
                }`}
              >
                {problem.completed && <Check size={13} className="text-white" />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-medium ${problem.completed ? 'line-through text-white/40' : 'text-white'}`}>
                    {problem.name}
                  </span>
                  <span className={`badge badge-${problem.difficulty.toLowerCase()}`}>{problem.difficulty}</span>
                  <span className="badge" style={{ background: 'rgba(139,92,246,0.1)', color: 'rgba(139,92,246,0.9)', border: '1px solid rgba(139,92,246,0.2)' }}>
                    {problem.topic}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <div className="text-[10px] text-white/30 uppercase font-bold tracking-widest">{problem.date}</div>
                  {problem.notes && (
                    <div className="flex items-center gap-1 text-[10px] text-violet-400/60 font-medium italic">
                      <MessageSquare size={10} /> Has notes
                    </div>
                  )}
                </div>
                {problem.notes && !problem.completed && (
                  <div className="mt-2 p-2 bg-white/5 rounded-lg text-xs text-white/40 border border-white/5 italic">
                    {problem.notes}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {problem.link && (
                  <a href={problem.link} target="_blank" rel="noopener noreferrer" className="p-2 text-white/30 hover:text-violet-400 transition-colors">
                    <ExternalLink size={14} />
                  </a>
                )}
                <button 
                  onClick={() => handleDelete(problem.id)} 
                  disabled={deletingId === problem.id}
                  className="p-2 text-white/20 hover:text-red-400 transition-colors disabled:opacity-50"
                >
                  {deletingId === problem.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Add Problem Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={logMode === 'single' ? "Log Problem / Task" : "Bulk Log Tasks"}>
        <div className="space-y-4">
          {/* Tab Navigation for Log Mode */}
          <div className="flex border-b border-white/5 pb-2 mb-2" role="tablist">
            <button
              onClick={() => setLogMode('single')}
              className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider text-center border-b-2 transition-all ${
                logMode === 'single'
                  ? 'border-violet-500 text-white'
                  : 'border-transparent text-white/40 hover:text-white/70'
              }`}
            >
              Single Problem / Task
            </button>
            <button
              onClick={() => setLogMode('bulk')}
              className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider text-center border-b-2 transition-all ${
                logMode === 'bulk'
                  ? 'border-violet-500 text-white'
                  : 'border-transparent text-white/40 hover:text-white/70'
              }`}
            >
              Bulk Logging
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {logMode === 'single' ? (
              <div className="col-span-2">
                <label className="text-xs text-white/40 mb-1 block">Problem / Task Name *</label>
                <input className="input-glass w-full px-3 py-2 text-sm" placeholder="Two Sum" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
            ) : (
              <div className="col-span-2">
                <label className="text-xs text-white/40 mb-1 block">Problem / Task Names (one per line) *</label>
                <textarea 
                  className="input-glass w-full px-3 py-2 text-sm min-h-[100px]" 
                  placeholder="Two Sum&#10;Three Sum&#10;System Design: Rate Limiter" 
                  value={bulkNames} 
                  onChange={e => setBulkNames(e.target.value)} 
                />
              </div>
            )}
            <div className="col-span-2">
              <label className="text-xs text-white/40 mb-1 block">Reference URL / Link</label>
              <input className="input-glass w-full px-3 py-2 text-sm" placeholder="https://leetcode.com/problems/... or any valid URL" value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Difficulty</label>
              <select className="input-glass w-full px-3 py-2 text-sm bg-transparent" value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value as LeetCodeDifficulty }))}>
                {DIFFICULTIES.map(d => <option className="bg-[#1e1e2e] text-white" key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Topic</label>
              <select className="input-glass w-full px-3 py-2 text-sm bg-transparent" value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}>
                {LEETCODE_TOPICS.map(t => <option className="bg-[#1e1e2e] text-white" key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Status</label>
              <select className="input-glass w-full px-3 py-2 text-sm bg-transparent" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as LeetCodeStatus, completed: e.target.value === 'solved' }))}>
                <option className="bg-[#1e1e2e] text-white" value="solved">Solved</option>
                <option className="bg-[#1e1e2e] text-white" value="attempted">Attempted</option>
                <option className="bg-[#1e1e2e] text-white" value="todo">Todo</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Date</label>
              <input type="date" className="input-glass w-full px-3 py-2 text-sm" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-white/40 mb-1 block">Notes & Key Learnings</label>
              <textarea 
                className="input-glass w-full px-3 py-2 text-sm min-h-[80px]" 
                placeholder="Key insights, patterns to remember..." 
                value={form.notes} 
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} 
              />
            </div>
          </div>

          <button onClick={logMode === 'single' ? handleAdd : handleBulkAdd} className="btn-glow w-full py-2.5 mt-2 text-sm font-bold">
            {logMode === 'single' ? 'Add Problem' : 'Log Bulk Problems'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
