// Improved BookReaderModal.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileUp,
  X,
  Trash2,
  Maximize2,
  Minimize2,
  BookOpen,
  Check,
  List,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from './Modal';
import { useAppStore } from '../store/useAppStore';
import { db } from '../lib/db';

interface BookReaderModalProps {
  open: boolean;
  onClose: () => void;
}

const FILE_ID = 'book-pdf';
const PAGE_KEY = 'reader:last-page';
const ZOOM_KEY = 'reader:zoom';
const SIDEBAR_KEY = 'reader:sidebar';
const MAX_FILE_SIZE = 50 * 1024 * 1024;

async function loadBookPdf() {
  return db.files.get(FILE_ID);
}

async function saveBookPdf(file: File) {
  return db.files.put({
    id: FILE_ID,
    data: file,
    name: file.name,
    type: file.type,
  });
}

async function deleteBookPdf() {
  return db.files.delete(FILE_ID);
}

const ChapterItem = React.memo(function ChapterItem({
  chapter,
  onToggle,
}: {
  chapter: any;
  onToggle: (id: number, completed: boolean) => void;
}) {
  return (
    <div
      className={`flex items-start gap-3 p-2.5 rounded-lg transition-colors ${
        chapter.completed ? 'bg-emerald-500/5' : 'hover:bg-white/5'
      }`}
    >
      <button
        onClick={() => onToggle(chapter.id, !chapter.completed)}
        className={`mt-0.5 w-5 h-5 rounded flex-shrink-0 border flex items-center justify-center transition-all ${
          chapter.completed
            ? 'bg-emerald-500 border-emerald-500'
            : 'border-white/20 hover:border-violet-400'
        }`}
      >
        {chapter.completed && <Check size={12} className="text-white" />}
      </button>

      <div className="flex-1 min-w-0">
        <div
          className={`text-xs font-semibold truncate ${
            chapter.completed ? 'text-white/40 line-through' : 'text-white/80'
          }`}
        >
          {String(chapter.number).padStart(2, '0')}. {chapter.title}
        </div>
      </div>
    </div>
  );
});

