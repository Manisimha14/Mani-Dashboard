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
import { useBook, useUpdateChapter } from '../hooks/useBookQuery';

export interface Chapter {
  id: number;
  number: number;
  title: string;
  completed: boolean;
  status: 'completed' | 'not_started' | 'in_progress';
  dateCompleted?: string;
}

interface BookReaderModalProps {
  open: boolean;
  onClose: () => void;
}

const FILE_ID = 'book-pdf';
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

/**
 * Direct binary metadata reader that extracts the main /Count value from a raw PDF stream.
 */
function parsePdfPageCount(arrayBuffer: ArrayBuffer): number {
  try {
    const decoder = new TextDecoder('latin1');
    const view = new Uint8Array(arrayBuffer);
    const limit = Math.min(view.length, 1024 * 500); // scan first 500KB
    const chunk = decoder.decode(view.subarray(0, limit));
    
    const matches = [...chunk.matchAll(/\/Count\s+(\d+)/g)];
    if (matches.length > 0) {
      const counts = matches.map(m => parseInt(m[1], 10)).filter(c => c > 0);
      if (counts.length > 0) {
        return Math.max(...counts);
      }
    }
  } catch (e) {
    console.warn('Metadata scan failed to extract PDF page count:', e);
  }
  return 1000; // safe high fallback bounds
}

