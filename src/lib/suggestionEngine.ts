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

// Extremely fast rolling rows Levenshtein distance calculation
// Memory Complexity: O(min(n, m)) instead of O(n * m) matrix allocation
function levenshtein(a: string, b: string): number {
  if (a.length > b.length) return levenshtein(b, a);
  
  let prevRow = Array.from({ length: a.length + 1 }, (_, i) => i);
  const currentRow = new Array<number>(a.length + 1);

  for (let i = 1; i <= b.length; i++) {
    currentRow[0] = i;
    for (let j = 1; j <= a.length; j++) {
      const insert = prevRow[j] + 1;
      const deleteCost = currentRow[j - 1] + 1;
      const substitute = prevRow[j - 1] + (b[i - 1] === a[j - 1] ? 0 : 1);
      currentRow[j] = Math.min(insert, deleteCost, substitute);
    }
    prevRow = [...currentRow];
  }
  return prevRow[a.length];
}

/**
 * Parses spacing and handles quantities robustly (e.g. "2 ch" -> prefix "2 ", query "ch")
 */
function parseQuantityAndQuery(input: string): { quantityPrefix: string; cleanQuery: string } {
  // Normalize spacing to avoid formatting mismatch
  const normalizedInput = input.replace(/\s+/g, ' ').trim();
  const quantityMatch = normalizedInput.match(/^(\d+(?:\.\d+)?\s*)(.*)$/);
  
  if (quantityMatch) {
    return {
      quantityPrefix: quantityMatch[1], // e.g. "2 "
      cleanQuery: quantityMatch[2].trim() // e.g. "ch"
    };
  }
  return { quantityPrefix: '', cleanQuery: normalizedInput };
}

/**
 * Tokenizes a string into exact word units
 */
const tokenize = (s: string): string[] => s.split(/\s+/).map(t => t.toLowerCase().trim()).filter(Boolean);

/**
 * Core Suggestions Engine: High-performance, single-pass combined scorer
 */
