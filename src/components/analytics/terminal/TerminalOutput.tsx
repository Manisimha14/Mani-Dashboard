import React from 'react';
import type { TerminalMessage } from './types';

interface TerminalOutputProps {
  history: TerminalMessage[];
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const TerminalOutput = React.memo(({ history, containerRef }: TerminalOutputProps) => {
  return (
    <div
      ref={containerRef}
      className="font-mono text-xs text-white/80 space-y-2.5 max-h-56 overflow-y-auto custom-scrollbar pr-2 leading-relaxed h-44 mb-4 select-text transform-gpu"
      style={{ willChange: 'transform' }}
    >
      {history.map((msg, index) => (
        <div
          key={index}
          className={
            msg.type === 'command'
              ? 'text-fuchsia-400 font-bold'
              : msg.type === 'system'
              ? 'text-white/40'
              : 'text-emerald-400'
          }
        >
          {msg.lines.map((line, li) => (
            <div key={li}>{line}</div>
          ))}
        </div>
      ))}
    </div>
  );
});

TerminalOutput.displayName = 'TerminalOutput';

export default TerminalOutput;