const ChapterItem = React.memo(function ChapterItem({
  chapter,
  onToggle,
}: {
  chapter: Chapter;
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
  const localStore = useAppStore();
  const { data: book = localStore.book } = useBook();
  const { mutate: updateChapterMut } = useUpdateChapter();

  const bookId = book?.id || 'default';

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [totalPages, setTotalPages] = useState<number>(1000);
  const urlRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const completedChapters = useMemo(
    () => book.chapters.filter((c: Chapter) => c.completed).length,
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

  const loadPdf = useCallback(async (activeRef: { active: boolean }) => {
    try {
      setLoading(true);
      cleanupUrl();

      const fileRecord = await loadBookPdf();
      if (!activeRef.active) return;
      if (!fileRecord?.data) {
        setPdfUrl(null);
        return;
      }

      // Read page count
      try {
        const buffer = await fileRecord.data.arrayBuffer();
        if (activeRef.active) {
          const count = parsePdfPageCount(buffer);
          setTotalPages(count);
        }
      } catch (err) {
        console.error('Failed to parse PDF metadata:', err);
      }

      const url = URL.createObjectURL(fileRecord.data);
      urlRef.current = url;
      if (activeRef.active) {
        setPdfUrl(url);
      }
    } catch {
      toast.error('Failed to load book file.');
    } finally {
      if (activeRef.active) {
        setLoading(false);
      }
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

  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage((p) => {
      const clamped = Math.max(1, Math.min(newPage, totalPages));
      if (bookId) {
        localStorage.setItem(`reader:last-page:${bookId}`, String(clamped));
      }
      return clamped;
    });
  }, [bookId, totalPages]);

  const handleZoomChange = useCallback((newZoom: number) => {
    setZoom((z) => {
      const nextZoom = Math.max(50, Math.min(newZoom, 200));
      if (bookId) {
        localStorage.setItem(`reader:zoom:${bookId}`, String(nextZoom));
      }
      return nextZoom;
    });
  }, [bookId]);

  const handleSidebarChange = useCallback((visible: boolean) => {
    setShowSidebar(visible);
    if (bookId) {
      localStorage.setItem(`reader:sidebar:${bookId}`, String(visible));
    }
  }, [bookId]);

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

  // Sync state cleanly per book
  useEffect(() => {
    if (open && bookId) {
      const lastPage = Number(localStorage.getItem(`reader:last-page:${bookId}`) || 1);
      const lastZoom = Number(localStorage.getItem(`reader:zoom:${bookId}`) || 100);
      const lastSidebar = localStorage.getItem(`reader:sidebar:${bookId}`) !== 'false';
      setCurrentPage(lastPage);
      setZoom(lastZoom);
      setShowSidebar(lastSidebar);
    }
  }, [open, bookId]);

  // Handle load & cancellation guard
  useEffect(() => {
    const activeRef = { active: true };

    if (!open) {
      cleanupUrl();
      setPdfUrl(null);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
      return;
    }

    loadPdf(activeRef);

    return () => {
      activeRef.active = false;
    };
  }, [open, loadPdf, cleanupUrl]);

  // Safe keyboard event listener with input focus guards
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return;

      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          onClose();
        }
      }
      if (e.key === 'ArrowRight') handlePageChange(currentPage + 1);
      if (e.key === 'ArrowLeft') handlePageChange(currentPage - 1);
      if (e.key.toLowerCase() === 'f') {
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose, toggleFullscreen, currentPage, handlePageChange]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are supported.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size must be under 50MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      setLoading(true);
      await saveBookPdf(file);
      toast.success('Book uploaded successfully.');
      const activeRef = { active: true };
      await loadPdf(activeRef);
    } catch (err: any) {
      if (err.name === 'QuotaExceededError' || err.message?.includes('quota')) {
        toast.error('Browser storage limit exceeded. Please free up some disk space.');
      } else {
        toast.error('Failed to save file.');
      }
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
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
    // Optimistic UI updates
    const currentBookChapters = book.chapters;
    updateChapterMut({
      chapterId: id,
      updates: {
        completed,
        status: completed ? 'completed' : 'not_started',
      },
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
            className="border-r border-white/10 bg-[#12131c] overflow-hidden flex flex-col"
          >
            <div className="p-5 border-b border-white/5 flex-shrink-0">
              <h2 className="font-bold text-white truncate">{book.title}</h2>
              <p className="text-xs text-white/40 truncate">{book.author}</p>
              <div className="mt-4 h-2 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  className="h-full bg-gradient-to-r from-violet-500 to-emerald-400"
                />
              </div>
            </div>
            <div className="p-3 overflow-y-auto flex-1 space-y-1">
              {book.chapters.map((chapter: Chapter) => (
                <ChapterItem key={chapter.id} chapter={chapter} onToggle={toggleChapter} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-14 border-b border-white/10 bg-black/30 flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={() => handleSidebarChange(!showSidebar)} className="btn-ghost p-2">
              <List size={16} />
            </button>
            <button onClick={() => handlePageChange(currentPage - 1)} className="btn-ghost p-2">
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs text-white/50 px-1 font-mono">
              Page {currentPage} of {totalPages === 1000 ? '?' : totalPages}
            </span>
            <button onClick={() => handlePageChange(currentPage + 1)} className="btn-ghost p-2">
              <ChevronRight size={16} />
            </button>
            <button onClick={() => handleZoomChange(zoom - 10)} className="btn-ghost p-2">
              <ZoomOut size={16} />
            </button>
            <span className="text-xs text-white/50 px-1 font-mono">{zoom}%</span>
            <button onClick={() => handleZoomChange(zoom + 10)} className="btn-ghost p-2">
              <ZoomIn size={16} />
            </button>
            <button onClick={() => handleZoomChange(100)} className="btn-ghost p-2">
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

        <iframe
          src={iframeSrc}
          className="w-full flex-1 border-none bg-white"
          title="Book Reader"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        />
      </div>
    </div>
  ) : (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
      <FileUp size={32} className="text-violet-400 mb-4" />
      <h3 className="text-lg font-bold text-white">Upload your book</h3>
      <p className="text-sm text-white/40 mb-6">Your PDF stays local in your browser.</p>
      <label className="btn-glow px-6 py-3 cursor-pointer flex items-center gap-2">
        <BookOpen size={16} /> Choose PDF
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileUpload}
        />
      </label>
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title="Interactive Reader" maxWidth="max-w-7xl" showClose>
      <div className="h-[80vh] flex flex-col">{content}</div>
    </Modal>
  );
}
