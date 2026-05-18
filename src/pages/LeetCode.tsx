import React, { useState } from 'react';
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
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { showUndoToast } from '../components/UndoToast';
import { useMemo, useEffect, useCallback, useRef } from 'react';
import { useSoundFX } from '../hooks/useSoundFX';

const DIFFICULTIES: LeetCodeDifficulty[] = ['Easy', 'Medium', 'Hard'];
const DIFF_COLORS: Record<LeetCodeDifficulty, string> = { Easy: '#34d399', Medium: '#fbbf24', Hard: '#f87171' };

export default function LeetCode() {
  const { codingStreak } = useAppStore();
  const { data: problems = [] } = useProblems();
  const addProblemMut = useAddProblem();
  const deleteProblemMut = useDeleteProblem();
  const toggleProblemMut = useToggleProblem();
  const { play } = useSoundFX();
  const [showForm, setShowForm] = useState(false);
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
    if (!form.name.trim()) { toast.error('Problem name required'); return; }
    if (form.link && !form.link.startsWith('https://leetcode.com')) {
      toast.error('Please enter a valid LeetCode URL');
      return;
    }
    
    play('success');
    addProblemMut.mutate({ ...form, timeSpent: 0 });
    toast.success('Problem logged! 💻');
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

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">LeetCode Tracker</h1>
          <p className="text-white/40 mt-1 text-sm">Daily problem solving log</p>
        </div>
        <div className="flex items-center gap-2">
          {codingStreak.currentStreak > 0 && (
            <div className="glass-card px-3 py-2 flex items-center gap-2">
              <Flame size={14} className="text-orange-400" />
              <span className="text-sm font-semibold text-orange-400">{codingStreak.currentStreak}d streak</span>
            </div>
          )}
          <button onClick={() => { setForm(f => ({ ...f, date: todayString() })); setShowForm(true); }} className="btn-glow px-4 py-2 flex items-center gap-2 text-sm">
            <Plus size={16} /> Log Problem
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Solved', value: solved.length, color: 'text-white' },
          { label: 'Easy', value: easy, color: 'text-emerald-400' },
          { label: 'Medium', value: medium, color: 'text-yellow-400' },
          { label: 'Hard', value: hard, color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="glass-card p-5">
            <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs text-white/40 mt-1">{s.label}</div>
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

        <div className="grid grid-cols-7 sm:grid-cols-14 gap-3">
          {last14Days.map((day) => (
            <motion.div
              key={day.date}
              whileHover={{ scale: 1.08, y: -2 }}
              className={`p-3 rounded-xl flex flex-col items-center justify-between min-h-[70px] transition-all relative group/cell cursor-pointer ${
                day.count === 0 ? 'bg-white/[0.02] border border-white/5 hover:bg-white/[0.04]' :
                day.count === 1 ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' :
                day.count === 2 ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300' :
                'bg-emerald-500/40 border border-emerald-500/60 text-emerald-100'
              }`}
            >
              <span className="text-[9px] font-black uppercase tracking-wider text-white/40">{day.displayDate}</span>
              <span className="text-lg font-black">{day.count}</span>
              
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 rounded bg-[#0f101c] border border-white/10 text-[10px] text-white font-bold whitespace-nowrap opacity-0 pointer-events-none group-hover/cell:opacity-100 transition-opacity z-10 shadow-xl">
                {day.count} {day.count === 1 ? 'problem' : 'problems'} solved
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Difficulty pie */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-white mb-4">Difficulty Breakdown</h3>
          {solved.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-white/30 text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={160} minWidth={0}>
              <PieChart>
                <Pie data={diffData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={3}>
                  {diffData.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'rgba(15,16,28,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'white', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="flex justify-center gap-4 mt-2">
            {diffData.map(d => (
              <div key={d.name} className={`flex items-center gap-1.5 text-xs transition-opacity ${d.value === 0 ? 'opacity-25' : 'opacity-100'}`}>
                <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                <span className="text-white/50">{d.name}: {d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Topic bar chart */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-white mb-4">Top Topics</h3>
          {topicData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-white/30 text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={160} minWidth={0}>
              <BarChart data={topicData} margin={{ top: 0, right: 0, bottom: 20, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="topic" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} angle={-35} textAnchor="end" axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'rgba(15,16,28,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'white', fontSize: 12 }} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            className="input-glass w-full pl-9 pr-3 py-2 text-sm"
            placeholder="Search problems or topics... (N for new)"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
        </div>
        <select
          className="input-glass px-3 py-2 text-sm"
          value={filterDiff}
          onChange={e => setFilterDiff(e.target.value as any)}
        >
          <option value="All">All Difficulties</option>
          {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select
          className="input-glass px-3 py-2 text-sm"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as any)}
        >
          <option value="All">All Status</option>
          <option value="solved">Solved</option>
          <option value="attempted">Attempted</option>
          <option value="todo">Todo</option>
        </select>
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
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Log Problem">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-white/40 mb-1 block">Problem Name *</label>
              <input className="input-glass w-full px-3 py-2 text-sm" placeholder="Two Sum" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-white/40 mb-1 block">LeetCode Link</label>
              <input className="input-glass w-full px-3 py-2 text-sm" placeholder="https://leetcode.com/problems/..." value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))} />
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

          <button onClick={handleAdd} className="btn-glow w-full py-2.5 mt-2 text-sm font-bold">
            Add Problem
          </button>
        </div>
      </Modal>
    </div>
  );
}
