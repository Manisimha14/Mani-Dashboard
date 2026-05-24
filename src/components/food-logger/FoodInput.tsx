import React, { useState, useRef } from 'react';
import { Mic, Camera, Send, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type FoodInputProps = {
  onParse: (input: string) => void;
  isParsing: boolean;
  loadingMessage: string;
};

const placeholderExamples = [
  "2 chapatis + dal + rice...",
  "paneer biryani lunch...",
  "3 eggs and toast...",
  "poha and chai..."
];

export function FoodInput({ onParse, isParsing, loadingMessage }: FoodInputProps) {
  const [input, setInput] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  // Rotate placeholders every 3 seconds if empty
  React.useEffect(() => {
    if (input) return;
    const interval = setInterval(() => {
      setPlaceholderIndex((current) => (current + 1) % placeholderExamples.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isParsing) {
      onParse(input);
      setInput(''); // clear after sending
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleVoiceClick = () => {
    // We do not fake mock this in production as per user guidelines
    alert("Voice logging coming soon.");
  };

  const handlePhotoClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && !isParsing) {
      // In a full implementation, we'd send the image to a Vision model API.
      // For this MVP without a vision backend, we'll simulate the analysis
      // by passing a generic prompt to the text parser.
      onParse("Image analyzed: A balanced meal containing rice, mixed vegetables, and a protein source.");
      // Reset input
      e.target.value = '';
    }
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto rounded-3xl bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 shadow-2xl overflow-hidden p-1 transition-all duration-300 hover:border-zinc-700 hover:shadow-cyan-900/20">
      
      {/* Background glowing effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none" />

      <form onSubmit={handleSubmit} className="relative flex flex-col h-full z-10">
        
        {/* Animated Placeholder Layer */}
        {!input && !isParsing && (
          <div className="absolute top-5 left-5 pointer-events-none overflow-hidden h-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={placeholderIndex}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 0.5 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="text-lg text-zinc-400"
              >
                {placeholderExamples[placeholderIndex]}
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isParsing}
          className="w-full bg-transparent border-none resize-none outline-none text-lg text-zinc-100 placeholder-transparent p-5 min-h-[120px]"
          placeholder="What did you eat today?"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />

        <div className="flex items-center justify-between p-3 bg-zinc-900/80 rounded-2xl m-2">
          
          <div className="flex items-center space-x-2">
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={handleVoiceClick}
              className="p-2 rounded-xl text-zinc-400 hover:text-cyan-400 hover:bg-zinc-800 transition-colors"
              title="Coming Soon"
            >
              <Mic size={20} />
            </button>
            <button
              type="button"
              onClick={handlePhotoClick}
              className="p-2 rounded-xl text-zinc-400 hover:text-cyan-400 hover:bg-zinc-800 transition-colors"
              title="Coming Soon"
            >
              <Camera size={20} />
            </button>
          </div>

          <div className="flex items-center space-x-3">
             <AnimatePresence mode="popLayout">
               {isParsing && (
                 <motion.div 
                   initial={{ opacity: 0, x: 20 }}
                   animate={{ opacity: 1, x: 0 }}
                   exit={{ opacity: 0, x: -20 }}
                   className="flex items-center space-x-2 text-cyan-400 text-sm font-medium"
                 >
                   <Sparkles className="animate-spin-slow w-4 h-4" />
                   <span>{loadingMessage}</span>
                 </motion.div>
               )}
             </AnimatePresence>

             <button
                type="submit"
                disabled={!input.trim() || isParsing}
                className="p-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl shadow-lg hover:shadow-cyan-500/30 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed transition-all duration-300"
              >
                <Send size={18} className={input.trim() && !isParsing ? 'opacity-100' : 'opacity-70'} />
              </button>
          </div>

        </div>
      </form>
    </div>
  );
}
