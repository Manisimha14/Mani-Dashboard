/**
 * Storage Adapters for state & event logs.
 */

export interface StorageAdapter {
  getItem<T>(key: string): Promise<T | null>;
  setItem<T>(key: string, value: T): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export class LocalStorageAdapter implements StorageAdapter {
  public async getItem<T>(key: string): Promise<T | null> {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : null;
    } catch {
      return null;
    }
  }

  public async setItem<T>(key: string, value: T): Promise<void> {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn(`[LocalStorageAdapter] Failed to set key: ${key}`, e);
    }
  }

  public async removeItem(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}

export class InMemoryStorageAdapter implements StorageAdapter {
  private store = new Map<string, any>();

  public async getItem<T>(key: string): Promise<T | null> {
    return this.store.get(key) || null;
  }

  public async setItem<T>(key: string, value: T): Promise<void> {
    this.store.set(key, value);
  }

  public async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }
}
