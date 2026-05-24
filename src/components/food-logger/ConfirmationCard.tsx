import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Edit2, Info, AlertTriangle, Save, X } from 'lucide-react';
import { ParsedMealData, FoodItem } from '../../hooks/useFoodLogger';

type ConfirmationCardProps = {
  data: ParsedMealData;
  onSave: () => void;
  onCancel: () => void;
  onUpdateItem: (index: number, item: FoodItem) => void;
};

export function ConfirmationCard({ data, onSave, onCancel, onUpdateItem }: ConfirmationCardProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<FoodItem | null>(null);

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

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-2xl mx-auto mt-6 bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl"
    >
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

        <div className="bg-zinc-950/50 rounded-2xl p-5 mb-6 border border-zinc-800/50">
          <h4 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4">Nutrition Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="flex flex-col">
              <span className="text-2xl font-light text-white">{Math.round(data.totals.calories)}</span>
              <span className="text-xs text-zinc-500">kcal</span>
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
