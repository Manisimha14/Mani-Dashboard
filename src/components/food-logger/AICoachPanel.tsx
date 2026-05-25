import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send } from 'lucide-react';
import type { ParsedMealData } from '../../hooks/useFoodLogger';

type AICoachPanelProps = {
  data: ParsedMealData;
  askAICoach: (query: string, history: { role: 'user' | 'assistant'; content: string }[]) => Promise<string>;
  initiallyExpanded?: boolean;
};

export function AICoachPanel({ data, askAICoach, initiallyExpanded = false }: AICoachPanelProps) {
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isCoachExpanded, setIsCoachExpanded] = useState(initiallyExpanded);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logic to prevent message truncation
  useEffect(() => {
    if (isCoachExpanded) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isCoachExpanded]);

  // Derive smart contextual advice chips based on macros
  const getContextualAdvice = () => {
    const { protein, carbs, fat } = data.totals;
    if (protein < 15 && carbs > 60) {
      return {
        summary: "This meal is high in carbs but low in protein.",
        query: "This is high in carbs and low in protein. How can I rebalance this meal?"
      };
    }
    if (fat > 30) {
      return {
        summary: "This meal contains higher fats.",
        query: "This meal is higher in fats. How can I substitute ingredients to reduce fats?"
      };
    }
    return {
      summary: "This meal looks nicely balanced.",
      query: "How does this meal fit into a muscle-building diet?"
    };
  };

  const adviceContext = getContextualAdvice();

  const handleSendChat = async (directText?: string) => {
    const textToSend = (directText || chatInput).trim();
    if (!textToSend || isChatLoading) return;

    setChatInput('');
    setIsChatLoading(true);
    setIsCoachExpanded(true);

    const newMsg = { role: 'user' as const, content: textToSend };
    
    // Race-condition proof state updates
    let currentHistory: { role: 'user' | 'assistant'; content: string }[] = [];
    setChatMessages(prev => {
      currentHistory = [...prev, newMsg];
      return currentHistory;
    });

    try {
      // Call coach with correct, completely updated conversation thread history
      const response = await askAICoach(textToSend, currentHistory);
      setChatMessages(prev => [...prev, { role: 'assistant' as const, content: response }]);
    } catch (e) {
      setChatMessages(prev => [...prev, {
        role: 'assistant' as const,
        content: "Sorry, I had trouble communicating with the coach database. Please verify your connection."
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="mt-4 border border-zinc-800/50 rounded-2xl bg-zinc-950/30 overflow-hidden mb-6">
      <button
        type="button"
        onClick={() => setIsCoachExpanded(!isCoachExpanded)}
        className="w-full p-4 flex items-center justify-between text-left text-zinc-400 hover:text-white transition-colors cursor-pointer"
      >
        <div className="flex items-center space-x-2 text-sm font-semibold text-gradient-cyan">
          <Sparkles size={16} className="text-cyan-400 animate-pulse" />
          <span>Mani OS AI Nutrition Coach</span>
        </div>
        <span className="text-xs bg-zinc-800/60 hover:bg-zinc-800 px-2.5 py-1 rounded-full border border-zinc-700/40 transition-colors">
          {isCoachExpanded ? 'Collapse' : 'Ask Question'}
        </span>
      </button>

      <AnimatePresence>
        {isCoachExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-zinc-800/40 bg-zinc-950/20"
          >
            <div className="p-4 flex flex-col space-y-4">
              {/* Chat Messages list */}
              {chatMessages.length > 0 ? (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1 no-scrollbar flex flex-col">
                  {chatMessages.map((msg, idx) => (
                    <div 
                      key={idx} 
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                        msg.role === 'user' 
                          ? 'bg-cyan-600/10 border border-cyan-500/20 text-cyan-200 rounded-br-none' 
                          : 'bg-zinc-900/90 border border-zinc-800 text-zinc-200 rounded-bl-none'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  
                  {isChatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-bl-none p-3 max-w-[85%] flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              ) : (
                <div className="text-center py-4 flex flex-col items-center space-y-2">
                  <span className="text-[22px] animate-bounce">💬</span>
                  <div className="text-xs text-zinc-400 font-semibold">{adviceContext.summary}</div>
                  <div className="text-[10px] text-zinc-500 max-w-sm">
                    Ask our health coach queries to optimize protein totals or verify macros.
                  </div>
                </div>
              )}

              {/* Predefined Quick Actions - Sends instantly for a premium desktop experience */}
              {!isChatLoading && (
                <div className="flex flex-wrap gap-2 justify-center">
                  <button 
                    type="button"
                    onClick={() => handleSendChat(adviceContext.query)}
                    className="text-[10px] bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-3 py-1.5 rounded-full text-zinc-400 hover:text-cyan-400 transition-all duration-300 cursor-pointer flex items-center gap-1 font-semibold"
                  >
                    <span>💡 {chatMessages.length === 0 ? 'Smart Fix:' : ''} how to rebalance?</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleSendChat("How can I add 15g more protein to this?")}
                    className="text-[10px] bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-3 py-1.5 rounded-full text-zinc-400 hover:text-cyan-400 transition-all duration-300 cursor-pointer flex items-center gap-1 font-semibold"
                  >
                    <span>🍳 Add 15g protein?</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleSendChat("What are the main micro-nutrients here?")}
                    className="text-[10px] bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-3 py-1.5 rounded-full text-zinc-400 hover:text-cyan-400 transition-all duration-300 cursor-pointer flex items-center gap-1 font-semibold"
                  >
                    <span>🍊 Main micro-nutrients?</span>
                  </button>
                </div>
              )}

              {/* Send Message Input */}
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSendChat(); }}
                className="relative flex items-center"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={isChatLoading}
                  placeholder="Ask AI Health Coach..."
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-200 outline-none focus:border-cyan-500 pr-10"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || isChatLoading}
                  className="absolute right-2 p-1.5 text-cyan-400 hover:text-cyan-300 disabled:opacity-30 transition-colors cursor-pointer"
                >
                  <Send size={14} />
                </button>
              </form>

              {/* Disclaimer */}
              <div className="text-[9px] text-zinc-600 text-center leading-relaxed font-intel">
                Coach advice is educational and should not replace professional medical consulting.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
