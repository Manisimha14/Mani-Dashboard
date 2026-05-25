import React, { useState, useRef, useEffect } from 'react';
import { Mic, Camera, Send, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

type FoodInputProps = {
  onParse: (input: string, image?: { data: string; mimeType: string }, previewUrl?: string, rawBlob?: Blob) => void;
  isParsing: boolean;
  loadingMessage: string;
  onStateChange?: (state: 'idle' | 'compressing' | 'uploading' | 'analyzing' | 'refining' | 'done' | 'error') => void;
};

const placeholderExamples = [
  "2 chapatis + dal + rice...",
  "paneer biryani lunch...",
  "3 eggs and toast...",
  "poha and chai..."
];

const autocompleteSuggestions = [
  "2 Chapatis",
  "Paneer Biryani",
  "Egg Noodles",
  "Dal Tadka",
  "White Rice",
  "3 Boiled Eggs",
  "Poha and Chai",
  "Idli and Sambar",
  "Masala Dosa",
  "Oatmeal with Almonds",
  "Chicken Salad",
  "Greek Yogurt",
  "Butter Popcorn",
  "Whey Protein Shake",
  "Avocado Toast",
  "Samosa",
  "Upma",
  "Rotis",
  "Curd Rice",
  "Bhindi Masala"
];

export function FoodInput({ onParse, isParsing, loadingMessage, onStateChange }: FoodInputProps) {
  const [input, setInput] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getLastQueryPart = (text: string) => {
    if (!text.trim()) return '';

    const separators = /(?:,|\+|\sand\s)/i;
    const parts = text.split(separators);

    return parts[parts.length - 1].trim();
  };

  // Filter and smart rank autocomplete suggestions based on the last typed part
  useEffect(() => {
    const lastPart = getLastQueryPart(input);

    if (lastPart.length < 2) {
      setFilteredSuggestions([]);
      return;
    }

    const query = lastPart.toLowerCase();

    const ranked = autocompleteSuggestions
      .map(item => {
        const lower = item.toLowerCase();

        let score = 0;

        if (lower.startsWith(query)) score += 100;
        else if (lower.includes(query)) score += 50;

        const words = lower.split(' ');
        if (words.some(word => word.startsWith(query))) score += 30;

        return { item, score };
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map(x => x.item);

    setFilteredSuggestions(ranked);
    setSelectedSuggestionIndex(-1);
  }, [input]);

  const handleSelectSuggestion = (suggestion: string) => {
    const separators = /(?:,|\+|\sand\s)/i;
    const parts = input.split(separators);

    parts[parts.length - 1] = suggestion;

    const rebuilt = parts.join(' + ');

    setInput(rebuilt + ' ');
    setFilteredSuggestions([]);
    setSelectedSuggestionIndex(-1);
  };

  // Rotate placeholders every 3 seconds if empty
  useEffect(() => {
    if (input) return;
    const interval = setInterval(() => {
      setPlaceholderIndex((current) => (current + 1) % placeholderExamples.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [input]);

  // Premium Clipboard Paste Listener (World Class Desktop UX)
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isParsing) {
      if (onStateChange) onStateChange('analyzing');
      onParse(input);
      setInput(''); // clear after sending
    }
  };

  const handleVoiceClick = () => {
    alert("Voice logging coming soon.");
  };

  const handlePhotoClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Secure validation and high performance Web Worker compression
  const processFile = (file: File) => {
    // 1. Validation Checks (Security & Payloads)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Unsupported file format. Please upload JPEG, PNG, or WebP.");
      return;
    }

    const MAX_SIZE = 15 * 1024 * 1024; // 15MB max input size
    if (file.size > MAX_SIZE) {
      toast.error("File is too large. Maximum size is 15MB.");
      return;
    }

    if (isParsing) return;

    // 2. Set Optimistic State & Create Memory-Safe Object URL Preview
    const previewUrl = URL.createObjectURL(file);
    if (onStateChange) onStateChange('compressing');

    // 3. Spin up Web Worker for off-thread adaptive compression
    try {
      const worker = new Worker(
        new URL('../../workers/imageCompression.worker.ts', import.meta.url),
        { type: 'module' }
      );

      worker.postMessage({
        file,
        maxDimension: 768, // Optimal visual resolution for nutrition parsing models
        quality: 0.72
      });

      worker.onmessage = (e: MessageEvent) => {
        const { success, blob, error } = e.data;
        worker.terminate(); // terminate worker immediately to reclaim memory

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
          toast.error(error || "Image optimization failed.");
          if (onStateChange) onStateChange('error');
          URL.revokeObjectURL(previewUrl);
        }
      };

      worker.onerror = (err) => {
        console.error("Worker crash:", err);
        toast.error("Optimizing thread crashed. Using fallback...");
        worker.terminate();
        if (onStateChange) onStateChange('error');
        URL.revokeObjectURL(previewUrl);
      };

    } catch (workerErr) {
      console.error("Failed to spawn worker, fallback to direct reading:", workerErr);
      // Graceful fallback to raw reading in case of worker constraints
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
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
      e.target.value = ''; // Reset file input
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
            if (filteredSuggestions.length > 0) {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedSuggestionIndex(prev =>
                  prev < filteredSuggestions.length - 1 ? prev + 1 : 0
                );
                return;
              }

              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedSuggestionIndex(prev =>
                  prev > 0 ? prev - 1 : filteredSuggestions.length - 1
                );
                return;
              }

              if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
                e.preventDefault();
                handleSelectSuggestion(filteredSuggestions[selectedSuggestionIndex]);
                return;
              }
            }

            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />

        {/* Autocomplete Dropdown list */}
        <AnimatePresence>
          {filteredSuggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mx-4 mb-2 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-xl z-50 overflow-hidden max-h-48 overflow-y-auto"
            >
              {filteredSuggestions.map((suggestion, index) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className={`w-full text-left px-4 py-3 transition text-xs flex items-center space-x-2 border-l-2 ${
                    index === selectedSuggestionIndex
                      ? 'bg-cyan-600/20 text-cyan-300 border-l-2 border-cyan-400'
                      : 'text-zinc-200 hover:bg-zinc-800 border-l-2 border-transparent'
                  }`}
                >
                  <Sparkles size={12} className={index === selectedSuggestionIndex ? 'text-cyan-300' : 'text-zinc-500'} />
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
