/**
 * IndexedDB Wrapper for offline data storage
 */

const DB_NAME = 'HivemindDB';
const DB_VERSION = 1;

export interface DBStore {
  name: string;
  keyPath?: string;
  autoIncrement?: boolean;
  indexes?: { name: string; keyPath: string; unique?: boolean }[];
}

const stores: DBStore[] = [
  {
    name: 'students',
    keyPath: 'id',
    indexes: [
      { name: 'by-name', keyPath: 'name' },
      { name: 'by-updated', keyPath: 'updatedAt' }
    ]
  },
  {
    name: 'schedules',
    keyPath: 'id',
    indexes: [
      { name: 'by-date', keyPath: 'date' },
      { name: 'by-updated', keyPath: 'updatedAt' }
    ]
  },
  {
    name: 'alerts',
    keyPath: 'id',
    indexes: [
      { name: 'by-read', keyPath: 'read' },
      { name: 'by-created', keyPath: 'createdAt' }
    ]
  },
  {
    name: 'cache-meta',
    keyPath: 'key',
    indexes: [
      { name: 'by-timestamp', keyPath: 'timestamp' }
    ]
  },
  {
    name: 'pending-sync',
    keyPath: 'id',
    autoIncrement: true,
    indexes: [
      { name: 'by-action', keyPath: 'action' },
      { name: 'by-created', keyPath: 'createdAt' }
    ]
  }
];

class IndexedDBWrapper {
  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;

  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        stores.forEach(store => {
          if (!db.objectStoreNames.contains(store.name)) {
            const objectStore = db.createObjectStore(store.name, {
              keyPath: store.keyPath,
              autoIncrement: store.autoIncrement
            });

            store.indexes?.forEach(index => {
              objectStore.createIndex(index.name, index.keyPath, {
                unique: index.unique || false
              });
            });
          }
        });
      };
    });

    return this.dbPromise;
  }

  async get<T>(storeName: string, key: string | number): Promise<T | undefined> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllByIndex<T>(
    storeName: string,
    indexName: string,
    query?: IDBValidKey | IDBKeyRange
  ): Promise<T[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = query ? index.getAll(query) : index.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async put<T>(storeName: string, value: T): Promise<IDBValidKey> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(value);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async add<T>(storeName: string, value: T): Promise<IDBValidKey> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(value);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: string, key: string | number): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async count(storeName: string): Promise<number> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

export const db = new IndexedDBWrapper();
