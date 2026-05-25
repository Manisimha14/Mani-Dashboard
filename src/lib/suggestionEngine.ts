import { type MealLog } from './mealRepository';

const STATIC_FALLBACK = [
  "2 Chapatis",
  "White Rice",
  "Dal Tadka",
  "Paneer Biryani",
  "Poha",
  "Idli Sambar",
  "Masala Dosa",
  "Greek Yogurt",
  "Oatmeal with Almonds",
  "Whey Protein Shake",
  "Chicken Salad",
  "Avocado Toast",
  "Samosa",
  "Bhindi Masala"
];

const DEFAULT_CO_OCCURRENCES: Record<string, string[]> = {
  "rice": ["Dal Tadka", "Sambar", "Rajma", "Curd", "Chicken Curry"],
  "white rice": ["Dal Tadka", "Sambar", "Rajma", "Curd", "Chicken Curry"],
  "chapati": ["Dal Tadka", "Bhindi Masala", "Paneer Butter Masala", "Curd"],
  "chapatis": ["Dal Tadka", "Bhindi Masala", "Paneer Butter Masala", "Curd"],
  "roti": ["Dal Tadka", "Bhindi Masala", "Paneer Butter Masala", "Curd"],
  "rotis": ["Dal Tadka", "Bhindi Masala", "Paneer Butter Masala", "Curd"],
  "poha": ["Chai", "Tea", "Lemon"],
  "idli": ["Sambar", "Coconut Chutney"],
  "dosa": ["Sambar", "Coconut Chutney", "Potato Masala"],
  "eggs": ["Toast", "Avocado", "Black Coffee"]
};

