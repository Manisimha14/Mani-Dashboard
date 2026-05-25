export type MealLog = {
  timestamp: number;
  foods: { name: string }[];
};

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

// Curated co-occurrence defaults for Indian/global items in case of empty local logs
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
  "eggs": ["Toast", "Avocado", "Black Coffee"],
  "boiled eggs": ["Toast", "Avocado", "Black Coffee"]
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
 * Extracts already entered foods from the input string.
 */
function getExistingFoods(input: string): string[] {
  const separators = /(?:,|\+|\sand\s)/i;
  return input
    .split(separators)
    .map(f => f.trim().toLowerCase())
    .filter(f => f.length > 0);
}

/**
 * Core Suggestions Engine: Ranks foods based on:
 * - Direct prefix & substring matching
 * - Fuzzy Levenshtein match (typo tolerance)
 * - Recency & Frequency of the logged food item
 * - Time-of-day affinity (breakfast/lunch/dinner alignment)
 * - Co-occurrence matching (past pairings with typed foods in this input session)
 */
export function getSuggestions(
  input: string,
  lastQueryPart: string,
  mealLogs: MealLog[],
  currentHour: number
): string[] {
  const normalizedQuery = lastQueryPart.toLowerCase().trim();
  const scoreMap = new Map<string, number>();
  
  // 1. Pre-seed with fallback recommendations (low score base)
  for (const fallback of STATIC_FALLBACK) {
    scoreMap.set(fallback, 10);
  }

  // Extract other foods typed in the same input to compute co-occurrence
  const existingFoodsInInput = getExistingFoods(input);
  // If we are currently typing a food, remove the active partial term from the existing set
  if (normalizedQuery && existingFoodsInInput.length > 0) {
    existingFoodsInInput.pop();
  }

  // 2. Process meal logs to calculate high-fidelity signals
  mealLogs.forEach(log => {
    const ageDays = (Date.now() - log.timestamp) / (1000 * 60 * 60 * 24);
    // Recency boost: massive boost for items consumed today/yesterday, scaling down gracefully
    const recencyBoost = Math.max(5, 40 - ageDays);

    // Time-of-day affinity: +20 points if consumed within 2 hours of current hour in previous logs
    const logHour = new Date(log.timestamp).getHours();
    const timeAffinity = Math.abs(logHour - currentHour) <= 2 ? 25 : 0;

    const logFoodNames = log.foods.map(f => f.name.toLowerCase().trim());

    log.foods.forEach(food => {
      const name = food.name;
      const lower = name.toLowerCase().trim();
      let score = 0;

      // Direct Matches
      if (normalizedQuery) {
        if (lower.startsWith(normalizedQuery)) {
          score += 120; // Exact prefix gets absolute priority
        } else if (lower.includes(normalizedQuery)) {
          score += 65;  // Substring match
        }

        // Individual Word Match (e.g. "rice" matching "Brown Rice")
        const words = lower.split(/\s+/);
        if (words.some(word => word.startsWith(normalizedQuery))) {
          score += 35;
        }

        // Typo tolerance / Fuzzy match using Levenshtein distance
        if (normalizedQuery.length >= 3 && lower.length >= 3) {
          const distance = levenshtein(normalizedQuery, lower);
          if (distance <= 2) {
            score += 45; // Close typo match
          }
        }
      }

      // 3. Co-occurrence calculation
      // If user has already typed another item in this input (e.g. "Rice + [typing]"),
      // check if this item appeared alongside the existing item in past meal logs.
      if (existingFoodsInInput.length > 0) {
        const hasCoOccurred = existingFoodsInInput.some(existingFood => {
          // If the log contains the existing food, boost other foods in this same log
          return logFoodNames.includes(existingFood) && lower !== existingFood;
        });

        if (hasCoOccurred) {
          score += 80; // High co-occurrence boost
        }
      }

      // Add recency, frequency, and time-of-day signals
      score += recencyBoost;
      score += timeAffinity;

      scoreMap.set(name, (scoreMap.get(name) || 0) + score);
    });
  });

  // 4. Default co-occurrence hints from curated sets if no logs match yet
  if (existingFoodsInInput.length > 0 && !normalizedQuery) {
    existingFoodsInInput.forEach(existingFood => {
      const matches = Object.keys(DEFAULT_CO_OCCURRENCES).filter(key => 
        existingFood.includes(key)
      );
      matches.forEach(matchKey => {
        DEFAULT_CO_OCCURRENCES[matchKey].forEach(item => {
          scoreMap.set(item, (scoreMap.get(item) || 0) + 70); // Seed pairing boost
        });
      });
    });
  }

  // 5. If query is empty but we have space for general recommendation (e.g., just opened),
  // boost suggestions matching current mealtime
  if (!normalizedQuery) {
    let mealType = 'snack';
    if (currentHour >= 5 && currentHour < 11) mealType = 'breakfast';
    else if (currentHour >= 11 && currentHour < 16) mealType = 'lunch';
    else if (currentHour >= 16 && currentHour < 19) mealType = 'snack';
    else if (currentHour >= 19 && currentHour < 23) mealType = 'dinner';

    if (mealType === 'breakfast') {
      ["Idli Sambar", "Masala Dosa", "Poha", "Oatmeal with Almonds", "Whey Protein Shake"].forEach(f => {
        scoreMap.set(f, (scoreMap.get(f) || 0) + 15);
      });
    } else if (mealType === 'lunch' || mealType === 'dinner') {
      ["2 Chapatis", "White Rice", "Dal Tadka", "Paneer Biryani", "Bhindi Masala"].forEach(f => {
        scoreMap.set(f, (scoreMap.get(f) || 0) + 15);
      });
    }
  }

  // Sort by final combined intelligence score and slice top recommendations
  return [...scoreMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .filter(([name]) => {
      // Don't suggest foods already typed in the input to prevent duplicates
      return !existingFoodsInInput.includes(name.toLowerCase().trim());
    })
    .slice(0, 8)
    .map(([name]) => name);
}
