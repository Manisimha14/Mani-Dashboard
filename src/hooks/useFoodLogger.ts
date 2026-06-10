import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { useAddMeal, useHealthGoals } from './useHealthQuery';
import { format } from 'date-fns';
import { mealRepository } from '../lib/mealRepository';

export type FoodItem = {
  id?: string;
  food_name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  estimated: boolean;
};

export type ParsedMealData = {
  meal_type: string;
  confidence: 'high' | 'medium' | 'low';
  confidence_reason?: string;
  items: FoodItem[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
};

export type ParseResultMeta = {
  provider: 'groq' | 'gemini' | 'cache';
  latency_ms: number;
  raw_input_hash: string;
};

export type LoggerState = 'idle' | 'compressing' | 'uploading' | 'analyzing' | 'refining' | 'done' | 'error';

/**
 * Production-grade hook managing AI nutrition logger workflow.
 * Implements AbortController HTTP cancellations, sequence tracking,
 * typesafe exceptions, precision floating limits, and non-blocking background repositories.
 */
export function useFoodLogger() {
  const [loggerState, setLoggerState] = useState<LoggerState>('idle');
  const [loadingStateMessage, setLoadingStateMessage] = useState('');
  const [parsedData, setParsedData] = useState<ParsedMealData | null>(null);
  const [metaData, setMetaData] = useState<ParseResultMeta | null>(null);
  const [rawInput, setRawInput] = useState('');
  
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  
  const addMealMutation = useAddMeal();
  const { data: goals } = useHealthGoals();

  // 1. Production Refs for sequence and cancellation safety
  const activeRequestRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);
  const previewRef = useRef<string | null>(null);

  // Sync state preview to ref for safe blob revocations
  useEffect(() => {
    previewRef.current = imagePreviewUrl;
  }, [imagePreviewUrl]);

  // Clean timers and abort active requests on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const cleanupPreview = () => {
    if (previewRef.current && previewRef.current.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(previewRef.current);
      } catch (err) {
        console.warn("Failed to revoke blob preview URL:", err);
      }
    }
    previewRef.current = null;
    setImagePreviewUrl(null);
  };

  const parseFood = async (
    input: string, 
    image?: { data: string; mimeType: string }, 
    previewUrl?: string,
    rawBlob?: Blob,
    mealTypeOverride?: string
  ) => {
    if (!input.trim() && !image) return;

    // A. Abort any previous active parsing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // B. Sequence increment
    const requestId = ++activeRequestRef.current;
    
    setParsedData(null);
    setMetaData(null);
    setRawInput(input || '[Scanned Image]');
    setUploadedImageUrl(null); // Clean stale contamination from previous capture sessions

    if (previewUrl) {
      cleanupPreview();
      setImagePreviewUrl(previewUrl);
    }

    let imageUrl = null;
    if (rawBlob) {
      setLoggerState('uploading');
      setLoadingStateMessage('Storing image securely...');
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user && requestId === activeRequestRef.current) {
          const fileName = `${userData.user.id}/${Date.now()}.jpg`;
          const { error: uploadError } = await supabase
            .storage
            .from('food-images')
            .upload(fileName, rawBlob, {
              contentType: 'image/jpeg',
              cacheControl: '3600'
            });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage.from('food-images').getPublicUrl(fileName);
          imageUrl = publicUrl;
          
          if (requestId === activeRequestRef.current) {
            setUploadedImageUrl(publicUrl);
          }
        }
      } catch (storageErr) {
        console.warn("Storage upload failed or bucket 'food-images' doesn't exist yet:", storageErr);
      }
    }

    if (requestId !== activeRequestRef.current) return;

    setLoggerState('analyzing');
    setLoadingStateMessage(image ? 'AI identifying food...' : 'Analyzing your meal...');

    // Calculate timezone-agnostic meal pre-selection hint (respecting explicit override if provided)
    let mealTypeHint = mealTypeOverride;
    if (!mealTypeHint) {
      const hour = new Date().getHours();
      mealTypeHint = 'snack';
      if (hour >= 5 && hour < 11) mealTypeHint = 'breakfast';
      else if (hour >= 11 && hour < 16) mealTypeHint = 'lunch';
      else if (hour >= 16 && hour < 19) mealTypeHint = 'snack';
      else if (hour >= 19 && hour < 23) mealTypeHint = 'dinner';
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    
    // Sequence micro-animations to represent realistic steps
    let microStep = 0;
    const microSteps = image 
      ? ['AI scanning photo capture...', 'Identifying fresh ingredients...', 'Estimating portions and amounts...', 'Calibrating macro values...']
      : ['Analyzing meal composition...', 'Structuring ingredient entries...', 'Checking co-occurrences...', 'Calculating calorie ranges...'];
    
    const runMicroStates = () => {
      if (requestId === activeRequestRef.current && microStep < microSteps.length) {
        setLoadingStateMessage(microSteps[microStep]);
        if (microStep === 1) setLoggerState('analyzing');
        if (microStep === 3) setLoggerState('refining');
        microStep++;
        timerRef.current = setTimeout(runMicroStates, 1200) as any;
      }
    };
    runMicroStates();

    try {
      const { data, error } = await supabase.functions.invoke('parse-food', {
        body: { input, image, mealTypeHint },
        signal: abortController.signal
      });

      if (requestId !== activeRequestRef.current) return;
      if (error) throw error;
      
      if (data?.data) {
        setParsedData(data.data);
        setMetaData(data.meta);
        setLoggerState('done');
        
        if (data.data.confidence === 'low') {
           toast('Estimated with medium assumptions. Please review values.', { icon: '⚠️' });
        }
      } else {
        throw new Error(data?.error || 'Unknown parsing error');
      }

    } catch (err: any) {
      if (err?.name === 'AbortError') {
        console.log("Supabase parsing invoke cancelled by user abort.");
        return;
      }
      if (requestId === activeRequestRef.current) {
        console.error('Error parsing food:', err);
        setLoggerState('error');
        setLoadingStateMessage('Parsing failed. Try describing manually.');
        toast.error('Food parsing temporarily unavailable. Try again in a moment.');
        cleanupPreview();
      }
    } finally {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // Safe arithmetic rounding to prevent floating decimal precision drift (e.g. 14.3333333 kcal)
  const updateItem = (index: number, updatedItem: FoodItem) => {
    if (!parsedData) return;
    
    const oldItem = parsedData.items[index];
    const oldQuantity = oldItem.quantity;
    const newQuantity = updatedItem.quantity;
    
    let adjustedItem = { ...updatedItem };
    
    if (oldQuantity > 0 && newQuantity !== oldQuantity) {
      const ratio = newQuantity / oldQuantity;
      adjustedItem = {
        ...updatedItem,
        calories: Math.round(oldItem.calories * ratio * 10) / 10,
        protein: Math.round(oldItem.protein * ratio * 10) / 10,
        carbs: Math.round(oldItem.carbs * ratio * 10) / 10,
        fat: Math.round(oldItem.fat * ratio * 10) / 10,
        fiber: Math.round(oldItem.fiber * ratio * 10) / 10,
      };
    }

    const newItems = [...parsedData.items];
    newItems[index] = adjustedItem;
    
    const newTotals = newItems.reduce((acc, item) => ({
      calories: Math.round((acc.calories + item.calories) * 10) / 10,
      protein: Math.round((acc.protein + item.protein) * 10) / 10,
      carbs: Math.round((acc.carbs + item.carbs) * 10) / 10,
      fat: Math.round((acc.fat + item.fat) * 10) / 10,
      fiber: Math.round((acc.fiber + item.fiber) * 10) / 10,
    }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

    setParsedData({
      ...parsedData,
      items: newItems,
      totals: newTotals
    });
  };

  const saveMeal = async () => {
    if (!parsedData) return;
    
    // 1. Snapshot the current state variables for background execution
    const snapshotData = { ...parsedData };
    const snapshotInput = rawInput;
    const snapshotImageUrl = uploadedImageUrl;
    const snapshotProvider = metaData?.provider;
    const snapshotLatency = metaData?.latency_ms;
    const snapshotHash = metaData?.raw_input_hash;

    // 2. Optimistic UI transition: immediately clear states, close panels & show positive reinforcement toast!
    cleanupPreview();
    setParsedData(null);
    setRawInput('');
    setUploadedImageUrl(null);
    setLoggerState('idle');
    toast.success('Meal logged successfully!');

    // 3. Background execution chain
    (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        // A. Save to raw analytics tables (Resilient try/catch)
        try {
          const { data: logData, error: logError } = await supabase
            .from('meal_logs')
            .insert({
              user_id: userData.user.id,
              meal_type: snapshotData.meal_type,
              raw_input: snapshotInput,
              total_calories: snapshotData.totals.calories,
              protein: snapshotData.totals.protein,
              carbs: snapshotData.totals.carbs,
              fat: snapshotData.totals.fat,
              fiber: snapshotData.totals.fiber,
              confidence: snapshotData.confidence,
              confidence_reason: snapshotData.confidence_reason,
              ai_provider: snapshotProvider,
              ai_latency_ms: snapshotLatency,
              raw_input_hash: snapshotHash,
              edited_by_user: true,
              image_url: snapshotImageUrl
            })
            .select('id')
            .single();

          if (!logError && logData) {
            const itemsToInsert = snapshotData.items.map(item => ({
              meal_log_id: logData.id,
              food_name: item.food_name,
              quantity: item.quantity,
              unit: item.unit,
              calories: item.calories,
              protein: item.protein,
              carbs: item.carbs,
              fat: item.fat,
              fiber: item.fiber,
              estimated: item.estimated
            }));

            await supabase.from('meal_items').insert(itemsToInsert);
          }
        } catch (dbError) {
          console.warn("Advanced analytics logging bypassed or tables absent:", dbError);
        }

        // B. Save to primary health_meals dashboard table
        const now = new Date();
        const normalizedMealType = snapshotData.meal_type === 'snack' ? 'snacks' : snapshotData.meal_type;
        
        await addMealMutation.mutateAsync({
          date: format(now, 'yyyy-MM-dd'),
          time: format(now, 'HH:mm'),
          mealType: normalizedMealType as any,
          name: snapshotData.items.map(i => i.food_name).join(', '),
          calories: snapshotData.totals.calories,
          protein: snapshotData.totals.protein,
          carbs: snapshotData.totals.carbs,
          fat: snapshotData.totals.fat,
          fiber: snapshotData.totals.fiber
        });

        // C. Fire-and-forget IndexedDB update
        const foods = snapshotData.items.map(item => item.food_name);
        mealRepository.saveMeal(foods).catch(historyErr => {
          console.warn("Background auto-completion indexing bypassed:", historyErr);
        });

      } catch (err) {
        console.error('Background meal logging failed:', err);
      }
    })();
  };

  const askAICoach = async (
    chatQuery: string, 
    chatHistory: { role: 'user' | 'assistant'; content: string }[]
  ): Promise<string> => {
    try {
      const activeGoal = goals?.[0]?.label || 'General Health';
      const { data, error } = await supabase.functions.invoke('food-coach', {
        body: {
          chatQuery,
          chatHistory,
          mealData: parsedData,
          userGoal: activeGoal
        }
      });

      if (error) throw error;
      return data?.reply || "I couldn't generate advice right now.";
    } catch (err) {
      console.error("Coaching endpoint error:", err);
      return "I'm having trouble connecting to the coach database. Please verify that the 'food-coach' Edge Function is successfully deployed.";
    }
  };

  const cancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    cleanupPreview();
    setParsedData(null);
    setRawInput('');
    setUploadedImageUrl(null);
    setLoggerState('idle');
  };

  return {
    rawInput,
    isParsing: loggerState !== 'idle' && loggerState !== 'done' && loggerState !== 'error',
    loggerState,
    setLoggerState,
    loadingStateMessage,
    parsedData,
    metaData,
    imagePreviewUrl,
    parseFood,
    updateItem,
    saveMeal,
    askAICoach,
    cancel
  };
}
