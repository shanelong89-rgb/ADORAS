/**
 * Badge Synchronization Utility
 * 
 * Provides functions to sync badge counts between service worker and app.
 * This solves the issue where badge counts only update after API fetch completes.
 * 
 * Flow:
 * 1. Service worker receives push → sets badge → stores count in IndexedDB
 * 2. App comes to foreground → reads count from IndexedDB → shows immediately
 * 3. App fetches from API → verifies and updates if different
 */

// Type augmentation for Badge API (not yet in standard TypeScript DOM types)
declare global {
  interface Navigator {
    setAppBadge?(count?: number): Promise<void>;
    clearAppBadge?(): Promise<void>;
  }
}

const BADGE_STORE_NAME = 'adoras-badge-store';
const BADGE_DB_VERSION = 1;

// Open IndexedDB for badge persistence
async function openBadgeDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(BADGE_STORE_NAME, BADGE_DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('badges')) {
        db.createObjectStore('badges');
      }
    };
  });
}

/**
 * Get persisted badge count from IndexedDB
 * This allows the app to show the correct badge immediately on foreground,
 * without waiting for API fetch to complete.
 */
export async function getPersistedBadgeCount(): Promise<number> {
  try {
    const db = await openBadgeDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['badges'], 'readonly');
      const store = transaction.objectStore('badges');
      const request = store.get('totalBadgeCount');
      
      request.onsuccess = () => {
        const count = request.result || 0;
        console.log('📖 [BADGE-SYNC] Read persisted badge count from IndexedDB:', count);
        resolve(count);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('❌ [BADGE-SYNC] Failed to read persisted badge count:', error);
    return 0;
  }
}

/**
 * Store badge count to IndexedDB
 * The service worker also calls this, but the app can use it too
 * to keep the persisted count in sync.
 */
export async function persistBadgeCount(count: number): Promise<void> {
  try {
    const db = await openBadgeDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['badges'], 'readwrite');
      const store = transaction.objectStore('badges');
      const request = store.put(count, 'totalBadgeCount');
      
      request.onsuccess = () => {
        console.log('💾 [BADGE-SYNC] Persisted badge count to IndexedDB:', count);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('❌ [BADGE-SYNC] Failed to persist badge count:', error);
  }
}

/**
 * Clear persisted badge count
 * Call this when all messages are read.
 */
export async function clearPersistedBadgeCount(): Promise<void> {
  return persistBadgeCount(0);
}

/**
 * Set iOS app badge and persist to IndexedDB
 * This ensures badge count is always available, even after app restart.
 */
export async function setAndPersistBadge(count: number): Promise<void> {
  // Set the visible badge
  if ('setAppBadge' in navigator) {
    try {
      await navigator.setAppBadge(count);
      console.log(`📱 [BADGE-SYNC] iOS Badge set to: ${count}`);
    } catch (error) {
      console.error('❌ [BADGE-SYNC] Failed to set app badge:', error);
    }
  } else {
    console.log('ℹ️ [BADGE-SYNC] Badge API not supported in this browser/mode');
  }
  
  // Persist for future reads
  await persistBadgeCount(count);
}

/**
 * Clear iOS app badge and persisted count
 */
export async function clearBadge(): Promise<void> {
  if ('clearAppBadge' in navigator) {
    try {
      await navigator.clearAppBadge();
      console.log('📱 [BADGE-SYNC] iOS Badge cleared');
    } catch (error) {
      console.error('❌ [BADGE-SYNC] Failed to clear app badge:', error);
    }
  }
  
  await clearPersistedBadgeCount();
}
