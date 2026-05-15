import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { BookOpen, Check, Calendar, ChevronDown, ChevronUp, Edit3, X, Flame } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate, todayString } from '../lib/utils';
import Confetti from 'react-confetti';
import BookReaderModal from '../components/BookReaderModal';
import Modal from '../components/Modal';

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

export default function Reading() {
  const { book, updateChapter, setBookMeta, readingStreak } = useAppStore();
  const [editingBook, setEditingBook] = useState(false);
  const [bookTitle, setBookTitle] = useState(book.title);
  const [bookAuthor, setBookAuthor] = useState(book.author);
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showReader, setShowReader] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  // Sync window size for confetti
  useEffect(() => {
    const updateSize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Sync edit form state
  const handleOpenEdit = useCallback(() => {
    setBookTitle(book.title);
    setBookAuthor(book.author);
    setEditingBook(true);
  }, [book.title, book.author]);

  // Derived Stats
  const completedChapters = useMemo(() => book.chapters.filter(c => c.completed).length, [book.chapters]);
  const totalChapters = useMemo(() => book.chapters.length || 1, [book.chapters]);
  const progressPct = useMemo(() => Math.round((completedChapters / totalChapters) * 100), [completedChapters, totalChapters]);
  const nextChapter = useMemo(() => book.chapters.find(c => !c.completed), [book.chapters]);

  // Milestone logic via effect to ensure state is settled
  useEffect(() => {
    if (completedChapters > 0) {
      const milestones = [10, 25, 40, totalChapters];
      if (milestones.includes(completedChapters)) {
        if (completedChapters === totalChapters) {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 6000);
          toast.success('🏆 Book Complete! Incredible achievement!', { duration: 5000 });
        } else {
          toast.success(`🌟 Milestone: ${completedChapters} chapters done!`, { duration: 4000 });
        }
      }
    }
  }, [completedChapters, totalChapters]);

  const handleToggleChapter = (chapterId: number, completed: boolean) => {
    updateChapter(chapterId, { completed, status: completed ? 'completed' : 'not_started' });
    if (completed) {
      toast.success(`Chapter completed! 🎉`, { icon: '📖' });
    }
  };

  const isTodayDone = !!readingStreak.history[todayString()];

  return (
    <div className="max-w-4xl space-y-6">
      {showConfetti && <Confetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={300} />}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reading Tracker</h1>
          <p className="text-white/40 mt-1 text-sm">Track your journey through {totalChapters} chapters</p>
        </div>
        <div className="flex items-center gap-2">
          {readingStreak.currentStreak > 0 && (
            <div className={`glass-card px-3 py-2 flex items-center gap-2 border ${isTodayDone ? 'border-orange-500/30' : 'border-white/5 opacity-60'}`}>
              <Flame size={14} className={isTodayDone ? 'text-orange-400' : 'text-white/20'} />
              <span className={`text-sm font-semibold ${isTodayDone ? 'text-orange-400' : 'text-white/20'}`}>{readingStreak.currentStreak}d</span>
              {isTodayDone && <div className="w-1 h-1 rounded-full bg-orange-400 animate-pulse" />}
            </div>
          )}
          <button
            onClick={() => setShowReader(true)}
            className="btn-glow px-4 py-2 flex items-center gap-2 text-sm font-semibold"
          >
            <BookOpen size={14} />
            Read Book
          </button>
          <button
            onClick={handleOpenEdit}
            className="btn-ghost px-3 py-2 flex items-center gap-2 text-sm"
          >
            <Edit3 size={14} />
            Edit Info
          </button>
        </div>
      </div>

      {/* Book Info + Progress */}
      <div className="glass-card p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 to-transparent" />
        <div className="relative flex items-center gap-6">
          {/* Book cover */}
          <div
            className="w-16 h-20 rounded-lg shadow-lg flex-shrink-0 flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${book.coverColor}, ${book.coverColor}88)` }}
          >
            <BookOpen size={24} className="text-white/80" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white">{book.title}</h2>
            <p className="text-white/40 text-sm mb-3">{book.author}</p>
            <div className="flex items-center gap-4 mb-2">
              <span className="text-sm text-white/60"><span className="font-bold text-violet-400">{completedChapters}</span> / {totalChapters} chapters</span>
              <span className="text-sm font-bold text-gradient">{progressPct}%</span>
            </div>
            <div className="progress-bar">
              <motion.div
                className="progress-fill"
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
              />
            </div>
          </div>
          {/* Radial progress */}
          <div className="flex-shrink-0 relative w-20 h-20">
            <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
              <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
              <motion.circle
                cx="40" cy="40" r="32" fill="none"
                stroke="url(#progressGrad)" strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 32}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 32 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 32 * (1 - progressPct / 100) }}
                transition={{ duration: 1.5, ease: 'easeOut', delay: 0.5 }}
              />
              <defs>
                <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-white">{progressPct}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chapter List */}
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white">Chapters</h3>
          <div className="flex items-center gap-3 text-xs text-white/30">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Completed</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> In Progress</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-white/20 inline-block" /> Not Started</span>
          </div>
        </div>

        {book.chapters.map((chapter) => (
          <motion.div key={chapter.id} variants={item}>
            <div
              className={`glass-card transition-all duration-200 ${
                chapter.completed ? 'border-emerald-500/20 bg-emerald-500/5' : ''
              } ${nextChapter?.id === chapter.id ? 'border-violet-500/30 shadow-glow-sm' : ''}`}
            >
            <div
              role="button"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setExpandedChapter(expandedChapter === chapter.id ? null : chapter.id);
                }
              }}
              className="flex items-center gap-4 p-4 cursor-pointer outline-none"
              onClick={() => setExpandedChapter(expandedChapter === chapter.id ? null : chapter.id)}
            >
                {/* Checkbox */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleChapter(chapter.id, !chapter.completed);
                  }}
                  className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                    chapter.completed
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'border-white/20 hover:border-violet-400'
                  }`}
                >
                  {chapter.completed && <Check size={14} className="text-white" />}
                </button>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/30 font-mono w-6">
                      {chapter.number.toString().padStart(2, '0')}
                    </span>
                    <span className={`text-sm font-medium ${chapter.completed ? 'text-white/50 line-through' : 'text-white'}`}>
                      {chapter.title}
                    </span>
                    {nextChapter?.id === chapter.id && (
                      <span className="badge text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/30">
                        Next
                      </span>
                    )}
                  </div>
                  {chapter.dateCompleted && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-white/30">
                      <Calendar size={10} />
                      <span>{formatDate(chapter.dateCompleted)}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {expandedChapter === chapter.id
                    ? <ChevronUp size={14} className="text-white/30" />
                    : <ChevronDown size={14} className="text-white/30" />}
                </div>
              </div>

              {/* Expanded section */}
              <AnimatePresence>
                {expandedChapter === chapter.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-0 border-t border-white/5 space-y-4">
                      <div className="flex items-center gap-3 mt-4">
                        <select
                          value={chapter.status}
                          onChange={e => {
                            const status = e.target.value as any;
                            updateChapter(chapter.id, { status, completed: status === 'completed' });
                          }}
                          className="input-glass text-sm px-3 py-1.5"
                        >
                          <option value="not_started">Not Started</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>
                        <button
                          onClick={() => handleToggleChapter(chapter.id, !chapter.completed)}
                          className={`btn-glow px-4 py-1.5 text-sm ${chapter.completed ? 'opacity-50' : ''}`}
                        >
                          {chapter.completed ? '✓ Completed' : 'Mark Done'}
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] text-white/20 uppercase font-bold tracking-widest">Key Takeaways & Highlights</label>
                        <textarea 
                          className="input-glass w-full px-3 py-2 text-sm min-h-[80px] resize-none"
                          placeholder="What did you learn from this chapter?"
                          value={chapter.notes || ''}
                          onChange={e => updateChapter(chapter.id, { notes: e.target.value })}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Edit Book Modal */}
      <Modal open={editingBook} onClose={() => setEditingBook(false)} title="Edit Book Info">
        <div className="space-y-4">
          <input className="input-glass w-full px-3 py-2 text-sm" placeholder="Book title" value={bookTitle} onChange={e => setBookTitle(e.target.value)} />
          <input className="input-glass w-full px-3 py-2 text-sm" placeholder="Author" value={bookAuthor} onChange={e => setBookAuthor(e.target.value)} />
          <div>
            <label className="text-xs text-white/40 mb-2 block">Cover Color</label>
            <div className="flex gap-2">
              {['#7c3aed', '#0891b2', '#059669', '#dc2626', '#d97706', '#db2777'].map(c => (
                <button
                  key={c}
                  onClick={() => setBookMeta({ coverColor: c })}
                  className={`w-8 h-8 rounded-lg border-2 transition-all ${book.coverColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setBookMeta({ title: bookTitle, author: bookAuthor });
                setEditingBook(false);
                toast.success('Book updated!');
              }}
              className="btn-glow flex-1 py-2 text-sm"
            >
              Save Changes
            </button>
            <button onClick={() => setEditingBook(false)} className="btn-ghost px-4 py-2 text-sm">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Embedded PDF Reader Modal */}
      <BookReaderModal open={showReader} onClose={() => setShowReader(false)} />
    </div>
  );
}
