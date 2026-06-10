import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, FileText, Upload, Sparkles, ChevronDown, ChevronUp,
  Check, Minus, Plus, Calendar, Coffee, Sun, Moon,
  AlertTriangle, Loader2, FileSpreadsheet, Image, Copy
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ImportedDish = {
  id: string;
  name: string;
  quantity: number | string;
  unit: string;
  selected: boolean;
};

export type ImportedMealSlot = {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  dishes: ImportedDish[];
};

export type ImportedDay = {
  dayName: string;       // e.g. "Monday"
  dayDate?: string;      // e.g. "2024-06-10" if parseable
  meals: ImportedMealSlot[];
  expanded: boolean;
};

type ImportPhase = 'idle' | 'reading' | 'analyzing' | 'ready' | 'error';

type ImportMenuModalProps = {
  onClose: () => void;
  onLogDay: (dayName: string, mealType: string, dishes: ImportedDish[]) => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MEAL_ICONS: Record<string, React.ReactNode> = {
  breakfast: <Coffee size={14} className="text-amber-400" />,
  lunch:     <Sun     size={14} className="text-yellow-400" />,
  dinner:    <Moon    size={14} className="text-indigo-400" />,
  snack:     <Sparkles size={14} className="text-pink-400" />,
};

const MEAL_COLORS: Record<string, string> = {
  breakfast: 'from-amber-500/10 to-orange-500/5 border-amber-500/20',
  lunch:     'from-yellow-500/10 to-green-500/5 border-yellow-500/20',
  dinner:    'from-indigo-500/10 to-purple-500/5 border-indigo-500/20',
  snack:     'from-pink-500/10 to-rose-500/5 border-pink-500/20',
};

const MEAL_BADGE: Record<string, string> = {
  breakfast: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  lunch:     'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  dinner:    'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  snack:     'bg-pink-500/20 text-pink-300 border-pink-500/30',
};

// ─── Extract text from uploaded file ─────────────────────────────────────────

async function extractTextFromFile(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'pdf') {
    // Lazy-import pdfjs-dist
    const pdfjsLib = await import('pdfjs-dist');
    // Use the bundled worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      fullText += content.items.map((item: any) => item.str).join(' ') + '\n';
    }
    return fullText;
  }

  if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
    const XLSX = await import('xlsx');
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    let text = '';
    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      text += `Sheet: ${sheetName}\n`;
      text += XLSX.utils.sheet_to_csv(sheet) + '\n\n';
    });
    return text;
  }

  // Plain text / CSV fallback
  return await file.text();
}

// ─── Call AI to parse weekly menu ────────────────────────────────────────────

async function parseWeeklyMenuWithAI(
  rawText: string
): Promise<ImportedDay[]> {
  const { data, error } = await supabase.functions.invoke('parse-food', {
    body: {
      input: rawText,
      importMode: 'weekly_menu',
    },
  });

  if (error) throw new Error(error.message || 'AI parsing failed');
  if (data?.error) throw new Error(data.error);
  if (!data?.weeklyMenu) throw new Error('No weekly menu returned from AI');

  // Map AI response to our typed structure
  const mappedDays = (data.weeklyMenu as any[]).map((day: any, di: number): ImportedDay => ({
    dayName: day.day || `Day ${di + 1}`,
    dayDate: day.date,
    expanded: false,
    meals: (day.meals || []).map((meal: any): ImportedMealSlot => ({
      mealType: meal.mealType || 'snack',
      dishes: (meal.dishes || []).map((dish: any, idx: number): ImportedDish => ({
        id: `${di}-${meal.mealType}-${idx}`,
        name: dish.name || 'Unknown dish',
        quantity: Number(dish.quantity) || 1,
        unit: dish.unit || 'serving',
        selected: true,
      })),
    })).filter((m: ImportedMealSlot) => m.dishes.length > 0),
  }));

  // Auto-expand today's day of the week
  const todayDayStr = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const todayDayShort = todayDayStr.slice(0, 3);
  let todayIndex = mappedDays.findIndex(d => {
    const name = d.dayName.toLowerCase();
    return name.includes(todayDayStr) || name.startsWith(todayDayShort);
  });
  if (todayIndex === -1) todayIndex = 0; // Fallback to first day
  if (mappedDays[todayIndex]) {
    mappedDays[todayIndex].expanded = true;
  }

  return mappedDays;
}

// ─── Main Modal Component ─────────────────────────────────────────────────────

