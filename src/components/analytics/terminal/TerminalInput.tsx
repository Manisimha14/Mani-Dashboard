import React, { useState, useMemo, useRef, useEffect } from 'react';

interface TerminalInputProps {
  commandHistory: string[];
  onExecute: (cmd: string) => void;
  onClear: () => void;
}

const TerminalInput = React.memo(({ commandHistory, onExecute, onClear }: TerminalInputProps) => {
  const [localInput, setLocalInput] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Autofocus on mount to ensure immediate keyboard readiness
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 80); // 80ms deferral allows modal transitions to settle cleanly
    return () => clearTimeout(timer);
  }, []);

  // Esc to autofocus and Ctrl+L keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.ctrlKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        onClear();
      }
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [onClear]);

  // Handle Tab autocomplete and Enter execution
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const val = localInput;
      if (val.trim()) {
        onExecute(val);
        setLocalInput('');
        setHistoryIndex(-1);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (suggestions.length > 0) {
        setLocalInput(suggestions[0]);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const nextIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setLocalInput(commandHistory[nextIndex]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      if (historyIndex === commandHistory.length - 1) {
        setHistoryIndex(-1);
        setLocalInput('');
      } else {
        const nextIndex = historyIndex + 1;
        setHistoryIndex(nextIndex);
        setLocalInput(commandHistory[nextIndex]);
      }
    }
  };

  // Dynamic context-aware autocompletions computed locally to prevent parent lag
  const suggestions = useMemo(() => {
    const term = localInput.trim().toLowerCase();
    if (!term) return [];
    
    const validCommands = [
      'help',
      'focus',
      'focus streak',
      'focus weekly',
      'code',
      'leetcode',
      'problems',
      'health',
      'water',
      'sleep',
      'calories',
      'today',
      'insights',
      'go health',
      'go analytics',
      'log water',
      'log calories',
      'clear',
      'history',
      'ls',
      'cls',
      'stats',
      'wk',
    ];
    return validCommands.filter(c => c.startsWith(term) && c !== term);
  }, [localInput]);

  return (
    <div className="relative z-10 flex flex-col gap-2 border-t border-white/5 pt-3">
      {/* Autocomplete suggestion pills */}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-2">
          {suggestions.map(s => (
            <button
              key={s}
              onClick={() => {
                setLocalInput(s);
                inputRef.current?.focus();
              }}
              className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-mono text-white/40 hover:text-white/80 hover:bg-white/10 transition-all"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between font-mono text-xs">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-fuchsia-400 font-black animate-pulse flex-shrink-0">&gt;</span>
          <input
            ref={inputRef}
            type="text"
            value={localInput}
            onChange={e => setLocalInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type 'help' to begin... (Tab to autocomplete)"
            className="w-full bg-transparent border-0 outline-none ring-0 p-0 text-white font-bold placeholder-white/20 select-all"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />
        </div>
        <div className="hidden sm:flex gap-3 text-[9px] text-white/20 select-none flex-shrink-0">
          <span><kbd className="bg-white/5 px-1 py-0.5 rounded border border-white/5">Tab</kbd> Complete</span>
          <span><kbd className="bg-white/5 px-1 py-0.5 rounded border border-white/5">Esc</kbd> Focus</span>
          <span><kbd className="bg-white/5 px-1 py-0.5 rounded border border-white/5">Ctrl+L</kbd> Clear</span>
        </div>
      </div>
    </div>
  );
});

TerminalInput.displayName = 'TerminalInput';

export default TerminalInput;
