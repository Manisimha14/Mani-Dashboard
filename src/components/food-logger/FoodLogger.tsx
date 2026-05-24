import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FoodInput } from './FoodInput';
import { ConfirmationCard } from './ConfirmationCard';
import { useFoodLogger } from '../../hooks/useFoodLogger';
import { Sparkles } from 'lucide-react';

export function FoodLogger() {
  const {
    isParsing,
    loggerState,
    setLoggerState,
    loadingStateMessage,
    parsedData,
    imagePreviewUrl,
    parseFood,
    updateItem,
    saveMeal,
    askAICoach,
    cancel
  } = useFoodLogger();

  return (
    <div className="w-full flex flex-col items-center">
      
      {/* Header */}
      <div className="mb-4 text-center w-full flex items-center gap-3">
        <h2 className="text-xs text-white/30 uppercase tracking-widest font-bold">AI Food Logger</h2>
        <div className="h-px bg-white/10 flex-1"></div>
      </div>

      {/* Main Input - Fades out during parsing/scanning to keep focus clear */}
      {!parsedData && !isParsing && (
        <FoodInput 
          onParse={parseFood} 
          isParsing={isParsing} 
          loadingMessage={loadingStateMessage} 
          onStateChange={setLoggerState}
        />
      )}

      {/* Optimistic Laser Scanner Visual - Delights the user during upload & parsing */}
      <AnimatePresence>
        {isParsing && imagePreviewUrl && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative w-full max-w-md mx-auto aspect-video rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-950/80 shadow-2xl flex items-center justify-center p-1"
          >
            {/* The Image Preview */}
            <img 
              src={imagePreviewUrl} 
              alt="Scanning food capture" 
              className="w-full h-full object-cover rounded-2xl opacity-60 filter blur-[0.5px]"
            />
            {/* Dark glass overlay */}
            <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] rounded-2xl" />
            
            {/* Horizontal Cyan Laser Scan Line */}
            <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_rgba(34,211,238,0.8)] animate-scan" />
            
            {/* State Text & Progress indicators */}
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 z-10">
              <div className="flex items-center space-x-2 bg-zinc-900/90 border border-zinc-800 px-5 py-2.5 rounded-full shadow-2xl text-cyan-400 font-semibold text-sm">
                <Sparkles className="animate-spin-slow w-4 h-4" />
                <span>{loadingStateMessage}</span>
              </div>
              
              <div className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest bg-zinc-950/40 px-3 py-1 rounded-full backdrop-blur-md">
                Status: {loggerState}
              </div>
            </div>
          </motion.div>
        )}

        {/* Text Parsing Fallback (When no photo was uploaded but standard text is analyzing) */}
        {isParsing && !imagePreviewUrl && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center space-x-3 p-8 text-cyan-400 font-medium bg-zinc-900/40 border border-zinc-800/50 rounded-2xl w-full max-w-md"
          >
            <Sparkles className="animate-spin-slow w-5 h-5" />
            <span>{loadingStateMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Panel with Parsed Nutrition Details & AI Coach */}
      <AnimatePresence mode="wait">
        {parsedData && (
          <motion.div
            key="confirmation"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full animate-enter"
          >
            <ConfirmationCard
              data={parsedData}
              onSave={saveMeal}
              onCancel={cancel}
              onUpdateItem={updateItem}
              askAICoach={askAICoach}
              imagePreviewUrl={imagePreviewUrl}
            />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
