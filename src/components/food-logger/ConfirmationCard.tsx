import React from 'react';
import { Save, X } from 'lucide-react';
import type { ParsedMealData, FoodItem } from '../../hooks/useFoodLogger';
import { MealImagePreview } from './MealImagePreview';
import { MealConfidenceBadge } from './MealConfidenceBadge';
import { FoodItemEditor } from './FoodItemEditor';
import { NutritionSummary } from './NutritionSummary';
import { AICoachPanel } from './AICoachPanel';

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
  // Drive proactive engagement: Auto-expand the AI Coach when the confidence score is 'low'
  const isConfidenceLow = data.confidence === 'low';

  return (
    <div className="w-full max-w-2xl mx-auto mt-6 bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl animate-enter">
      
      {/* 1. Specialized Image Preview Component */}
      {imagePreviewUrl && <MealImagePreview url={imagePreviewUrl} />}

      <div className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="text-left">
            <h3 className="text-xl font-bold text-white capitalize tracking-tight">{data.meal_type}</h3>
            
            {/* 2. Specialized Confidence Indicator Badge */}
            <div className="mt-2.5">
              <MealConfidenceBadge confidence={data.confidence} />
            </div>
            
            {data.confidence_reason && (
              <p className="mt-3 text-xs text-zinc-400 leading-relaxed max-w-md">
                <span className="font-semibold text-zinc-500 uppercase tracking-widest block text-[9px] mb-1">Confidence Note</span>
                {data.confidence_reason}
              </p>
            )}
          </div>
        </div>

        {/* 3. Decomposed Collection Editor */}
        <FoodItemEditor items={data.items} onUpdateItem={onUpdateItem} />

        {/* 4. Decomposed High-contrast Proportion Summary */}
        <NutritionSummary data={data} />

        {/* 5. Decomposed Auto-scrolling, Contextual Conversation Panel */}
        {askAICoach && (
          <AICoachPanel 
            data={data} 
            askAICoach={askAICoach} 
            initiallyExpanded={isConfidenceLow} 
          />
        )}

        {/* Save/Discard Actions Row */}
        <div className="flex space-x-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 px-4 rounded-xl border border-zinc-700 text-zinc-300 font-bold hover:bg-zinc-800 hover:text-white transition-all duration-200 flex items-center justify-center space-x-2 cursor-pointer"
          >
            <X size={18} />
            <span>Discard</span>
          </button>
          <button
            type="button"
            onClick={onSave}
            className="flex-[2] py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold shadow-lg shadow-cyan-950/45 hover:shadow-cyan-900/60 transition-all duration-200 flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Save size={18} />
            <span>Save to Log</span>
          </button>
        </div>
      </div>
    </div>
  );
}
