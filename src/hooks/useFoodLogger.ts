import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { useAddMeal } from './useHealthQuery';
import { format } from 'date-fns';

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

export function useFoodLogger() {
  const [isParsing, setIsParsing] = useState(false);
  const [loadingStateMessage, setLoadingStateMessage] = useState('');
  const [parsedData, setParsedData] = useState<ParsedMealData | null>(null);
  const [metaData, setMetaData] = useState<ParseResultMeta | null>(null);
  const [rawInput, setRawInput] = useState('');
  
  const addMealMutation = useAddMeal();

  const parseFood = async (input: string, image?: { data: string; mimeType: string }) => {
    if (!input.trim() && !image) return;
    
    setIsParsing(true);
    setLoadingStateMessage(image ? 'Analyzing image...' : 'Analyzing your meal...');
    setRawInput(input || '[Scanned Image]');
    setParsedData(null);
    setMetaData(null);

    // Simulate step 2 of loading
    const timer = setTimeout(() => {
      setLoadingStateMessage('Estimating macros...');
    }, 1200);

    try {
      const { data, error } = await supabase.functions.invoke('parse-food', {
        body: { input, image }
      });

      if (error) throw error;
      
      if (data.data) {
        setParsedData(data.data);
        setMetaData(data.meta);
        
        if (data.data.confidence === 'low') {
           toast('Some assumptions were made. Please review before saving.', { icon: '⚠️' });
        }
      } else {
        throw new Error(data.error || 'Unknown parsing error');
      }

    } catch (err: any) {
      console.error('Error parsing food:', err);
      toast.error('Food parsing temporarily unavailable. Try again in a moment.');
    } finally {
      clearTimeout(timer);
      setIsParsing(false);
      setLoadingStateMessage('');
    }
  };

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
        calories: oldItem.calories * ratio,
        protein: oldItem.protein * ratio,
        carbs: oldItem.carbs * ratio,
        fat: oldItem.fat * ratio,
        fiber: oldItem.fiber * ratio,
      };
    }

    const newItems = [...parsedData.items];
    newItems[index] = adjustedItem;
    
    // Recalculate totals
    const newTotals = newItems.reduce((acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
      fiber: acc.fiber + item.fiber,
    }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

    setParsedData({
      ...parsedData,
      items: newItems,
      totals: newTotals
    });
  };

  const saveMeal = async () => {
    if (!parsedData) return;
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      // 1. Save meal_log
      const { data: logData, error: logError } = await supabase
        .from('meal_logs')
        .insert({
          user_id: userData.user.id,
          meal_type: parsedData.meal_type,
          raw_input: rawInput,
          total_calories: parsedData.totals.calories,
          protein: parsedData.totals.protein,
          carbs: parsedData.totals.carbs,
          fat: parsedData.totals.fat,
          fiber: parsedData.totals.fiber,
          confidence: parsedData.confidence,
          confidence_reason: parsedData.confidence_reason,
          ai_provider: metaData?.provider,
          ai_latency_ms: metaData?.latency_ms,
          raw_input_hash: metaData?.raw_input_hash,
          edited_by_user: true // Simplifying: if they see the confirm screen, they verified it. Can be more granular.
        })
        .select('id')
        .single();

      if (logError) throw logError;

      // 2. Save meal_items
      const itemsToInsert = parsedData.items.map(item => ({
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

      const { error: itemsError } = await supabase
        .from('meal_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // 3. Save to health_meals so it shows up in the Calorie Tracker dashboard widget
      const now = new Date();
      await addMealMutation.mutateAsync({
        date: format(now, 'yyyy-MM-dd'),
        time: format(now, 'HH:mm'),
        mealType: parsedData.meal_type as any, // 'breakfast' | 'lunch' | 'dinner' | 'snacks' | 'custom'
        name: parsedData.items.map(i => i.food_name).join(', '),
        calories: parsedData.totals.calories,
        protein: parsedData.totals.protein,
        carbs: parsedData.totals.carbs,
        fat: parsedData.totals.fat,
        fiber: parsedData.totals.fiber
      });

      toast.success('Meal saved successfully!');
      setParsedData(null);
      setRawInput('');
    } catch (err: any) {
      console.error('Error saving meal:', err);
      toast.error('Failed to save meal.');
    }
  };

  const cancel = () => {
    setParsedData(null);
    setRawInput('');
  };

  return {
    rawInput,
    isParsing,
    loadingStateMessage,
    parsedData,
    metaData,
    parseFood,
    updateItem,
    saveMeal,
    cancel
  };
}
