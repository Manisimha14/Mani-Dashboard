export type MealLog = {
  id: string;
  timestamp: number;
  foods: { name: string }[];
};

const DB_NAME = 'ManiOS_Nutrition_Autocomplete_v2';
const DB_VERSION = 2; // Upgraded version for migration safety demonstration

// 1. Singleton Database Connection Promise to prevent connection leaks
let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => {
        dbPromise = null; // Reset singleton on error to allow recovery
        reject(request.error);
      };
      
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = request.result;
        const oldVersion = event.oldVersion;

        // Migrations using a clean switch statement
        if (oldVersion < 1) {
          if (!db.objectStoreNames.contains('meals')) {
            db.createObjectStore('meals', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('cooccurrences')) {
            db.createObjectStore('cooccurrences', { keyPath: 'food' });
          }
        }
        
        if (oldVersion < 2) {
          // Version 2 migration logic (if adding new indices or stores, add here)
          // For now, ensuring indexes and existing stores are fully initialized
          const mealStore = request.transaction?.objectStore('meals');
          if (mealStore && !mealStore.indexNames.contains('timestamp')) {
            mealStore.createIndex('timestamp', 'timestamp', { unique: false });
          }
        }
      };
    } catch (err) {
      dbPromise = null;
      reject(err);
    }
  });

  return dbPromise;
}

/**
 * Clean Database Corruption Recovery: deletes the database if connection fails repeatedly
 */
async function recoverDatabase(): Promise<IDBDatabase> {
  dbPromise = null;
  return new Promise<IDBDatabase>((resolve, reject) => {
    const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
    deleteRequest.onsuccess = () => {
      getDB().then(resolve).catch(reject);
    };
    deleteRequest.onerror = () => reject(deleteRequest.error);
  });
}

/**
 * Standardizes food terms to map singular/plural variants cleanly (e.g. "chapatis" -> "chapati")
 */
function normalizeFoodName(name: string): string {
  const lower = name.toLowerCase().trim();
  // Strip common plural suffixes
  if (lower.endsWith('ies')) return lower.slice(0, -3) + 'y'; // "berries" -> "berry"
  if (lower.endsWith('s') && !lower.endsWith('ss') && !lower.endsWith('us') && !lower.endsWith('is')) {
    return lower.slice(0, -1); // "chapatis" -> "chapati", "rotis" -> "roti"
  }
  return lower;
}

// Persist the cache version globally using localStorage key to prevent resets on page reload
const VERSION_KEY = 'manios_nutrition_db_version';
let dbVersion = parseInt(localStorage.getItem(VERSION_KEY) || '0', 10);
const listeners = new Set<() => void>();

