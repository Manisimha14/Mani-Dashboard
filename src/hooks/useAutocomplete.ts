import { useState, useEffect, useRef, useMemo } from 'react';
import { getSuggestions } from '../lib/suggestionEngine';
import { mealRepository, type MealLog } from '../lib/mealRepository';

export function useAutocomplete(input: string, setInput: (val: string) => void, handleSubmit: (e: any) => void) {
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [mealHistory, setMealHistory] = useState<MealLog[]>([]);
  const [precomputedCoOccurrences, setPrecomputedCoOccurrences] = useState<string[]>([]);
  
  // High-performance Query Memoization cache (Prevents redundant CPU computations)
  const queryCache = useRef<Map<string, string[]>>(new Map());

  // Load and subscribe to async IndexedDB meal logs
  useEffect(() => {
    async function loadHistory() {
      try {
        const logs = await mealRepository.getMealLogs();
        setMealHistory(logs);
        // Reset query cache upon new meal saves
        queryCache.current.clear();
      } catch (err) {
        console.error("IndexedDB loading failed, falling back to empty:", err);
      }
    }
    loadHistory();
  }, [input === '']); // Reload history whenever input gets cleared after save

  const getLastQueryPart = (text: string) => {
    if (!text.trim()) return '';
    const separators = /(?:,|\+|\sand\s)/i;
    const parts = text.split(separators);
    return parts[parts.length - 1].trim();
  };

  // Fetch precomputed co-occurrences asynchronously for the typed text
  useEffect(() => {
    const separators = /(?:,|\+|\sand\s)/i;
    const parts = input.split(separators);
    if (parts.length > 1) {
      // Find the second-to-last item to lookup pairing suggestions
      const previousItem = parts[parts.length - 2].trim();
      if (previousItem) {
        mealRepository.getCoOccurrences(previousItem).then(setPrecomputedCoOccurrences);
      }
    } else {
      setPrecomputedCoOccurrences([]);
    }
  }, [input]);

  // Debounced, Cached Combined Autocomplete Engine
  useEffect(() => {
    const lastPart = getLastQueryPart(input);

    const isReady = 
      lastPart.length >= 2 || 
      input.trim().endsWith('+') || 
      input.trim().endsWith(',') || 
      input.trim().toLowerCase().endsWith('and');

    if (!isReady) {
      setFilteredSuggestions([]);
      return;
    }

    const cacheKey = `${lastPart}_${precomputedCoOccurrences.join(',')}_${mealHistory.length}`;
    if (queryCache.current.has(cacheKey)) {
      setFilteredSuggestions(queryCache.current.get(cacheKey)!);
      setSelectedSuggestionIndex(-1);
      return;
    }

    // 150ms Adaptive debounce to avoid blocking typing frames
    const timer = setTimeout(() => {
      const suggestions = getSuggestions(
        input,
        lastPart,
        mealHistory,
        new Date().getHours(),
        precomputedCoOccurrences
      );
      
      // Cache results
      queryCache.current.set(cacheKey, suggestions);
      setFilteredSuggestions(suggestions);
      setSelectedSuggestionIndex(-1);
    }, 150);

    return () => clearTimeout(timer);
  }, [input, mealHistory, precomputedCoOccurrences]);

  const handleSelectSuggestion = (suggestion: string) => {
    const separators = /(?:,|\+|\sand\s)/i;
    const parts = input.split(separators);

    parts[parts.length - 1] = suggestion;

    const rebuilt = parts.join(' + ');

    setInput(rebuilt + ' ');
    setFilteredSuggestions([]);
    setSelectedSuggestionIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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

      if (e.key === 'Escape') {
        e.preventDefault();
        setFilteredSuggestions([]);
        setSelectedSuggestionIndex(-1);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return {
    filteredSuggestions,
    selectedSuggestionIndex,
    setSelectedSuggestionIndex,
    handleSelectSuggestion,
    handleKeyDown
  };
}
