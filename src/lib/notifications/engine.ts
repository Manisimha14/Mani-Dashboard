import type { ContextualMessage, NotificationState, NotificationTone, NotificationCategory } from './types';
import { WEATHER_POOL, SCORE_POOL, STREAK_POOL, TIME_POOL } from './pool';

const STORAGE_VERSION = 'v2';
const MEMORY_KEY = `contextual_messages_${STORAGE_VERSION}`;
const MAX_MEMORY = 8;

/**
 * SSR-safe localStorage access
 */
function getMemory(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(MEMORY_KEY) || '[]');
  } catch {
    return [];
  }
}

function persistMemory(newIds: string[]) {
  if (typeof window === 'undefined' || newIds.length === 0) return;
  const memory = getMemory();
  // Filter out duplicates and keep it fresh
  const updatedMemory = Array.from(new Set([...newIds, ...memory])).slice(0, MAX_MEMORY);
  localStorage.setItem(MEMORY_KEY, JSON.stringify(updatedMemory));
}

function seededPick<T extends { id: string; tone: NotificationTone }>(
  pool: T[], 
  seed: number, 
  memory: string[],
  humorLevel: 'minimal' | 'balanced' | 'chaotic'
): T | null {
  if (pool.length === 0) return null;

  // 1. Memory Filter: Avoid recently shown if we have other options
  let available = pool.filter(m => !memory.includes(m.id));
  
  // 2. Humor Level Filter
  if (humorLevel === 'minimal') {
    available = available.filter(m => m.tone !== 'fun');
  }

  // Fallback to full pool if filters left us empty
  const finalPool = available.length > 0 ? available : pool;
  
  const index = Math.abs(seed) % finalPool.length;
  return finalPool[index];
}

export function getContextualNotifications(state: NotificationState): ContextualMessage[] {
  const { weatherType, prodScore, readingStreak, codingStreak, focusStreak, hour, humorLevel } = state;
  const memory = getMemory();
  
  // Better deterministic seed (Day-based)
  const now = new Date();
  const dateSeed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  
  const results: ContextualMessage[] = [];
  const selectedCategories = new Set<NotificationCategory>();
  const selectedTones = new Set<NotificationTone>();

  /**
   * Selection logic: 
   * 1. Filter pool by metadata
   * 2. Deterministic pick
   * 3. Validate against tone balancing
   */
  const select = (pool: ContextualMessage[], categorySeed: number) => {
    const pick = seededPick(pool, dateSeed + categorySeed, memory, humorLevel);
    if (!pick) return;

    // Semantic de-duplication: One per category
    if (selectedCategories.has(pick.category)) return;

    // Tone balancing: Max 1 fun message in balanced mode
    if (humorLevel === 'balanced' && pick.tone === 'fun' && selectedTones.has('fun')) {
      // Try to find a non-fun alternative from the same pool
      const alt = pool.find(m => m.tone !== 'fun' && !memory.includes(m.id)) || pool.find(m => m.tone !== 'fun');
      if (alt) {
        results.push(alt);
        selectedCategories.add(alt.category);
        selectedTones.add(alt.tone);
      }
      return;
    }

    results.push(pick);
    selectedCategories.add(pick.category);
    selectedTones.add(pick.tone);
  };

  // ─── 1. Weather (Contextual) ───
  const wPool = WEATHER_POOL[weatherType] || WEATHER_POOL.sunny;
  select(wPool, 100);

  // ─── 2. Score (Metadata-driven) ───
  const sRange = prodScore === 0 ? 'zero' : prodScore <= 25 ? 'low' : prodScore <= 75 ? 'mid' : prodScore < 95 ? 'high' : 'god';
  const sPool = SCORE_POOL.filter(m => m.scoreRange === sRange);
  select(sPool, 200);

  // ─── 3. Time (Segment-driven) ───
  const tSegment = hour < 10 ? 'morning' : hour < 17 ? 'afternoon' : hour < 22 ? 'evening' : 'late';
  const tPool = TIME_POOL.filter(m => m.timeSegment === tSegment);
  select(tPool, 300);

  // ─── 4. Streak (Type-specific) ───
  const stPool: ContextualMessage[] = [];
  if (codingStreak > 5) stPool.push(...STREAK_POOL.filter(m => m.streakType === 'coding'));
  if (readingStreak > 5) stPool.push(...STREAK_POOL.filter(m => m.streakType === 'reading'));
  if (focusStreak > 5) stPool.push(...STREAK_POOL.filter(m => m.streakType === 'focus'));
  if (stPool.length === 0 && (codingStreak > 0 || readingStreak > 0 || focusStreak > 0)) {
    stPool.push(...STREAK_POOL.filter(m => m.streakType === 'any'));
  }
  select(stPool, 400);

  // ─── Final Processing ───
  
  // Sort by priority before trimming
  results.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  
  const finalMessages = results.slice(0, 3);
  
  // Batch write to memory
  persistMemory(finalMessages.map(m => m.id));

  return finalMessages;
}