export const mealRepository = {
  getVersion(): number {
    return dbVersion;
  },

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  notify() {
    listeners.forEach(l => {
      try {
        l();
      } catch (err) {
        console.error("Subscriber notification crash:", err);
      }
    });
  },

  /**
   * Save a newly confirmed meal log.
   * Asynchronously updates the raw meal logs and precomputes the co-occurrence graph.
   * Features:
   * - Prevents TransactionInactiveError by performing sequential DB steps synchronously inside the event loop.
   * - Implements co-occurrence graph bias damping (decay by 0.98).
   * - Restricts data retention by pruning logs older than 500 records.
   */
  async saveMeal(foods: string[]): Promise<void> {
    if (!foods || foods.length === 0) return;
    
    let db: IDBDatabase;
    try {
      db = await getDB();
    } catch (err) {
      console.warn("Retrying IndexedDB connection via recovery:", err);
      db = await recoverDatabase();
    }
    
    const timestamp = Date.now();
    const id = crypto.randomUUID(); // Prevents timestamp collision bug
    const cleanFoods = foods.map(f => f.trim()).filter(f => f.length > 0);

    // 1. Save Raw Log
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('meals', 'readwrite');
      const store = transaction.objectStore('meals');
      const request = store.put({
        id,
        timestamp,
        foods: cleanFoods.map(name => ({ name }))
      });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // 2. Precompute Co-occurrences Graph
    // Prevents TransactionInactiveError: does not await between get() and put()
    if (cleanFoods.length > 1) {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction('cooccurrences', 'readwrite');
        const store = transaction.objectStore('cooccurrences');
        
        let completedOperations = 0;
        
        cleanFoods.forEach(food => {
          const normalizedFood = normalizeFoodName(food);
          const getRequest = store.get(normalizedFood);
          
          getRequest.onsuccess = () => {
            const currentData = getRequest.result;
            const partners: Record<string, number> = currentData?.partners || {};
            
            // Apply Co-occurrence Damping (0.98 decay) to prevent old habits from dominating forever
            Object.keys(partners).forEach(key => {
              partners[key] = partners[key] * 0.98;
            });
            
            // Boost partner weights for all other items in the same meal log
            cleanFoods.forEach(otherFood => {
              const normalizedOther = normalizeFoodName(otherFood);
              if (normalizedOther !== normalizedFood) {
                partners[normalizedOther] = (partners[normalizedOther] || 0) + 1;
              }
            });
            
            const putRequest = store.put({
              food: normalizedFood,
              originalName: food,
              partners
            });
            
            putRequest.onsuccess = () => {
              completedOperations++;
              if (completedOperations === cleanFoods.length) {
                resolve();
              }
            };
            
            putRequest.onerror = () => reject(putRequest.error);
          };
          
          getRequest.onerror = () => reject(getRequest.error);
        });
      });
    }

    // 3. Data Retention Pruning
    // Autocomplete only needs recent logs. We async-prune meals beyond a 500 limit.
    this.pruneOldLogs(db).catch(err => {
      console.warn("Background history pruning failed:", err);
    });

    dbVersion = timestamp; // Update version cache key atomically using timestamp
    localStorage.setItem(VERSION_KEY, String(dbVersion));
    this.notify();
  },

  /**
   * Background data retention pruning: restricts the database size to 500 entries
   */
  async pruneOldLogs(db: IDBDatabase): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('meals', 'readwrite');
      const store = transaction.objectStore('meals');
      const request = store.getAll();
      
      request.onsuccess = () => {
        const logs = request.result || [];
        if (logs.length > 500) {
          // Sort oldest first
          const sorted = logs.sort((a, b) => a.timestamp - b.timestamp);
          const toDelete = sorted.slice(0, logs.length - 500);
          
          toDelete.forEach(log => {
            store.delete(log.id);
          });
        }
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Get recent meal logs using high-performance cursor pagination to avoid memory hits at scale
   */
  async getMealLogs(): Promise<MealLog[]> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('meals', 'readonly');
      const store = transaction.objectStore('meals');
      const logs: MealLog[] = [];
      
      // Use the 'timestamp' index if available, otherwise fallback to cursor traversing the object store
      let request: IDBRequest<IDBCursorWithValue | null>;
      if (store.indexNames.contains('timestamp')) {
        const index = store.index('timestamp');
        request = index.openCursor(null, 'prev'); // Reverse direction (newest first)
      } else {
        request = store.openCursor(null, 'prev');
      }
      
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor && logs.length < 100) {
          logs.push(cursor.value as MealLog);
          cursor.continue();
        } else {
          // If the timestamp index was not used, we may need to sort the logs manually,
          // but if we used the timestamp index, it is already perfectly sorted.
          if (!store.indexNames.contains('timestamp')) {
            logs.sort((a, b) => b.timestamp - a.timestamp);
          }
          resolve(logs);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Fetch precomputed co-occurring food partners for a given food query
   */
  async getCoOccurrences(foodName: string): Promise<string[]> {
    const db = await getDB();
    const normalized = normalizeFoodName(foodName);
    
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
        
        const sorted = Object.entries(result.partners as Record<string, number>)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name]) => name);
        resolve(sorted);
      };
      request.onerror = () => resolve([]);
    });
  }
};
