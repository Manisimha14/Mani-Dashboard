import React from 'react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { RotateCcw, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

interface UndoToastProps {
  t: any;
  message: string;
  type: string;
}

export const showUndoToast = (message: string, type: string = 'Action') => {
  toast.custom((t) => <UndoToast t={t} message={message} type={type} />, {
    duration: 5000,
    position: 'bottom-center',
  });
};

function UndoToast({ t, message, type }: UndoToastProps) {
  const { undoLastAction } = useAppStore();

  const handleUndo = () => {
    undoLastAction();
    toast.dismiss(t.id);
    toast.success('Action reversed', { icon: '✨' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={`${
        t.visible ? 'animate-enter' : 'animate-leave'
      } max-w-md w-full bg-[#161828] shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-white/10 border border-white/5 overflow-hidden`}
    >
      <div className="flex-1 w-0 p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0 pt-0.5">
            <div className="h-10 w-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
               <RotateCcw size={20} className="text-violet-400" />
            </div>
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-bold text-white uppercase tracking-widest text-[10px] opacity-40">
              {type}
            </p>
            <p className="mt-1 text-sm font-medium text-white/80">
              {message}
            </p>
          </div>
        </div>
      </div>
      <div className="flex border-l border-white/5">
        <button
          onClick={handleUndo}
          className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-bold text-violet-400 hover:text-violet-300 hover:bg-white/5 transition-all uppercase tracking-widest text-[11px]"
        >
          Undo
        </button>
        <button
          onClick={() => toast.dismiss(t.id)}
          className="border-l border-white/5 p-4 flex items-center justify-center text-white/20 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </motion.div>
  );
}
