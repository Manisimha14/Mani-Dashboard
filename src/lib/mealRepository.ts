export type MealLog = {
  timestamp: number;
  foods: { name: string }[];
};

const DB_NAME = 'ManiOS_Nutrition_Autocomplete';
const DB_VERSION = 1;

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (e) => {
      const db = request.result;
      if (!db.objectStoreNames.contains('meals')) {
        db.createObjectStore('meals', { keyPath: 'timestamp' });
      }
      if (!db.objectStoreNames.contains('cooccurrences')) {
        db.createObjectStore('cooccurrences', { keyPath: 'food' });
      }
    };
  });
}

/**
 * Repository for managing food logging history using IndexedDB
 * avoids localStorage size constraints and synchronous blocking.
 */
export const mealRepository = {
  /**
   * Save a newly confirmed meal log.
   * Asynchronously updates the raw meal logs and precomputes the co-occurrence graph.
   */
  async saveMeal(foods: string[]): Promise<void> {
    if (!foods || foods.length === 0) return;
    const db = await getDB();
    const timestamp = Date.now();
    const cleanFoods = foods.map(f => f.trim()).filter(f => f.length > 0);

    // 1. Save Raw Log
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('meals', 'readwrite');
      const store = transaction.objectStore('meals');
      const request = store.put({
        timestamp,
        foods: cleanFoods.map(name => ({ name }))
      });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // 2. Precompute Co-occurrences Graph
    // For each item in the meal, update its co-occurrence relationship with all other items
    if (cleanFoods.length > 1) {
      const transaction = db.transaction('cooccurrences', 'readwrite');
      const store = transaction.objectStore('cooccurrences');
      
      for (const food of cleanFoods) {
        const normalizedFood = food.toLowerCase().trim();
        // Fetch current co-occurrences
        const currentData: any = await new Promise((resolve) => {
          const req = store.get(normalizedFood);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        });

        const partners = currentData?.partners || {};
        
        // Boost partner weights for all other items in the same meal log
        cleanFoods.forEach(otherFood => {
          const normalizedOther = otherFood.toLowerCase().trim();
          if (normalizedOther !== normalizedFood) {
            partners[normalizedOther] = (partners[normalizedOther] || 0) + 1;
          }
        });

        await new Promise<void>((resolve, reject) => {
          const req = store.put({
            food: normalizedFood,
            originalName: food,
            partners
          });
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      }
    }
  },

  /**
   * Get all past meal logs
   */
  async getMealLogs(): Promise<MealLog[]> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('meals', 'readonly');
      const store = transaction.objectStore('meals');
      const request = store.getAll();
      
      request.onsuccess = () => {
        // Return sorted newest first
        const logs = request.result || [];
        resolve(logs.sort((a: any, b: any) => b.timestamp - a.timestamp));
      };
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Fetch O(1) precomputed co-occurring food partners for a given food item query
   */
  async getCoOccurrences(foodName: string): Promise<string[]> {
    const db = await getDB();
    const normalized = foodName.toLowerCase().trim();
    
    return new Promise((resolve) => {
      const transaction = db.transaction('cooccurrences', 'readonly');
      const store = transaction.objectStore('cooccurrences');
      const request = store.get(normalized);
      
      request.onsuccess = () => {
        const result = request.result;
        if (!result || !result.partners) {
          resolve([]);
          return;
        }
        // Return partners sorted by co-occurrence frequency
        const sorted = Object.entries(result.partners)
          .sort((a: any, b: any) => b[1] - a[1])
          .slice(0, 5)
          .map(([name]) => name);
        resolve(sorted);
      };
      request.onerror = () => resolve([]);
    });
  }
};
