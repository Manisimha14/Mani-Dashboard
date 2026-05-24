import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FoodInput } from './FoodInput';
import { ConfirmationCard } from './ConfirmationCard';
import { SavedMealsList } from './SavedMealsList';
import { useFoodLogger } from '../../hooks/useFoodLogger';

export function FoodLogger() {
  const {
    isParsing,
    loadingStateMessage,
    parsedData,
    parseFood,
    updateItem,
    saveMeal,
    cancel
  } = useFoodLogger();

  return (
    <div className="w-full min-h-full flex flex-col items-center pt-10 pb-20 px-4">
      
      {/* Header */}
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-light text-white mb-2 tracking-tight">Log your food</h2>
        <p className="text-zinc-500">Just type naturally. AI will handle the math.</p>
      </div>

      {/* Main Input */}
      <FoodInput 
        onParse={parseFood} 
        isParsing={isParsing} 
        loadingMessage={loadingStateMessage} 
      />

      <AnimatePresence mode="wait">
        {parsedData ? (
          /* Confirmation UI */
          <motion.div
            key="confirmation"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full"
          >
            <ConfirmationCard
              data={parsedData}
              onSave={saveMeal}
              onCancel={cancel}
              onUpdateItem={updateItem}
            />
          </motion.div>
        ) : (
          /* Quick Add & Templates */
          <motion.div
            key="templates"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full"
          >
            <SavedMealsList 
              onSelect={parseFood} 
              disabled={isParsing} 
            />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
