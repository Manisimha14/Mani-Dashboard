import React from 'react';
import { Bookmark, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

type SavedMealsListProps = {
  onSelect: (input: string) => void;
  disabled: boolean;
};

// Hardcoded for MVP, would normally be fetched from `saved_meals` DB table
const mockSavedMeals = [
  { id: '1', name: 'Study Lunch', input: '2 chapatis 200g rice 150ml dal 100ml curd', icon: '🧠' },
  { id: '2', name: 'Gym Breakfast', input: '4 egg whites, 2 pieces whole wheat toast, 1 banana', icon: '💪' },
  { id: '3', name: 'SQL Night Snack', input: '1 cup black coffee, 1 packet maggi', icon: '💻' },
];

const frequentFoods = [
  { id: 'f1', name: 'Rice', input: '200g rice', emoji: '🍚' },
  { id: 'f2', name: 'Chapati', input: '2 chapatis', emoji: '🫓' },
  { id: 'f3', name: 'Dal', input: '1 katori dal', emoji: '🥣' },
  { id: 'f4', name: 'Curd', input: '100g curd', emoji: '🥛' },
  { id: 'f5', name: 'Eggs', input: '2 boiled eggs', emoji: '🥚' },
  { id: 'f6', name: 'Biryani', input: '300g chicken biryani', emoji: '🍛' },
];

export function SavedMealsList({ onSelect, disabled }: SavedMealsListProps) {
  return (
    <div className="w-full max-w-2xl mx-auto mt-8 space-y-8">
      
      {/* Saved Meals (Templates) */}
      <div>
        <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4 flex items-center">
          <Bookmark size={14} className="mr-2" />
          Saved Meals
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {mockSavedMeals.map((meal, idx) => (
            <motion.button
              key={meal.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => onSelect(meal.input)}
              disabled={disabled}
              className="flex items-center space-x-3 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform">{meal.icon}</span>
              <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">{meal.name}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Frequent Foods */}
      <div>
        <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4 flex items-center">
          <Clock size={14} className="mr-2" />
          Frequent Foods
        </h3>
        <div className="flex flex-wrap gap-2">
          {frequentFoods.map((food, idx) => (
            <motion.button
              key={food.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + (idx * 0.03) }}
              onClick={() => onSelect(food.input)}
              disabled={disabled}
              className="flex items-center space-x-2 py-2 px-4 rounded-full bg-zinc-900/50 border border-zinc-800 hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all text-sm font-medium text-zinc-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{food.emoji}</span>
              <span>{food.name}</span>
            </motion.button>
          ))}
        </div>
      </div>

    </div>
  );
}
