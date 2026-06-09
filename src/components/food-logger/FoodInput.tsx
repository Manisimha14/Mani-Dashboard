import React, { useState, useRef, useEffect } from 'react';
import { Mic, Camera, Send, Sparkles, Clock, Plus, Flame, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useAutocomplete } from '../../hooks/useAutocomplete';
import { mealRepository } from '../../lib/mealRepository';

type FoodInputProps = {
  onParse: (input: string, image?: { data: string; mimeType: string }, previewUrl?: string, rawBlob?: Blob) => void;
  isParsing: boolean;
  loadingMessage: string;
  onStateChange?: (state: 'idle' | 'compressing' | 'uploading' | 'analyzing' | 'refining' | 'done' | 'error') => void;
  onImportMenu?: () => void;
};

const placeholderExamples = [
  "2 chapatis + dal + rice...",
  "paneer biryani lunch...",
  "3 eggs and toast...",
  "poha and chai..."
];

export function FoodInput({ onParse, isParsing, loadingMessage, onStateChange, onImportMenu }: FoodInputProps) {
  const [input, setInput] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [recentMeals, setRecentMeals] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea functionality
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(Math.max(textareaRef.current.scrollHeight, 80), 240)}px`;
    }
  }, [input]);

  // Load recent meals for quick add chips
  useEffect(() => {
    async function loadRecent() {
      try {
        const logs = await mealRepository.getMealLogs();
        const uniqueMeals = new Set<string>();
        logs.forEach(log => {
          if (log.foods && log.foods.length > 0) {
            const mealStr = log.foods.map(f => f.name).join(' + ');
            if (mealStr.trim().length > 0) {
              uniqueMeals.add(mealStr);
            }
          }
        });
        setRecentMeals(Array.from(uniqueMeals).slice(0, 3));
      } catch (err) {
        console.warn("Failed to load recents for quick chips:", err);
      }
    }
    loadRecent();
  }, [isParsing]);

  // Rotate placeholders every 3 seconds if empty
  useEffect(() => {
    if (input) return;
    const interval = setInterval(() => {
      setPlaceholderIndex((current) => (current + 1) % placeholderExamples.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [input]);

  // Premium Clipboard Paste Listener
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      
      for (const item of items) {
        if (item.type.indexOf("image") === 0) {
          const file = item.getAsFile();
          if (file) {
            toast.success("Image pasted from clipboard!");
            processFile(file);
            break;
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [isParsing]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (input.trim() && !isParsing) {
      if (onStateChange) onStateChange('analyzing');
      onParse(input);
      setInput(''); // clear after sending
    }
  };

  const {
    filteredSuggestions,
    selectedSuggestionIndex,
    handleSelectSuggestion,
    handleKeyDown
  } = useAutocomplete(input, setInput, () => handleSubmit());

  const handleVoiceClick = () => {
    alert("Voice logging coming soon.");
  };

  const handlePhotoClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const compressImageMainThread = async (
    file: File, 
    maxDimension = 768, 
    quality = 0.72
  ): Promise<{ data: string; mimeType: string; blob: Blob }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not acquire 2D context from canvas"));
          return;
        }

        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("Canvas to blob conversion failed"));
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            const base64String = reader.result as string;
            const match = base64String.match(/^data:(image\/jpeg);base64,(.+)$/);
            if (match) {
              resolve({ data: match[2], mimeType: match[1], blob });
            } else {
              reject(new Error("Failed to parse optimized image data"));
            }
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        }, "image/jpeg", quality);
      };
      img.onerror = (err) => {
        URL.revokeObjectURL(img.src);
        reject(err);
      };
    });
  };

  const processFile = (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Unsupported file format. Please upload JPEG, PNG, or WebP.");
      return;
    }

    const MAX_SIZE = 15 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error("File is too large. Maximum size is 15MB.");
      return;
    }

    if (isParsing) return;

    const previewUrl = URL.createObjectURL(file);
    if (onStateChange) onStateChange('compressing');

    const runMainThreadFallback = () => {
      if (onStateChange) onStateChange('compressing');
      compressImageMainThread(file).then(({ data, mimeType, blob }) => {
        if (onStateChange) onStateChange('uploading');
        onParse("", { data, mimeType }, previewUrl, blob);
      }).catch(err => {
        console.error("Main thread compression fallback failed, using raw upload:", err);
        const reader = new FileReader();
        reader.onload = () => {
          const base64String = reader.result as string;
          const match = base64String.match(/^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/);
          if (match) {
            if (onStateChange) onStateChange('uploading');
            onParse("", { data: match[2], mimeType: match[1] }, previewUrl, file);
          }
        };
        reader.readAsDataURL(file);
      });
    };

    try {
      const worker = new Worker(
        new URL('../../workers/imageCompression.worker.ts', import.meta.url),
        { type: 'module' }
      );

      worker.postMessage({
        file,
        maxDimension: 768,
        quality: 0.72
      });

      worker.onmessage = (e: MessageEvent) => {
        const { success, blob, error } = e.data;
        worker.terminate();

        if (success && blob) {
          const reader = new FileReader();
          reader.onload = () => {
            const base64String = reader.result as string;
            const match = base64String.match(/^data:(image\/jpeg);base64,(.+)$/);
            if (match) {
              const mimeType = match[1];
              const data = match[2];
              if (onStateChange) onStateChange('uploading');
              onParse("", { data, mimeType }, previewUrl, blob);
            } else {
              toast.error("Failed to parse optimized image data.");
              if (onStateChange) onStateChange('error');
              URL.revokeObjectURL(previewUrl);
            }
          };
          reader.readAsDataURL(blob);
        } else {
          console.warn("Worker compression failed, trying fallback:", error);
          runMainThreadFallback();
        }
      };

      worker.onerror = (err) => {
        console.error("Worker crash, trying fallback:", err);
        worker.terminate();
        runMainThreadFallback();
      };

    } catch (workerErr) {
      console.error("Failed to spawn worker, trying fallback:", workerErr);
      runMainThreadFallback();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
      e.target.value = '';
    }
  };

  const hasInput = input.trim().length > 0;

  return (
    <div className="relative w-full max-w-2xl mx-auto rounded-3xl bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 shadow-2xl overflow-hidden p-1 transition-all duration-300 hover:border-zinc-700 hover:shadow-cyan-900/20">
      
      {/* Background glowing effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none" />

      <form onSubmit={handleSubmit} className="relative flex flex-col h-full z-10">
        
        {/* Animated Placeholder Layer (Increased high-contrast opacity to 0.85) */}
        {!input && !isParsing && (
          <div className="absolute top-[22px] left-5 pointer-events-none overflow-hidden h-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={placeholderIndex}
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 0.85 }}
                exit={{ y: -15, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="text-base text-zinc-400"
              >
                {placeholderExamples[placeholderIndex]}
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          disabled={isParsing}
          className="w-full bg-transparent border-none resize-none outline-none text-base text-zinc-100 placeholder-transparent px-5 pt-[22px] pb-3 min-h-[80px]"
          placeholder="What did you eat today?"
          onKeyDown={handleKeyDown}
        />

        {/* Smart Quick Add Chips Panel (Surfaced when empty or focused) */}
        <AnimatePresence>
          {isFocused && !hasInput && !isParsing && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="px-5 pb-3 flex flex-col space-y-2"
            >
              {/* Popular categories */}
              <div className="flex items-center gap-1 text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
                <Sparkles size={10} className="text-cyan-500" />
                <span>Quick Add Categories</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "🍳 Breakfast", text: "2 Scrambled Eggs + Whole Wheat Toast" },
                  { label: "🥗 Healthy Lunch", text: "Grilled Chicken Breast Salad" },
                  { label: "🥤 Protein Shake", text: "1 Scoop Whey Protein + Milk" },
                  { label: "🍎 Fruit Snack", text: "1 Apple + Almonds" }
                ].map(item => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setInput(item.text);
                      textareaRef.current?.focus();
                    }}
                    className="text-[11px] bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 hover:border-cyan-500/50 px-2.5 py-1.5 rounded-xl text-zinc-300 hover:text-white transition-all flex items-center gap-1 shadow-sm"
                  >
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Recents list if available */}
              {recentMeals.length > 0 && (
                <>
                  <div className="flex items-center gap-1 text-[10px] text-zinc-500 uppercase tracking-wider font-bold pt-1.5">
                    <Clock size={10} className="text-purple-400" />
                    <span>Recent meals</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {recentMeals.map((meal, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          setInput(meal);
                          textareaRef.current?.focus();
                        }}
                        className="text-left text-[11px] bg-zinc-950/40 hover:bg-zinc-800 border border-zinc-800/40 hover:border-purple-500/40 px-3 py-2 rounded-xl text-zinc-400 hover:text-white transition-all flex items-center justify-between"
                      >
                        <span className="truncate">{meal}</span>
                        <Plus size={10} className="text-zinc-500" />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Autocomplete Dropdown list (Surface clear selected hover outlines) */}
        <AnimatePresence>
          {filteredSuggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mx-4 mb-3 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-xl z-50 overflow-hidden max-h-48 overflow-y-auto"
            >
              <div className="px-4 py-2 border-b border-zinc-800/40 bg-zinc-900/30 flex items-center justify-between">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold flex items-center gap-1">
                  <Sparkles size={10} className="text-cyan-400" />
                  Smart Suggestions
                </span>
                <span className="text-[9px] text-zinc-600 font-medium">Use ↑ ↓ and Enter</span>
              </div>
              {filteredSuggestions.map((suggestion, index) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className={`w-full text-left px-4 py-3 transition text-xs flex items-center space-x-2 border-l-2 ${
                    index === selectedSuggestionIndex
                      ? 'bg-cyan-600/20 text-cyan-300 border-l-2 border-cyan-400 outline-none ring-1 ring-cyan-500/20'
                      : 'text-zinc-200 hover:bg-zinc-800 border-l-2 border-transparent'
                  }`}
                >
                  <Flame size={11} className={index === selectedSuggestionIndex ? 'text-cyan-300' : 'text-zinc-500'} />
                  <span>{suggestion}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between p-3 bg-zinc-900/80 rounded-2xl m-2">
          
          <div className="flex items-center space-x-2">
            <input 
              type="file" 
              accept="image/jpeg,image/png,image/webp" 
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
              title="Upload Food Capture"
            >
              <Camera size={20} />
            </button>
            {onImportMenu && (
              <button
                type="button"
                onClick={onImportMenu}
                className="p-2 rounded-xl text-zinc-400 hover:text-purple-400 hover:bg-zinc-800 transition-colors"
                title="Import Weekly Menu (PDF/Excel)"
              >
                <FileText size={20} />
              </button>
            )}
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

             {/* Send Button: Dominated Visual Hierarchy, pulsing and glowing on valid content */}
             <button
                type="submit"
                disabled={!hasInput || isParsing}
                className={`p-3 text-white rounded-xl shadow-lg transition-all duration-300 flex items-center justify-center shrink-0 cursor-pointer ${
                  hasInput && !isParsing 
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 shadow-cyan-500/25 hover:shadow-cyan-400/40 hover:scale-105 animate-pulse' 
                    : 'bg-zinc-800 text-zinc-500 border border-zinc-700/40 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed'
                }`}
              >
                <Send size={18} className={hasInput && !isParsing ? 'opacity-100' : 'opacity-70'} />
              </button>
          </div>

        </div>
      </form>
    </div>
  );
}