const getStepAndMinForUnit = (unit: string) => {
  const u = unit.toLowerCase();
  if (u === 'g' || u === 'ml') {
    return { step: 50, min: 10 };
  }
  if (u === 'piece' || u === 'packet') {
    return { step: 1, min: 0.5 };
  }
  return { step: 0.5, min: 0.25 };
};

const getFallbackForUnit = (unit: string) => {
  const u = unit.toLowerCase();
  if (u === 'g' || u === 'ml') return 100;
  if (u === 'piece' || u === 'packet') return 1;
  return 1;
};

export function ImportMenuModal({ onClose, onLogDay }: ImportMenuModalProps) {
  const [phase, setPhase] = useState<ImportPhase>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [days, setDays] = useState<ImportedDay[]>([]);
  const [fileName, setFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);

  // Load menu from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('weekly_menu');
    if (stored) {
      try {
        const { days: storedDays, fileName: storedFileName, uploadedAt } = JSON.parse(stored);
        const uploadDate = new Date(uploadedAt);
        const now = new Date();
        const diffMs = now.getTime() - uploadDate.getTime();
        const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
        if (diffMs < oneWeekMs && storedDays && storedDays.length > 0) {
          setDays(storedDays);
          setFileName(storedFileName || 'Stored Weekly Menu');
          setPhase('ready');
        } else {
          localStorage.removeItem('weekly_menu');
        }
      } catch (e) {
        console.error('Error loading stored menu:', e);
      }
    }
  }, []);

  // Save/sync menu to localStorage when ready
  useEffect(() => {
    if (phase === 'ready' && days.length > 0) {
      const stored = localStorage.getItem('weekly_menu');
      let uploadedAt = new Date().toISOString();
      if (stored) {
        try {
          const parsedStored = JSON.parse(stored);
          if (parsedStored.uploadedAt) {
            uploadedAt = parsedStored.uploadedAt;
          }
        } catch (e) {}
      }
      localStorage.setItem(
        'weekly_menu',
        JSON.stringify({
          days,
          fileName,
          uploadedAt,
        })
      );
    }
  }, [days, phase, fileName]);

  // Auto-scroll to current day card when analysis completes (only once per upload/load)
  useEffect(() => {
    if (phase === 'ready' && days.length > 0 && !hasScrolledRef.current) {
      const todayDayStr = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const todayDayShort = todayDayStr.slice(0, 3);
      const todayIndex = days.findIndex(d => {
        const name = d.dayName.toLowerCase();
        return name.includes(todayDayStr) || name.startsWith(todayDayShort);
      });
      const activeIndex = todayIndex !== -1 ? todayIndex : 0;
      
      setTimeout(() => {
        const container = bodyRef.current;
        const el = document.getElementById(`day-card-${activeIndex}`);
        if (container && el) {
          const containerTop = container.getBoundingClientRect().top;
          const elTop = el.getBoundingClientRect().top;
          const scrollTop = container.scrollTop;
          const targetScrollTop = scrollTop + (elTop - containerTop) - (container.clientHeight / 2) + (el.clientHeight / 2);
          
          container.scrollTo({
            top: targetScrollTop,
            behavior: 'smooth'
          });
          hasScrolledRef.current = true;
        }
      }, 300);
    }
  }, [phase, days]);

  useEffect(() => {
    if (phase !== 'ready') {
      hasScrolledRef.current = false;
    }
  }, [phase]);

  // ── File processing ──────────────────────────────────────────────────────

  const processFile = async (file: File) => {
    const DOC_TYPES = ['pdf', 'xlsx', 'xls', 'csv', 'txt'];
    const ext = (file.name.split('.').pop()?.toLowerCase() || '');
    const isDoc = DOC_TYPES.includes(ext);

    if (!isDoc) {
      toast.error('Unsupported file. Upload a PDF, Excel, CSV, or TXT.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error('File too large. Maximum is 20MB.');
      return;
    }

    setFileName(file.name);
    setErrorMsg('');
    setPhase('reading');

    try {
      // Document path: extract text first, then AI
      const rawText = await extractTextFromFile(file);
      if (!rawText.trim()) throw new Error('File appears to be empty or unreadable.');
      setPhase('analyzing');
      const parsed = await parseWeeklyMenuWithAI(rawText);
      if (!parsed.length) throw new Error('No meals were detected. Please check the file format.');
      
      // Save to localStorage immediately upon successful AI parse
      const payload = {
        days: parsed,
        fileName: file.name,
        uploadedAt: new Date().toISOString()
      };
      localStorage.setItem('weekly_menu', JSON.stringify(payload));
      
      setDays(parsed);
      setPhase('ready');
    } catch (err: any) {
      console.error('Menu import error:', err);
      setErrorMsg(err.message || 'Failed to analyze menu.');
      setPhase('error');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  // ── Day/dish state manipulation ──────────────────────────────────────────

  const toggleDay = (di: number) => {
    setDays(prev => prev.map((d, i) => i === di ? { ...d, expanded: !d.expanded } : d));
  };

  const toggleDish = (di: number, mi: number, idx: number) => {
    setDays(prev => prev.map((d, i) => {
      if (i !== di) return d;
      return {
        ...d,
        meals: d.meals.map((m, j) => {
          if (j !== mi) return m;
          return {
            ...m,
            dishes: m.dishes.map((dish, k) =>
              k === idx ? { ...dish, selected: !dish.selected } : dish
            ),
          };
        }),
      };
    }));
  };

  const updateQuantity = (di: number, mi: number, idx: number, deltaDirection: number) => {
    setDays(prev => prev.map((d, i) => {
      if (i !== di) return d;
      return {
        ...d,
        meals: d.meals.map((m, j) => {
          if (j !== mi) return m;
          return {
            ...m,
            dishes: m.dishes.map((dish, k) => {
              if (k !== idx) return dish;
              const { step, min } = getStepAndMinForUnit(dish.unit);
              const delta = deltaDirection * step;
              const currentQty = typeof dish.quantity === 'number' ? dish.quantity : parseFloat(dish.quantity) || 0;
              return { ...dish, quantity: Math.max(min, Math.round((currentQty + delta) * 100) / 100) };
            }),
          };
        }),
      };
    }));
  };

  const setQuantityDirect = (di: number, mi: number, idx: number, val: string) => {
    setDays(prev => prev.map((d, i) => {
      if (i !== di) return d;
      return {
        ...d,
        meals: d.meals.map((m, j) => {
          if (j !== mi) return m;
          return {
            ...m,
            dishes: m.dishes.map((dish, k) =>
              k === idx ? { ...dish, quantity: val } : dish
            ),
          };
        }),
      };
    }));
  };

  const selectAllInMeal = (di: number, mi: number, selected: boolean) => {
    setDays(prev => prev.map((d, i) => {
      if (i !== di) return d;
      return {
        ...d,
        meals: d.meals.map((m, j) => {
          if (j !== mi) return m;
          return { ...m, dishes: m.dishes.map(dish => ({ ...dish, selected })) };
        }),
      };
    }));
  };

  const logMeal = (day: ImportedDay, meal: ImportedMealSlot) => {
    const selected = meal.dishes.filter(d => d.selected);
    if (!selected.length) {
      toast.error('No dishes selected for this meal.');
      return;
    }
    const cleanSelected = selected.map(d => {
      const q = typeof d.quantity === 'number' ? d.quantity : parseFloat(d.quantity);
      return {
        ...d,
        quantity: isNaN(q) || q <= 0 ? getFallbackForUnit(d.unit) : q
      };
    });
    onLogDay(day.dayName, meal.mealType, cleanSelected);
    toast.success(`${day.dayName} ${meal.mealType} logged! 🎉`);
    // Mark as logged by deselecting all
    setDays(prev => prev.map(d => {
      if (d.dayName !== day.dayName) return d;
      return {
        ...d,
        meals: d.meals.map(m => {
          if (m.mealType !== meal.mealType) return m;
          return { ...m, dishes: m.dishes.map(dish => ({ ...dish, selected: false })) };
        }),
      };
    }));
  };

  const handleCopySelected = () => {
    const lines: string[] = [];
    days.forEach(day => {
      const dayLines: string[] = [];
      day.meals.forEach(meal => {
        const selectedDishes = meal.dishes.filter(d => d.selected);
        if (selectedDishes.length > 0) {
          const dishStr = selectedDishes
            .map(d => `${d.quantity} ${d.unit} ${d.name}`)
            .join(', ');
          const mealLabel = meal.mealType.charAt(0).toUpperCase() + meal.mealType.slice(1);
          dayLines.push(`  * ${mealLabel}: ${dishStr}`);
        }
      });
      
      if (dayLines.length > 0) {
        lines.push(`--- ${day.dayName} ---`);
        lines.push(...dayLines);
        lines.push('');
      }
    });

    if (lines.length === 0) {
      toast.error('No dishes are currently selected to copy.');
      return;
    }

    const textToCopy = lines.join('\n').trim();
    navigator.clipboard.writeText(textToCopy)
      .then(() => toast.success('Selected menu copied to clipboard! 📋'))
      .catch(() => toast.error('Failed to copy to clipboard.'));
  };

  const handleCopyDay = (day: ImportedDay) => {
    const lines: string[] = [];
    day.meals.forEach(meal => {
      const selectedDishes = meal.dishes.filter(d => d.selected);
      if (selectedDishes.length > 0) {
        const dishStr = selectedDishes
          .map(d => `${d.quantity} ${d.unit} ${d.name}`)
          .join(', ');
        const mealLabel = meal.mealType.charAt(0).toUpperCase() + meal.mealType.slice(1);
        lines.push(`${mealLabel}: ${dishStr}`);
      }
    });

    if (lines.length === 0) {
      toast.error(`No dishes are selected for ${day.dayName}.`);
      return;
    }

    const textToCopy = lines.join('\n');
    navigator.clipboard.writeText(textToCopy)
      .then(() => toast.success(`Selected dishes for ${day.dayName} copied! 📋`))
      .catch(() => toast.error('Failed to copy.'));
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.93, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.93, y: 20 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="w-full max-w-2xl h-[95vh] sm:h-auto sm:max-h-[90vh] flex flex-col bg-[#141417] border border-zinc-800 rounded-2xl sm:rounded-3xl shadow-[0_30px_80px_rgba(0,0,0,0.6)] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/20 flex items-center justify-center">
              <FileText size={18} className="text-cyan-400" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white tracking-tight">Import Weekly Menu</h2>
              <p className="text-[10px] text-zinc-500 mt-0.5">Upload PDF or Excel — AI detects days &amp; meals</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div ref={bodyRef} className="flex-1 overflow-y-auto">

          {/* ── Upload Zone (idle / error) ── */}
          <AnimatePresence mode="wait">
            {(phase === 'idle' || phase === 'error') && (
              <motion.div
                key="upload"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-6"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.xlsx,.xls,.csv,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-200
                    ${isDragging
                      ? 'border-cyan-400/60 bg-cyan-500/5 scale-[1.01]'
                      : 'border-zinc-700/60 hover:border-cyan-500/40 hover:bg-cyan-500/3'
                    }`}
                >
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 flex items-center justify-center">
                    <Upload size={28} className="text-cyan-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-white font-bold text-sm">Drop your weekly menu here</p>
                    <p className="text-zinc-500 text-xs mt-1">PDF, Excel (.xlsx/.xls), CSV, or plain text</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-center">
                    {[
                      { label: 'PDF', icon: null },
                      { label: 'XLSX', icon: null },
                      { label: 'CSV', icon: null },
                    ].map(fmt => (
                      <span key={fmt.label} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 flex items-center gap-1">
                        {fmt.icon}{fmt.label}
                      </span>
                    ))}
                  </div>
                </div>

                {phase === 'error' && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-3"
                  >
                    <AlertTriangle size={16} className="text-rose-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-rose-300 text-xs font-bold">Analysis Failed</p>
                      <p className="text-rose-400/70 text-xs mt-0.5">{errorMsg}</p>
                    </div>
                  </motion.div>
                )}

                <div className="mt-5 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/40">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-2">💡 Tips for best results</p>
                  <ul className="space-y-1 text-xs text-zinc-500">
                    <li>• Include day names (Monday, Tuesday…) or dates in the menu</li>
                    <li>• Label meals as Breakfast / Lunch / Dinner</li>
                    <li>• Quantities like "2 chapatis", "1 bowl dal" help the AI</li>
                  </ul>
                </div>
              </motion.div>
            )}

            {/* ── Reading / Analyzing Phase ── */}
            {(phase === 'reading' || phase === 'analyzing') && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-6 flex flex-col items-center justify-center gap-6 min-h-[300px]"
              >
                <div className="relative w-20 h-20">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 animate-pulse" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    {phase === 'reading' ? (
                      <FileSpreadsheet size={32} className="text-cyan-400" />
                    ) : (
                      <Sparkles size={32} className="text-purple-400 animate-spin-slow" />
                    )}
                  </div>
                  <svg className="absolute inset-0 w-full h-full animate-spin" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="36" fill="none" stroke="url(#importGrad)" strokeWidth="3"
                      strokeDasharray="150" strokeDashoffset="100" strokeLinecap="round" />
                    <defs>
                      <linearGradient id="importGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#22d3ee" />
                        <stop offset="100%" stopColor="#a855f7" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>

                <div className="text-center">
                  <p className="text-white font-black text-sm">
                    {phase === 'reading' ? `Reading "${fileName}"…` : 'AI is analyzing your menu…'}
                  </p>
                  <p className="text-zinc-500 text-xs mt-1">
                    {phase === 'reading'
                      ? 'Extracting text from file'
                      : 'Identifying days, meals, and dishes'}
                  </p>
                </div>

                <div className="flex flex-col gap-2 w-full max-w-sm">
                  {[
                    { label: 'Reading file', done: true },
                    { label: 'Scanning menu content', done: phase === 'analyzing' },
                    { label: 'AI detecting daily meal structure', done: false, active: phase === 'analyzing' },
                    { label: 'Mapping dishes & quantities', done: false },
                  ].map((step, i) => (
                    <div key={i} className={`flex items-center gap-2.5 text-xs transition-opacity duration-300 ${step.done ? 'opacity-100' : step.active ? 'opacity-100' : 'opacity-25'}`}>
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center border text-[8px] font-black shrink-0
                        ${step.done ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                          : step.active ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400'
                            : 'bg-white/5 border-white/10 text-white/20'}`}
                      >
                        {step.done ? '✓' : step.active ? <Loader2 size={8} className="animate-spin" /> : i + 1}
                      </div>
                      <span className={step.done ? 'text-emerald-400 font-semibold' : step.active ? 'text-white font-semibold' : 'text-white/30'}>
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Ready — Day/Meal Breakdown ── */}
            {phase === 'ready' && (
              <motion.div
                key="ready"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4 space-y-3"
              >
                {/* File pill */}
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-900/60 border border-zinc-800/40">
                  <div className="flex items-center gap-2">
                    <FileText size={13} className="text-cyan-400" />
                    <span className="text-xs text-zinc-300 font-medium truncate max-w-[200px]">{fileName}</span>
                  </div>
                  <button
                    onClick={() => {
                      localStorage.removeItem('weekly_menu');
                      setPhase('idle');
                      setDays([]);
                      setFileName('');
                    }}
                    className="text-xs text-zinc-500 hover:text-white transition-colors flex items-center gap-1"
                  >
                    <Upload size={10} /> Change file
                  </button>
                </div>

                {/* Summary bar */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Days', value: days.length, icon: '📅' },
                    { label: 'Meals', value: days.reduce((a, d) => a + d.meals.length, 0), icon: '🍽️' },
                    { label: 'Dishes', value: days.reduce((a, d) => a + d.meals.reduce((b, m) => b + m.dishes.length, 0), 0), icon: '🥘' },
                  ].map(stat => (
                    <div key={stat.label} className="flex flex-col items-center gap-0.5 sm:gap-1 py-2 sm:py-3 rounded-xl bg-zinc-900/50 border border-zinc-800/40">
                      <span className="text-base sm:text-lg">{stat.icon}</span>
                      <span className="text-base sm:text-lg font-black text-white">{stat.value}</span>
                      <span className="text-[8px] sm:text-[9px] text-zinc-500 uppercase tracking-widest font-bold">{stat.label}</span>
                    </div>
                  ))}
                </div>

                {/* Day-by-Day Breakdown */}
                {days.map((day, di) => (
                  <div key={di} id={`day-card-${di}`} className="rounded-2xl border border-zinc-800/60 overflow-hidden bg-zinc-900/30">
                    {/* Day Header */}
                    <button
                      onClick={() => toggleDay(di)}
                      className="w-full flex items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3 hover:bg-zinc-800/30 transition-colors group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/10 border border-cyan-500/20 flex items-center justify-center">
                          <Calendar size={14} className="text-cyan-400" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-black text-white">{day.dayName}</p>
                          <p className="text-[10px] text-zinc-500">
                            {day.meals.length} meal slot{day.meals.length !== 1 ? 's' : ''} · {' '}
                            {day.meals.reduce((a, m) => a + m.dishes.filter(d => d.selected).length, 0)} selected
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyDay(day);
                          }}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                          title="Copy this day's selections"
                        >
                          <Copy size={13} />
                        </button>
                        <motion.div
                          animate={{ rotate: day.expanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown size={16} className="text-zinc-500 group-hover:text-white transition-colors" />
                        </motion.div>
                      </div>
                    </button>

                    {/* Meal Slots */}
                    <AnimatePresence>
                      {day.expanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-3 pb-3 space-y-2.5">
                            {day.meals.map((meal, mi) => {
                              const selectedCount = meal.dishes.filter(d => d.selected).length;
                              const allSelected = selectedCount === meal.dishes.length;

                              return (
                                <div
                                  key={mi}
                                  className={`rounded-xl border bg-gradient-to-br ${MEAL_COLORS[meal.mealType] || MEAL_COLORS.snack} overflow-hidden`}
                                >
                                  {/* Meal type header */}
                                  <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      {MEAL_ICONS[meal.mealType]}
                                      <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full border ${MEAL_BADGE[meal.mealType] || MEAL_BADGE.snack} truncate`}>
                                        {meal.mealType}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => selectAllInMeal(di, mi, !allSelected)}
                                        className="text-[9px] sm:text-[10px] text-zinc-500 hover:text-white transition-colors"
                                      >
                                        {allSelected ? 'Deselect' : 'Select All'}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => logMeal(day, meal)}
                                        disabled={selectedCount === 0}
                                        className="px-2.5 sm:px-3 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[9px] sm:text-[10px] font-bold hover:bg-cyan-500/35 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                      >
                                        Log {selectedCount > 0 ? `(${selectedCount})` : ''}
                                      </button>
                                    </div>
                                  </div>

                                  {/* Dishes */}
                                  <div className="p-2 space-y-1.5">
                                    {meal.dishes.map((dish, idx) => (
                                      <div
                                        key={dish.id}
                                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-150
                                          ${dish.selected
                                            ? 'bg-white/5 border border-white/10'
                                            : 'bg-transparent border border-transparent opacity-40'
                                          }`}
                                      >
                                        {/* Checkbox */}
                                        <button
                                          type="button"
                                          onClick={() => toggleDish(di, mi, idx)}
                                          className={`w-5 h-5 rounded-lg shrink-0 border flex items-center justify-center transition-all touch-manipulation
                                            ${dish.selected
                                              ? 'bg-cyan-500 border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                                              : 'bg-transparent border-zinc-700 hover:border-zinc-500'
                                            }`}
                                        >
                                          {dish.selected && <Check size={11} className="text-white font-black" />}
                                        </button>

                                        {/* Dish name */}
                                        <span className="flex-1 text-xs text-zinc-200 font-medium truncate pr-1">{dish.name}</span>

                                        {/* Quantity stepper */}
                                        <div className="flex items-center gap-1 shrink-0 ml-auto bg-zinc-950/60 p-0.5 rounded-xl border border-zinc-800/80">
                                          <button
                                            type="button"
                                            onClick={() => updateQuantity(di, mi, idx, -1)}
                                            className="w-7 h-7 rounded-lg flex items-center justify-center bg-zinc-800/80 hover:bg-zinc-700 active:scale-95 text-zinc-300 hover:text-white transition-all touch-manipulation"
                                          >
                                            <Minus size={11} />
                                          </button>
                                          <input
                                            type="number"
                                            value={dish.quantity}
                                            onChange={e => setQuantityDirect(di, mi, idx, e.target.value)}
                                            className="w-11 text-center text-xs bg-transparent border-0 text-white font-bold py-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none"
                                            min={getStepAndMinForUnit(dish.unit).min}
                                            step={getStepAndMinForUnit(dish.unit).step}
                                          />
                                          <button
                                            type="button"
                                            onClick={() => updateQuantity(di, mi, idx, 1)}
                                            className="w-7 h-7 rounded-lg flex items-center justify-center bg-zinc-800/80 hover:bg-zinc-700 active:scale-95 text-zinc-300 hover:text-white transition-all touch-manipulation"
                                          >
                                            <Plus size={11} />
                                          </button>
                                        </div>
                                        <span className="text-[10px] text-zinc-400 w-10 text-left truncate font-semibold shrink-0 select-none">{dish.unit}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer (only in ready state) */}
        {phase === 'ready' && (
          <div className="shrink-0 px-6 py-4 border-t border-zinc-800/60 bg-zinc-900/50 flex items-center justify-between gap-3">
            <p className="text-xs text-zinc-500 hidden sm:block">
              Click <span className="text-cyan-400 font-bold">Log</span> on each meal to add to your tracker
            </p>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleCopySelected}
                className="px-4 py-2 rounded-xl border border-zinc-700 text-zinc-300 text-xs font-bold hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
              >
                <Copy size={13} /> Copy Selected
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