export function getSuggestions(
  input: string,
  lastQueryPart: string,
  mealLogs: MealLog[],
  currentHour: number,
  precomputedCoOccurrences: string[] = []
): string[] {
  // Spacing normalization to avoid token breaking
  const normalizedQuery = lastQueryPart.replace(/\s+/g, ' ').toLowerCase().trim();
  
  const scoreMap = new Map<string, number>();
  const frequencyMap = new Map<string, number>();
  const canonicalNames = new Map<string, string>(); // Casing Deduplication mapping (lowercase -> original)

  // 1. Seed fallback list with small scores
  for (const fallback of STATIC_FALLBACK) {
    const lowerFallback = fallback.toLowerCase().trim();
    scoreMap.set(lowerFallback, 10);
    frequencyMap.set(lowerFallback, 1);
    canonicalNames.set(lowerFallback, fallback);
  }

  // Parse current delimiters
  const existingFoodsInInput = input
    .split(/(?:,|\+|\sand\s)/i)
    .map(f => f.trim().toLowerCase())
    .filter(f => f.length > 0);
  if (normalizedQuery && existingFoodsInInput.length > 0) {
    existingFoodsInInput.pop();
  }

  const { quantityPrefix, cleanQuery } = parseQuantityAndQuery(normalizedQuery);
  const searchTarget = cleanQuery || normalizedQuery;

  // Short-circuit: If search query is empty and no co-occurrences exist,
  // serve time-of-day affinity matches instantly to bypass log iteration.
  if (!searchTarget && existingFoodsInInput.length === 0 && precomputedCoOccurrences.length === 0) {
    let mealType = 'snack';
    if (currentHour >= 5 && currentHour < 11) mealType = 'breakfast';
    else if (currentHour >= 11 && currentHour < 16) mealType = 'lunch';
    else if (currentHour >= 16 && currentHour < 19) mealType = 'snack';
    else if (currentHour >= 19 && currentHour < 23) mealType = 'dinner';

    const timeMatches = mealType === 'breakfast' 
      ? ["Idli Sambar", "Masala Dosa", "Poha", "Oatmeal with Almonds", "Whey Protein Shake"]
      : ["2 Chapatis", "White Rice", "Dal Tadka", "Paneer Biryani", "Bhindi Masala"];

    return timeMatches;
  }

  // ─── SINGLE PASS OVER MEAL LOGS ───
  // Computes direct score mapping, recency/frequency, co-occurrences and time affinity in 1 pass
  mealLogs.forEach(log => {
    const ageDays = (Date.now() - log.timestamp) / (1000 * 60 * 60 * 24);
    const recencyBoost = Math.max(5, 40 - ageDays);

    // Circular clocks: safely wraps around midnight (e.g. 23:00 to 01:00 is 2 hours)
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
      
      // Deduplicate casing - map to original most recent casing
      if (!canonicalNames.has(lower)) {
        canonicalNames.set(lower, name);
      }

      // Track exact frequencies cleanly using casing-deduplicated keys
      frequencyMap.set(lower, (frequencyMap.get(lower) || 0) + 1);

      let score = 0;

      // Direct Matches
      if (searchTarget) {
        let isMatched = false;
        
        if (lower.startsWith(searchTarget)) {
          score += 150;
          isMatched = true;
        } else if (lower.includes(searchTarget)) {
          score += 65;
          isMatched = true;
        }

        const words = lower.split(/\s+/);
        if (words.some(word => word.startsWith(searchTarget))) {
          score += 35;
          isMatched = true;
        }

        // Highly optimized Levenshtein fallback
        if (!isMatched && searchTarget.length >= 4 && lower.length >= 4) {
          const distance = levenshtein(searchTarget, lower);
          if (distance <= 2) {
            score += 45;
          }
        }
      }

      // Quantity matches (e.g. "2 ch" -> "2 Chapatis")
      if (quantityPrefix && searchTarget) {
        const itemQuantityMatch = name.match(/^(\d+(?:\.\d+)?)/);
        if (itemQuantityMatch && itemQuantityMatch[1]) {
          const prefixNumber = parseFloat(quantityPrefix);
          const itemNumber = parseFloat(itemQuantityMatch[1]);
          if (prefixNumber === itemNumber) {
            score += 60;
          }
        }
      }

      // Co-occurrence with Token Bound Matching
      // Avoids false substring collisions (e.g. "egg" matching "veggie") by splitting into words
      if (existingFoodsInInput.length > 0) {
        const hasCoOccurred = existingFoodsInInput.some(existingFood => {
          const existTokens = tokenize(existingFood);
          return logFoodNames.some(logFood => {
            const logTokens = tokenize(logFood);
            // Verify there is an exact word intersection between previous foods and the log
            return logTokens.some(lt => existTokens.includes(lt)) && lower !== existingFood;
          });
        });

        if (hasCoOccurred) {
          score += 85;
        }
      }

      score += recencyBoost;
      score += timeAffinity;

      scoreMap.set(lower, (scoreMap.get(lower) || 0) + score);
    });
  });

  // Inject Precomputed co-occurrence graph weights
  if (precomputedCoOccurrences.length > 0) {
    precomputedCoOccurrences.forEach(foodName => {
      const lower = foodName.toLowerCase().trim();
      if (!canonicalNames.has(lower)) {
        canonicalNames.set(lower, foodName);
      }
      scoreMap.set(lower, (scoreMap.get(lower) || 0) + 90);
    });
  }

  // Inject curated pairs if user just typed delimiter
  if (existingFoodsInInput.length > 0 && !searchTarget) {
    existingFoodsInInput.forEach(existingFood => {
      const matches = Object.keys(DEFAULT_CO_OCCURRENCES).filter(key => 
        existingFood.includes(key)
      );
      matches.forEach(matchKey => {
        DEFAULT_CO_OCCURRENCES[matchKey].forEach(item => {
          const lower = item.toLowerCase().trim();
          if (!canonicalNames.has(lower)) {
            canonicalNames.set(lower, item);
          }
          scoreMap.set(lower, (scoreMap.get(lower) || 0) + 70);
        });
      });
    });
  }

  // Balanced Normalized Scoring Sort featuring Logarithmic Frequency Damping
  return [...scoreMap.entries()]
    .map(([lower, score]) => {
      const frequency = frequencyMap.get(lower) || 0;
      const dampedFrequencyScore = Math.log(frequency + 1) * 20;
      const originalName = canonicalNames.get(lower) || lower;
      
      // Combine scoring factors cleanly
      return {
        name: originalName,
        totalScore: score + dampedFrequencyScore
      };
    })
    .sort((a, b) => b.totalScore - a.totalScore)
    .filter(x => !existingFoodsInInput.includes(x.name.toLowerCase().trim()))
    .slice(0, 8)
    .map(x => x.name);
}
