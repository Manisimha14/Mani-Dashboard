import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

// SIDEBAR_W keeps the modal visually centred in the main content area
const SIDEBAR_W = 240;

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
           * Centering container: covers viewport but adds left padding equal
           * to the sidebar so the modal lands in the centre of the content
           * area, not the centre of the whole viewport.
           */}
          <div
            className="fixed inset-0 z-[301] flex items-center justify-center"
            // prevent click-through to backdrop when clicking the non-modal area
          >
            <motion.div
              className={`w-full ${maxWidth} mx-4`}
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
                className="glass-card p-6 relative overflow-hidden"
                style={{
                  background: 'rgba(10,11,22,0.97)',
                  border: '1px solid rgba(139,92,246,0.18)',
                  boxShadow: '0 0 0 1px rgba(139,92,246,0.08), 0 24px 80px rgba(0,0,0,0.7), 0 0 40px rgba(139,92,246,0.08)',
                }}
              >
                {/* top accent line */}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-violet-500/60 to-transparent" />

                {(title || showClose) && (
                  <div className="flex items-center justify-between mb-5">
                    {title && <h3 className="font-semibold text-white text-base">{title}</h3>}
                    {showClose && (
                      <button
                        onClick={onClose}
                        aria-label="Close dialog"
                        className="ml-auto text-white/30 hover:text-white/80 transition-colors p-1 rounded-lg hover:bg-white/5"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                )}

                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
