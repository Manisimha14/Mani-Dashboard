import { useState, useEffect, useRef, useCallback } from 'react';
import { getSuggestions } from '../lib/suggestionEngine';
import { mealRepository, type MealLog } from '../lib/mealRepository';

// Compile static, high-performance separating regular expressions outside hot execution path
const SEPARATORS = /(?:,|\+|\sand\s)/i;
const SEPARATORS_WITH_GROUPS = /((?:,|\+|\sand\s))/i;
const VISIBILITY_TRIGGER_REGEX = /(?:\+|,|\band\s*)$/i;

const MAX_CACHE_SIZE = 100;

export function useAutocomplete(
  input: string, 
  setInput: (val: string) => void, 
  handleSubmit: () => void
) {
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [mealHistory, setMealHistory] = useState<MealLog[]>([]);
  const [precomputedCoOccurrences, setPrecomputedCoOccurrences] = useState<string[]>([]);
  
  // High-performance Query Memoization cache (Prevents redundant CPU computations)
  const queryCache = useRef<Map<string, string[]>>(new Map());

  // Helper to extract last delimiter-separated phrase
  const getLastQueryPart = useCallback((text: string) => {
    if (!text.trim()) return '';
    const parts = text.split(SEPARATORS);
    return parts[parts.length - 1].trim();
  }, []);

  // 1. Reactive Subscription to IndexedDB updates (No more polling or false useEffect dependencies)
  useEffect(() => {
    async function loadHistory() {
      try {
        const logs = await mealRepository.getMealLogs();
        setMealHistory(logs);
        // Clear memoization cache upon fresh logs to ensure instant synchronization
        queryCache.current.clear();
      } catch (err) {
        console.error("IndexedDB loading failed, falling back to empty:", err);
      }
    }
    
    loadHistory();
    const unsubscribe = mealRepository.subscribe(loadHistory);
    return () => {
      unsubscribe();
    };
  }, []);

  // 2. Race-Condition Proof Co-occurrence Fetch
  useEffect(() => {
    const parts = input.split(SEPARATORS);
    if (parts.length > 1) {
      const previousItem = parts[parts.length - 2].trim();
      if (previousItem) {
        let active = true;
        mealRepository.getCoOccurrences(previousItem).then(result => {
          if (active) {
            setPrecomputedCoOccurrences(result);
          }
        });
        return () => {
          active = false;
        };
      }
    } else {
      setPrecomputedCoOccurrences([]);
    }
  }, [input]);

  // 3. Debounced, LRU Cached Suggestions Scorer
  useEffect(() => {
    const lastPart = getLastQueryPart(input);

    const isReady = 
      lastPart.length >= 2 || 
      VISIBILITY_TRIGGER_REGEX.test(input.trim());

    if (!isReady) {
      setFilteredSuggestions([]);
      return;
    }

    const currentVersion = mealRepository.getVersion();
    const cacheKey = `${lastPart}_${precomputedCoOccurrences.join(',')}_${currentVersion}`;
    
    // Serve from cache if entry already calculated
    if (queryCache.current.has(cacheKey)) {
      setFilteredSuggestions(queryCache.current.get(cacheKey)!);
      setSelectedSuggestionIndex(-1);
      return;
    }

    // 150ms Debouncer
    const timer = setTimeout(() => {
      const suggestions = getSuggestions(
        input,
        lastPart,
        mealHistory,
        new Date().getHours(),
        precomputedCoOccurrences
      );
      
      // LRU Eviction: Capping memoization cache to prevent memory leaks over time
      if (queryCache.current.size >= MAX_CACHE_SIZE) {
        const oldestKey = queryCache.current.keys().next().value;
        if (oldestKey !== undefined) {
          queryCache.current.delete(oldestKey);
        }
      }

      queryCache.current.set(cacheKey, suggestions);
      setFilteredSuggestions(suggestions);
      setSelectedSuggestionIndex(-1);
    }, 150);

    return () => clearTimeout(timer);
  }, [input, mealHistory, precomputedCoOccurrences, getLastQueryPart]);

  // 4. Exact Delimiter-Preserving Selection replacement (No more custom delimiter override mutations)
  const handleSelectSuggestion = useCallback((suggestion: string) => {
    const parts = input.split(SEPARATORS_WITH_GROUPS);
    
    // Replace only the final active typed token, preserving commas, plusses and delimiters intact
    parts[parts.length - 1] = ' ' + suggestion;

    setInput(parts.join('') + ' ');
    setFilteredSuggestions([]);
    setSelectedSuggestionIndex(-1);
  }, [input, setInput]);

  // 5. Typesafe, Closure-Safe Keyboard Navigation Handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
      handleSubmit();
    }
  }, [filteredSuggestions, selectedSuggestionIndex, handleSelectSuggestion, handleSubmit]);

  return {
    filteredSuggestions,
    selectedSuggestionIndex,
    setSelectedSuggestionIndex,
    handleSelectSuggestion,
    handleKeyDown
  };
}
