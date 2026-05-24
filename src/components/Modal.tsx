import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
  /** pass false to omit the default close button */
  showClose?: boolean;
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
  showClose = true,
}: ModalProps) {
  const modalRef = React.useRef<HTMLDivElement | null>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() => modalRef.current?.focus());

    return () => {
      cancelAnimationFrame(frame);
      previousFocusRef.current?.focus();
    };
  }, [open]);

  if (!document.body) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[300]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/*
           * Centering container — uses py-4 so content never touches viewport edges,
           * and overflow-y-auto so tall modals scroll rather than get clipped.
           */}
          <div
            className="fixed inset-0 z-[301] flex items-start justify-center overflow-y-auto py-4 px-4"
          >
            <motion.div
              className={`w-full ${maxWidth} my-auto`}
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              onClick={e => e.stopPropagation()}
            >
              <div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-label={title ?? 'Dialog'}
                tabIndex={-1}
                className="glass-card relative"
                style={{
                  background: 'rgba(10,11,22,0.97)',
                  border: '1px solid rgba(139,92,246,0.18)',
                  boxShadow: '0 0 0 1px rgba(139,92,246,0.08), 0 24px 80px rgba(0,0,0,0.7), 0 0 40px rgba(139,92,246,0.08)',
                }}
              >
                {/* top accent line */}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-violet-500/60 to-transparent rounded-t-2xl" />

                {/* Sticky header with title + close — always visible */}
                <div className="sticky top-0 z-10 flex items-center justify-between px-6 pt-6 pb-4"
                  style={{ background: 'rgba(10,11,22,0.97)' }}
                >
                  {title
                    ? <h3 className="font-semibold text-white text-base">{title}</h3>
                    : <span />
                  }
                  {showClose && (
                    <button
                      onClick={onClose}
                      aria-label="Close dialog"
                      className="ml-auto text-white/40 hover:text-white transition-colors p-1.5 rounded-xl hover:bg-white/10 border border-transparent hover:border-white/10 flex-shrink-0"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>

                {/* Scrollable content area */}
                <div className="px-6 pb-6">
                  {children}
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
