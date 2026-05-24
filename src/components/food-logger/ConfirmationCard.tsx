import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Edit2, Info, AlertTriangle, Save, X, Sparkles, Send, Camera } from 'lucide-react';
import type { ParsedMealData, FoodItem } from '../../hooks/useFoodLogger';

type ConfirmationCardProps = {
  data: ParsedMealData;
  onSave: () => void;
  onCancel: () => void;
  onUpdateItem: (index: number, item: FoodItem) => void;
  askAICoach?: (query: string, history: { role: 'user' | 'assistant'; content: string }[]) => Promise<string>;
  imagePreviewUrl?: string | null;
};

export function ConfirmationCard({ 
  data, 
  onSave, 
  onCancel, 
  onUpdateItem, 
  askAICoach,
  imagePreviewUrl 
}: ConfirmationCardProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<FoodItem | null>(null);

  // AI Health Coach Local Conversations States
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isCoachExpanded, setIsCoachExpanded] = useState(false);

  const startEditing = (index: number, item: FoodItem) => {
    setEditingIndex(index);
    setEditDraft({ ...item });
  };

  const saveEdit = () => {
    if (editingIndex !== null && editDraft) {
      onUpdateItem(editingIndex, editDraft);
    }
    setEditingIndex(null);
    setEditDraft(null);
  };

  const getConfidenceColor = (conf: string) => {
    switch (conf) {
      case 'high': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'medium': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      case 'low': return 'text-rose-400 bg-rose-400/10 border-rose-400/20';
      default: return 'text-zinc-400 bg-zinc-800 border-zinc-700';
    }
  };

  // Uncertainty Range Displays (Avoiding False Precision on medium/low confidence AI logs)
  const baseCalories = data.totals.calories;
  const lowerRange = Math.round(baseCalories * 0.85);
  const upperRange = Math.round(baseCalories * 1.15);
  const showRange = data.confidence !== 'high' && baseCalories > 0;

  // AI Coach Message Submissions
  const handleSendChat = async () => {
    if (!chatInput.trim() || !askAICoach || isChatLoading) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    setIsChatLoading(true);
    setIsCoachExpanded(true);

    const updatedHistory = [...chatMessages, { role: 'user' as const, content: userMsg }];
    setChatMessages(updatedHistory);

    try {
      // Call coach with complete conversation thread
      const response = await askAICoach(userMsg, chatMessages);
      setChatMessages([...updatedHistory, { role: 'assistant' as const, content: response }]);
    } catch (e) {
      setChatMessages([...updatedHistory, { role: 'assistant' as const, content: "Sorry, I had trouble communicating with the coach database. Please verify your connection." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleQuickQuery = (query: string) => {
    setChatInput(query);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-2xl mx-auto mt-6 bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl"
    >
      {/* 1. Header Slot for Logged Food Photo capture */}
      {imagePreviewUrl && (
        <div className="relative w-full h-48 overflow-hidden">
          <img 
            src={imagePreviewUrl} 
            alt="Captured meal preview" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent" />
          
          <div className="absolute bottom-4 left-6 flex items-center space-x-2 bg-zinc-900/80 border border-zinc-800/80 px-3 py-1 rounded-full text-[10px] text-cyan-400 font-semibold tracking-wider uppercase">
            <Camera size={12} />
            <span>Verified Food Capture</span>
          </div>
        </div>
      )}

      <div className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-medium text-white capitalize">{data.meal_type}</h3>
            
            <div className={`mt-2 inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getConfidenceColor(data.confidence)}`}>
              {data.confidence === 'high' && <Check size={14} />}
              {data.confidence === 'medium' && <Info size={14} />}
              {data.confidence === 'low' && <AlertTriangle size={14} />}
              <span className="uppercase tracking-wider">{data.confidence} CONFIDENCE</span>
            </div>
            
            {data.confidence_reason && (
              <p className="mt-2 text-sm text-zinc-400 flex items-start space-x-2">
                <Info size={14} className="mt-0.5 flex-shrink-0" />
                <span>{data.confidence_reason}</span>
              </p>
            )}
          </div>
        </div>

        <div className="space-y-3 mb-8">
          <h4 className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Detected Items</h4>
          <div className="flex flex-wrap gap-2">
            <AnimatePresence>
              {data.items.map((item, idx) => (
                <motion.div
                  key={idx}
                  layout
                  className="relative group bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700 rounded-2xl p-3 transition-colors"
                >
                  {editingIndex === idx ? (
                    <div className="flex items-center space-x-3">
                      <input 
                        type="number"
                        className="w-16 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-white text-sm"
                        value={editDraft?.quantity || ''}
                        onChange={e => setEditDraft(prev => prev ? {...prev, quantity: Number(e.target.value)} : null)}
                      />
                      <span className="text-sm text-zinc-400">{item.unit}</span>
                      <span className="text-sm text-white font-medium">{item.food_name}</span>
                      <button onClick={saveEdit} className="text-cyan-400 p-1 hover:bg-cyan-400/10 rounded">
                        <Check size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <div className="flex flex-col">
                        <span className="text-white font-medium">{item.food_name}</span>
                        <div className="flex items-center space-x-2 text-xs text-zinc-400">
                          <span>{item.quantity} {item.unit}</span>
                          {item.estimated && <span className="italic opacity-60">est.</span>}
                        </div>
                      </div>
                      <button 
                        onClick={() => startEditing(idx, item)}
                        className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-700"
                      >
                        <Edit2 size={14} />
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* 2. Macro Summary Panel with range offsets for lower confidence values */}
        <div className="bg-zinc-950/50 rounded-2xl p-5 mb-6 border border-zinc-800/50">
          <h4 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4 font-intel">Nutrition Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="flex flex-col">
              <span className="text-2xl font-light text-white">
                {showRange ? `${lowerRange}–${upperRange}` : Math.round(baseCalories)}
              </span>
              <span className="text-xs text-zinc-500">
                {showRange ? 'kcal (est. range)' : 'kcal'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-light text-cyan-400">{Math.round(data.totals.protein)}g</span>
              <span className="text-xs text-zinc-500">Protein</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-light text-purple-400">{Math.round(data.totals.carbs)}g</span>
              <span className="text-xs text-zinc-500">Carbs</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-light text-rose-400">{Math.round(data.totals.fat)}g</span>
              <span className="text-xs text-zinc-500">Fat</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-light text-emerald-400">{Math.round(data.totals.fiber)}g</span>
              <span className="text-xs text-zinc-500">Fiber</span>
            </div>
          </div>
        </div>

        {/* 3. Interactive AI Health Coach Section (Conversation Thread Panel) */}
        {askAICoach && (
          <div className="mt-4 border border-zinc-800/50 rounded-2xl bg-zinc-950/30 overflow-hidden mb-6">
            <button
              onClick={() => setIsCoachExpanded(!isCoachExpanded)}
              className="w-full p-4 flex items-center justify-between text-left text-zinc-400 hover:text-white transition-colors"
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
                    {/* Chat Messages history */}
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
                                : 'bg-zinc-900/90 border border-zinc-800 text-zinc-200 rounded-bl-none prose prose-invert max-w-none'
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
                      </div>
                    ) : (
                      <div className="text-center py-6 text-zinc-500 text-xs">
                        💬 Ask our health coach questions like "How can I double the protein?" or "Is this high in carbs?"
                      </div>
                    )}

                    {/* Predefined Quick Actions */}
                    {chatMessages.length === 0 && !isChatLoading && (
                      <div className="flex flex-wrap gap-2 justify-center">
                        <button 
                          onClick={() => handleQuickQuery("Is this meal good for weight loss?")}
                          className="text-[11px] bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-3 py-1.5 rounded-full text-zinc-400 hover:text-cyan-400 transition-all duration-300"
                        >
                          🥗 Good for weight loss?
                        </button>
                        <button 
                          onClick={() => handleQuickQuery("How can I add 15g more protein to this?")}
                          className="text-[11px] bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-3 py-1.5 rounded-full text-zinc-400 hover:text-cyan-400 transition-all duration-300"
                        >
                          🍳 Add 15g protein?
                        </button>
                        <button 
                          onClick={() => handleQuickQuery("What are the main micro-nutrients here?")}
                          className="text-[11px] bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-3 py-1.5 rounded-full text-zinc-400 hover:text-cyan-400 transition-all duration-300"
                        >
                          🍊 Main micro-nutrients?
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
                        className="absolute right-2 p-1.5 text-cyan-400 hover:text-cyan-300 disabled:opacity-30 transition-colors"
                      >
                        <Send size={14} />
                      </button>
                    </form>

                    {/* Medical disclaimer footer */}
                    <div className="text-[9px] text-zinc-600 text-center leading-relaxed font-intel">
                      Coach advice is educational and should not replace professional medical consulting.
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 px-4 rounded-xl border border-zinc-700 text-zinc-300 font-medium hover:bg-zinc-800 transition-colors flex items-center justify-center space-x-2"
          >
            <X size={18} />
            <span>Discard</span>
          </button>
          <button
            onClick={onSave}
            className="flex-[2] py-3 px-4 rounded-xl bg-cyan-600 text-white font-medium hover:bg-cyan-500 shadow-lg shadow-cyan-900/20 transition-all flex items-center justify-center space-x-2"
          >
            <Save size={18} />
            <span>Save to Log</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
