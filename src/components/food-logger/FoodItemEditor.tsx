import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Edit2, X } from 'lucide-react';
import type { FoodItem } from '../../hooks/useFoodLogger';

type FoodItemEditorProps = {
  items: FoodItem[];
  onUpdateItem: (index: number, item: FoodItem) => void;
};

export function FoodItemEditor({ items, onUpdateItem }: FoodItemEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<FoodItem | null>(null);
  const [quantityInput, setQuantityInput] = useState('');

  const startEditing = (index: number, item: FoodItem) => {
    setEditingIndex(index);
    setEditDraft({ ...item });
    setQuantityInput(String(item.quantity));
  };

  const saveEdit = () => {
    if (editingIndex !== null && editDraft) {
      const val = parseFloat(quantityInput);
      if (Number.isNaN(val) || val <= 0 || val > 10000) {
        return; // Strict validation to prevent NaN, negative, or excessive values
      }
      onUpdateItem(editingIndex, {
        ...editDraft,
        quantity: val
      });
    }
    setEditingIndex(null);
    setEditDraft(null);
  };

  return (
    <div className="space-y-3 mb-8">
      <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Detected Items</h4>
      <div className="flex flex-wrap gap-2">
        <AnimatePresence mode="popLayout">
          {items.map((item, idx) => {
            const isEditing = editingIndex === idx;
            // Generate robust keys preventing re-ordering bugs
            const itemKey = item.id || `${item.food_name}-${idx}`;
            
            return (
              <motion.div
                key={itemKey}
                layout
                className="relative group bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/80 rounded-2xl p-3 transition-colors shadow-sm"
              >
                {isEditing ? (
                  <div className="flex items-center space-x-2.5">
                    <input 
                      type="number"
                      min="0.1"
                      max="9999"
                      step="0.1"
                      className="w-20 bg-zinc-950 border border-zinc-700 rounded-xl px-2.5 py-1 text-white text-xs font-semibold outline-none focus:border-cyan-500"
                      value={quantityInput}
                      onChange={e => setQuantityInput(e.target.value)}
                      autoFocus
                    />
                    <span className="text-xs text-zinc-400 font-medium">{item.unit}</span>
                    <span className="text-xs text-white font-medium truncate max-w-[120px]">{item.food_name}</span>
                    <div className="flex items-center space-x-1">
                      <button 
                        type="button"
                        onClick={saveEdit} 
                        className="text-cyan-400 p-1.5 hover:bg-cyan-500/10 rounded-lg transition-colors cursor-pointer"
                      >
                        <Check size={14} />
                      </button>
                      <button 
                        type="button"
                        onClick={() => setEditingIndex(null)} 
                        className="text-zinc-500 p-1.5 hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <div className="flex flex-col text-left">
                      <span className="text-xs text-white font-semibold">{item.food_name}</span>
                      <div className="flex items-center space-x-2 text-[10px] text-zinc-400 mt-0.5">
                        <span className="font-medium bg-zinc-900/60 px-1.5 py-0.5 rounded border border-zinc-700/30">
                          {item.quantity} {item.unit}
                        </span>
                        {item.estimated && <span className="italic opacity-60">est.</span>}
                      </div>
                    </div>
                    {/* Always visible edit trigger - Mobile friendly with zero hover reliance */}
                    <button 
                      type="button"
                      onClick={() => startEditing(idx, item)}
                      className="ml-2 p-1.5 text-zinc-400 hover:text-cyan-400 rounded-lg hover:bg-zinc-700/80 transition-all cursor-pointer border border-zinc-700/20 hover:border-cyan-500/20"
                      title="Edit Item"
                    >
                      <Edit2 size={13} />
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