export default function BookReaderModal({ open, onClose }: BookReaderModalProps) {
  const { book, updateChapter } = useAppStore();

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(
    localStorage.getItem(SIDEBAR_KEY) !== 'false'
  );
  const [currentPage, setCurrentPage] = useState(
    Number(localStorage.getItem(PAGE_KEY) || 1)
  );
  const [zoom, setZoom] = useState(Number(localStorage.getItem(ZOOM_KEY) || 100));
  const urlRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const completedChapters = useMemo(
    () => book.chapters.filter((c: any) => c.completed).length,
    [book.chapters]
  );

  const progressPct = useMemo(() => {
    if (!book.chapters.length) return 0;
    return Math.round((completedChapters / book.chapters.length) * 100);
  }, [completedChapters, book.chapters.length]);

  const cleanupUrl = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  const iframeSrc = useMemo(() => {
    if (!pdfUrl) return '';
    return `${pdfUrl}#page=${currentPage}&zoom=${zoom}&toolbar=0&navpanes=0&view=FitH`;
  }, [pdfUrl, currentPage, zoom]);

  const loadPdf = useCallback(async () => {
    try {
      setLoading(true);
      cleanupUrl();

      const fileRecord = await loadBookPdf();
      if (!fileRecord?.data) {
        setPdfUrl(null);
        return;
      }

      const url = URL.createObjectURL(fileRecord.data);
      urlRef.current = url;
      setPdfUrl(url);
    } catch (error) {
      toast.error('Failed to load book file.');
    } finally {
      setLoading(false);
    }
  }, [cleanupUrl]);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if ((containerRef.current as any).webkitRequestFullscreen) {
          await (containerRef.current as any).webkitRequestFullscreen();
        } else if ((containerRef.current as any).msRequestFullscreen) {
          await (containerRef.current as any).msRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
      }
    } catch (err) {
      console.error('Failed to toggle fullscreen:', err);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      cleanupUrl();
      setPdfUrl(null);
      setIsFullscreen(false);
      return;
    }

    loadPdf();
  }, [open, loadPdf, cleanupUrl]);

  useEffect(() => {
    localStorage.setItem(PAGE_KEY, String(currentPage));
  }, [currentPage]);

  useEffect(() => {
    localStorage.setItem(ZOOM_KEY, String(zoom));
  }, [zoom]);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, String(showSidebar));
  }, [showSidebar]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          onClose();
        }
      }
      if (e.key === 'ArrowRight') setCurrentPage((p) => p + 1);
      if (e.key === 'ArrowLeft') setCurrentPage((p) => Math.max(1, p - 1));
      if (e.key.toLowerCase() === 'f') {
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose, toggleFullscreen]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are supported.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size must be under 50MB.');
      return;
    }

    try {
      setLoading(true);
      await saveBookPdf(file);
      toast.success('Book uploaded successfully.');
      await loadPdf();
    } catch {
      toast.error('Failed to save file.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    try {
      await deleteBookPdf();
      cleanupUrl();
      setPdfUrl(null);
      toast.success('Book removed.');
    } catch {
      toast.error('Failed to remove book.');
    }
  };

  const toggleChapter = (id: number, completed: boolean) => {
    updateChapter(id, {
      completed,
      status: completed ? 'completed' : 'not_started',
    });
  };

  if (!open) return null;

  const content = loading ? (
    <div className="flex-1 flex items-center justify-center text-white/50">Loading reader...</div>
  ) : pdfUrl ? (
    <div ref={containerRef} className="flex h-full w-full bg-[#0a0a0f] overflow-hidden">
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-r border-white/10 bg-[#12131c] overflow-hidden"
          >
            <div className="p-5 border-b border-white/5">
              <h2 className="font-bold text-white">{book.title}</h2>
              <p className="text-xs text-white/40">{book.author}</p>
              <div className="mt-4 h-2 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  className="h-full bg-gradient-to-r from-violet-500 to-emerald-400"
                />
              </div>
            </div>
            <div className="p-3 overflow-y-auto h-[calc(100%-120px)] space-y-1">
              {book.chapters.map((chapter: any) => (
                <ChapterItem key={chapter.id} chapter={chapter} onToggle={toggleChapter} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col">
        <div className="h-14 border-b border-white/10 bg-black/30 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSidebar((v) => !v)} className="btn-ghost p-2">
              <List size={16} />
            </button>
            <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} className="btn-ghost p-2">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => setCurrentPage((p) => p + 1)} className="btn-ghost p-2">
              <ChevronRight size={16} />
            </button>
            <button onClick={() => setZoom((z) => Math.max(50, z - 10))} className="btn-ghost p-2">
              <ZoomOut size={16} />
            </button>
            <button onClick={() => setZoom((z) => Math.min(200, z + 10))} className="btn-ghost p-2">
              <ZoomIn size={16} />
            </button>
            <button onClick={() => setZoom(100)} className="btn-ghost p-2">
              <RotateCcw size={16} />
            </button>
          </div>

          <div className="flex gap-2">
            <button onClick={toggleFullscreen} className="btn-ghost px-3 py-2">
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button onClick={handleRemove} className="btn-ghost px-3 py-2 text-red-400">
              <Trash2 size={16} />
            </button>
            <button onClick={onClose} className="btn-ghost px-3 py-2">
              <X size={16} />
            </button>
          </div>
        </div>

        <iframe src={iframeSrc} className="w-full flex-1 border-none bg-white" title="Book Reader" />
      </div>
    </div>
  ) : (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
      <FileUp size={32} className="text-violet-400 mb-4" />
      <h3 className="text-lg font-bold text-white">Upload your book</h3>
      <p className="text-sm text-white/40 mb-6">Your PDF stays local in your browser.</p>
      <label className="btn-glow px-6 py-3 cursor-pointer flex items-center gap-2">
        <BookOpen size={16} /> Choose PDF
        <input type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} />
      </label>
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title="Interactive Reader" maxWidth="max-w-7xl" showClose>
      <div className="h-[80vh]">{content}</div>
    </Modal>
  );
}
