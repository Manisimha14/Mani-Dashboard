import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FoodInput } from './FoodInput';
import { ConfirmationCard } from './ConfirmationCard';
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
    <div className="w-full flex flex-col items-center">
      
      {/* Header */}
      <div className="mb-4 text-center w-full flex items-center gap-3">
        <h2 className="text-xs text-white/30 uppercase tracking-widest font-bold">AI Food Logger</h2>
        <div className="h-px bg-white/10 flex-1"></div>
      </div>

      {/* Main Input */}
      <FoodInput 
        onParse={parseFood} 
        isParsing={isParsing} 
        loadingMessage={loadingStateMessage} 
      />

      <AnimatePresence mode="wait">
        {parsedData && (
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
        )}
      </AnimatePresence>

    </div>
  );
}