// Fast Levenshtein distance calculation for fuzzy matching
function levenshtein(a: string, b: string): number {
  const tmp: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    tmp[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    tmp[0][j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1,
        tmp[i][j - 1] + 1,
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return tmp[a.length][b.length];
}

/**
 * Extracts numeric quantity and the following query string from inputs like "2 ch"
 */
function parseQuantityAndQuery(input: string): { quantityPrefix: string; cleanQuery: string } {
  const quantityMatch = input.trim().match(/^(\d+(?:\.\d+)?\s*)(.*)$/);
  if (quantityMatch) {
    return {
      quantityPrefix: quantityMatch[1], // e.g. "2 "
      cleanQuery: quantityMatch[2].trim() // e.g. "ch"
    };
  }
  return { quantityPrefix: '', cleanQuery: input.trim() };
}

/**
 * Core Suggestions Engine: High-performance, memory-efficient combined ranking
 */
export function getSuggestions(
  input: string,
  lastQueryPart: string,
  mealLogs: MealLog[],
  currentHour: number,
  precomputedCoOccurrences: string[] = []
): string[] {
  const normalizedQuery = lastQueryPart.toLowerCase().trim();
  const scoreMap = new Map<string, number>();
  const frequencyMap = new Map<string, number>();

  // 1. Parse Quantity Prefixes (e.g., "2 ch")
  const { quantityPrefix, cleanQuery } = parseQuantityAndQuery(normalizedQuery);
  const searchTarget = cleanQuery || normalizedQuery;

  // 2. Pre-seed with fallback recommendations
  for (const fallback of STATIC_FALLBACK) {
    scoreMap.set(fallback, 10);
    frequencyMap.set(fallback, 1);
  }

  // Pre-extract matching set of clean inputs to prevent self-recommendations
  const existingFoodsInInput = input
    .split(/(?:,|\+|\sand\s)/i)
    .map(f => f.trim().toLowerCase())
    .filter(f => f.length > 0);
  if (normalizedQuery && existingFoodsInInput.length > 0) {
    existingFoodsInInput.pop();
  }

  // 3. Process meal logs to calculate frequency mapping first
  mealLogs.forEach(log => {
    log.foods.forEach(food => {
      const name = food.name;
      frequencyMap.set(name, (frequencyMap.get(name) || 0) + 1);
    });
  });

  // 4. Calculate signal scores for all historical logs
  mealLogs.forEach(log => {
    const ageDays = (Date.now() - log.timestamp) / (1000 * 60 * 60 * 24);
    const recencyBoost = Math.max(5, 40 - ageDays);

    // Circular Time affinity: Wraps properly around midnight (23 -> 1 is 2 hours difference)
    const logHour = new Date(log.timestamp).getHours();
    const hourDiff = Math.min(
      Math.abs(logHour - currentHour),
      24 - Math.abs(logHour - currentHour)
    );
    const timeAffinity = hourDiff <= 2 ? 30 : 0;

    const logFoodNames = log.foods.map(f => f.name.toLowerCase().trim());

    log.foods.forEach(food => {
      const name = food.name;
      const lower = name.toLowerCase().trim();
      let score = 0;

      // Direct Matches
      if (searchTarget) {
        let isMatched = false;
        
        // Exact prefix match
        if (lower.startsWith(searchTarget)) {
          score += 150;
          isMatched = true;
        } 
        // Substring match
        else if (lower.includes(searchTarget)) {
          score += 65;
          isMatched = true;
        }

        // Individual Word Match (e.g. "rice" matching "Brown Rice")
        const words = lower.split(/\s+/);
        if (words.some(word => word.startsWith(searchTarget))) {
          score += 35;
          isMatched = true;
        }

        // ─── OPTIMIZED SELECTIVE FUZZY LEVENSHTEIN ───
        // Only run expensive Levenshtein fuzzy match if query is long, AND prefix/substring failed
        if (!isMatched && searchTarget.length >= 4 && lower.length >= 4) {
          const distance = levenshtein(searchTarget, lower);
          if (distance <= 2) {
            score += 45;
          }
        }
      }

      // Quantity Intelligence: Match numeric prefixes (e.g. "2 ch" matches "2 Chapatis")
      if (quantityPrefix && normalizedQuery) {
        const itemQuantityMatch = name.match(/^(\d+(?:\.\d+)?)/);
        if (itemQuantityMatch && itemQuantityMatch[1]) {
          const prefixNumber = parseFloat(quantityPrefix);
          const itemNumber = parseFloat(itemQuantityMatch[1]);
          if (prefixNumber === itemNumber) {
            score += 60; // Huge score boost for quantity alignment
          }
        }
      }

      // Fuzzy / Semantic Co-occurrence inside logs
      if (existingFoodsInInput.length > 0) {
        const hasCoOccurred = existingFoodsInInput.some(existingFood => {
          return logFoodNames.some(logFood => 
            logFood.includes(existingFood) || existingFood.includes(logFood)
          ) && lower !== existingFood;
        });

        if (hasCoOccurred) {
          score += 85; // High co-occurrence match
        }
      }

      // Base context boosts
      score += recencyBoost;
      score += timeAffinity;

      scoreMap.set(name, (scoreMap.get(name) || 0) + score);
    });
  });

  // 5. Precomputed Co-occurrence Index Injection (Instant O(1) Graph matching)
  if (precomputedCoOccurrences.length > 0) {
    precomputedCoOccurrences.forEach(foodName => {
      scoreMap.set(foodName, (scoreMap.get(foodName) || 0) + 90);
    });
  }

  // 6. Seed defaults if query is empty but delimiters are open (e.g. typing "+")
  if (existingFoodsInInput.length > 0 && !searchTarget) {
    existingFoodsInInput.forEach(existingFood => {
      const matches = Object.keys(DEFAULT_CO_OCCURRENCES).filter(key => 
        existingFood.includes(key)
      );
      matches.forEach(matchKey => {
        DEFAULT_CO_OCCURRENCES[matchKey].forEach(item => {
          scoreMap.set(item, (scoreMap.get(item) || 0) + 70);
        });
      });
    });
  }

  // 7. Inject time of day affinity for fallback items if query is empty
  if (!searchTarget) {
    let mealType = 'snack';
    if (currentHour >= 5 && currentHour < 11) mealType = 'breakfast';
    else if (currentHour >= 11 && currentHour < 16) mealType = 'lunch';
    else if (currentHour >= 16 && currentHour < 19) mealType = 'snack';
    else if (currentHour >= 19 && currentHour < 23) mealType = 'dinner';

    const timeMatches = mealType === 'breakfast' 
      ? ["Idli Sambar", "Masala Dosa", "Poha", "Oatmeal with Almonds", "Whey Protein Shake"]
      : ["2 Chapatis", "White Rice", "Dal Tadka", "Paneer Biryani", "Bhindi Masala"];

    timeMatches.forEach(f => {
      scoreMap.set(f, (scoreMap.get(f) || 0) + 15);
    });
  }

  // 8. Logarithmic Frequency Dampening & Scoring Sort
  // Instead of pure cumulative inflation which biases popular foods forever,
  // we apply logarithmic scaling to the frequency signal.
  return [...scoreMap.entries()]
    .map(([name, score]) => {
      const frequency = frequencyMap.get(name) || 0;
      const dampedFrequencyScore = Math.log(frequency + 1) * 20;
      return {
        name,
        totalScore: score + dampedFrequencyScore
      };
    })
    .sort((a, b) => b.totalScore - a.totalScore)
    .filter(x => !existingFoodsInInput.includes(x.name.toLowerCase().trim()))
    .slice(0, 8)
    .map(x => x.name);
}
