import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { BookOpen, Check, Calendar, ChevronDown, ChevronUp, Edit3, X, Flame } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate, todayString } from '../lib/utils';
import Confetti from 'react-confetti';
import BookReaderModal from '../components/BookReaderModal';

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

  const completedChapters = book.chapters.filter(c => c.completed).length;
  const progressPct = Math.round((completedChapters / 51) * 100);
  const nextChapter = book.chapters.find(c => !c.completed);

  const handleToggleChapter = (chapterId: number, completed: boolean) => {
    updateChapter(chapterId, { completed, status: completed ? 'completed' : 'not_started' });
    if (completed) {
      toast.success(`Chapter completed! 🎉`, { icon: '📖' });
      if (completedChapters + 1 === 51) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 6000);
        toast.success('🏆 Book Complete! Incredible achievement!', { duration: 5000 });
      }
      // Milestone toasts
      const milestones = [10, 25, 40, 51];
      if (milestones.includes(completedChapters + 1)) {
        toast.success(`🌟 Milestone: ${completedChapters + 1} chapters done!`, { duration: 4000 });
      }
    }
  };

  const getDifficultyColor = (chapter: typeof book.chapters[0]) => {
    if (chapter.completed) return 'text-emerald-400';
    if (chapter.status === 'in_progress') return 'text-yellow-400';
    return 'text-white/30';
  };

  return (
    <div className="max-w-4xl space-y-6">
      {showConfetti && <Confetti recycle={false} numberOfPieces={300} />}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reading Tracker</h1>
          <p className="text-white/40 mt-1 text-sm">Track your journey through 51 chapters</p>
        </div>
        <div className="flex items-center gap-2">
          {readingStreak.currentStreak > 0 && (
            <div className="glass-card px-3 py-2 flex items-center gap-2">
              <Flame size={14} className="text-orange-400" />
              <span className="text-sm font-semibold text-orange-400">{readingStreak.currentStreak}d</span>
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
            onClick={() => setEditingBook(true)}
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
              <span className="text-sm text-white/60"><span className="font-bold text-violet-400">{completedChapters}</span> / 51 chapters</span>
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
                className="flex items-center gap-4 p-4 cursor-pointer"
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
                    <div className="px-4 pb-4 pt-0 border-t border-white/5">
                      <div className="flex items-center gap-3 mt-3">
                        <select
                          value={chapter.status}
                          onChange={e => updateChapter(chapter.id, { status: e.target.value as any })}
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
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Edit Book Modal */}
      <AnimatePresence>
        {editingBook && (
          <>
            <motion.div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingBook(false)} />
            <motion.div
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className="glass-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white">Edit Book Info</h3>
                  <button onClick={() => setEditingBook(false)} className="text-white/40 hover:text-white"><X size={16} /></button>
                </div>
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
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Embedded PDF Reader Modal */}
      <BookReaderModal open={showReader} onClose={() => setShowReader(false)} />
    </div>
  );
}
