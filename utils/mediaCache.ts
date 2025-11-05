/**
 * Media Cache Manager for Adoras
 * Phase 3e: Cache media files locally using IndexedDB for offline access
 */

// IndexedDB Database Configuration
const DB_NAME = 'adoras-media-cache';
const DB_VERSION = 1;
const STORE_NAME = 'media';
const MAX_CACHE_SIZE_MB = 100; // Max 100MB of cached media
const CACHE_EXPIRY_DAYS = 7; // Cache expires after 7 days

interface CachedMedia {
  url: string; // Original URL (key)
  blob: Blob; // Cached media blob
  mimeType: string;
  size: number; // Bytes
  cachedAt: number; // Timestamp
  lastAccessedAt: number; // Timestamp
  expiresAt: number; // Timestamp
}

/**
 * Initialize IndexedDB for media caching
 */
function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('❌ Failed to open IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'url' });
        
        // Create indexes for querying
        store.createIndex('cachedAt', 'cachedAt', { unique: false });
        store.createIndex('lastAccessedAt', 'lastAccessedAt', { unique: false });
        store.createIndex('expiresAt', 'expiresAt', { unique: false });
        
        console.log('✅ IndexedDB object store created');
      }
    };
  });
}

/**
 * Cache a media file from a URL
 * Downloads and stores the media blob in IndexedDB
 */
export async function cacheMedia(url: string): Promise<boolean> {
  try {
    console.log(`📦 Caching media: ${url.substring(0, 50)}...`);

    // Fetch media
    const response = await fetch(url);
    if (!response.ok) {
      console.warn('⚠️ Failed to fetch media for caching:', response.status);
      return false;
    }

    const blob = await response.blob();
    const mimeType = response.headers.get('content-type') || blob.type;
    const size = blob.size;

    // Check if we need to clear old cache to make space
    await ensureCacheSpace(size);

    // Store in IndexedDB
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const now = Date.now();
    const cachedMedia: CachedMedia = {
      url,
      blob,
      mimeType,
      size,
      cachedAt: now,
      lastAccessedAt: now,
      expiresAt: now + (CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
    };

    await new Promise((resolve, reject) => {
      const request = store.put(cachedMedia);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    console.log(`✅ Media cached: ${(size / 1024).toFixed(1)}KB`);
    return true;
  } catch (error) {
    console.error('❌ Failed to cache media:', error);
    return false;
  }
}

/**
 * Get cached media blob for a URL
 * Returns blob URL that can be used in img/video/audio tags
 */
export async function getCachedMedia(url: string): Promise<string | null> {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    // Get cached media
    const cachedMedia = await new Promise<CachedMedia | undefined>((resolve, reject) => {
      const request = store.get(url);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (!cachedMedia) {
      return null; // Not cached
    }

    // Check if expired
    if (cachedMedia.expiresAt < Date.now()) {
      console.log('🗑️ Cached media expired, removing...');
      await removeCachedMedia(url);
      return null;
    }

    // Update last accessed time
    cachedMedia.lastAccessedAt = Date.now();
    await new Promise((resolve, reject) => {
      const updateRequest = store.put(cachedMedia);
      updateRequest.onsuccess = () => resolve(updateRequest.result);
      updateRequest.onerror = () => reject(updateRequest.error);
    });

    // Create blob URL
    const blobUrl = URL.createObjectURL(cachedMedia.blob);
    console.log(`✅ Retrieved cached media (${(cachedMedia.size / 1024).toFixed(1)}KB)`);
    
    return blobUrl;
  } catch (error) {
    console.error('❌ Failed to get cached media:', error);
    return null;
  }
}

/**
 * Check if a URL is cached
 */
export async function isCached(url: string): Promise<boolean> {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    const cachedMedia = await new Promise<CachedMedia | undefined>((resolve, reject) => {
      const request = store.get(url);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (!cachedMedia) return false;

    // Check if expired
    return cachedMedia.expiresAt >= Date.now();
  } catch (error) {
    console.error('❌ Failed to check cache:', error);
    return false;
  }
}

/**
 * Remove a specific cached media item
 */
export async function removeCachedMedia(url: string): Promise<void> {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    await new Promise((resolve, reject) => {
      const request = store.delete(url);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    console.log('🗑️ Removed cached media');
  } catch (error) {
    console.error('❌ Failed to remove cached media:', error);
  }
}

/**
 * Get total cache size in bytes
 */
export async function getCacheSize(): Promise<number> {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    const allMedia = await new Promise<CachedMedia[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return allMedia.reduce((total, media) => total + media.size, 0);
  } catch (error) {
    console.error('❌ Failed to get cache size:', error);
    return 0;
  }
}

/**
 * Ensure there's enough space in cache for new media
 * Removes oldest/least accessed items if needed
 */
async function ensureCacheSpace(requiredBytes: number): Promise<void> {
  const currentSize = await getCacheSize();
  const maxSize = MAX_CACHE_SIZE_MB * 1024 * 1024;
  const availableSpace = maxSize - currentSize;

  if (availableSpace >= requiredBytes) {
    return; // Enough space
  }

  console.log(`🗑️ Cache full (${(currentSize / 1024 / 1024).toFixed(1)}MB), clearing old items...`);

  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('lastAccessedAt');

    // Get all items sorted by last accessed (oldest first)
    const allMedia = await new Promise<CachedMedia[]>((resolve, reject) => {
      const request = index.openCursor();
      const results: CachedMedia[] = [];
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      
      request.onerror = () => reject(request.error);
    });

    // Remove oldest items until we have enough space
    let freedSpace = 0;
    for (const media of allMedia) {
      if (freedSpace >= requiredBytes) break;

      await removeCachedMedia(media.url);
      freedSpace += media.size;
      console.log(`🗑️ Removed old cached media (${(media.size / 1024).toFixed(1)}KB)`);
    }

    console.log(`✅ Freed ${(freedSpace / 1024).toFixed(1)}KB of cache space`);
  } catch (error) {
    console.error('❌ Failed to clear cache space:', error);
  }
}

/**
 * Clear all expired cache entries
 */
export async function clearExpiredCache(): Promise<number> {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const allMedia = await new Promise<CachedMedia[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const now = Date.now();
    let removedCount = 0;

    for (const media of allMedia) {
      if (media.expiresAt < now) {
        await removeCachedMedia(media.url);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.log(`🗑️ Cleared ${removedCount} expired cache entries`);
    }

    return removedCount;
  } catch (error) {
    console.error('❌ Failed to clear expired cache:', error);
    return 0;
  }
}

/**
 * Clear all cached media
 */
export async function clearAllCache(): Promise<void> {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    await new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    console.log('🗑️ Cleared all cached media');
  } catch (error) {
    console.error('❌ Failed to clear cache:', error);
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalSize: number;
  totalSizeMB: number;
  itemCount: number;
  maxSizeMB: number;
  usagePercent: number;
}> {
  try {
    const totalSize = await getCacheSize();
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    const itemCount = await new Promise<number>((resolve, reject) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const totalSizeMB = totalSize / 1024 / 1024;
    const maxSizeMB = MAX_CACHE_SIZE_MB;
    const usagePercent = (totalSizeMB / maxSizeMB) * 100;

    return {
      totalSize,
      totalSizeMB,
      itemCount,
      maxSizeMB,
      usagePercent,
    };
  } catch (error) {
    console.error('❌ Failed to get cache stats:', error);
    return {
      totalSize: 0,
      totalSizeMB: 0,
      itemCount: 0,
      maxSizeMB: MAX_CACHE_SIZE_MB,
      usagePercent: 0,
    };
  }
}

/**
 * Prefetch and cache media for multiple URLs
 * Useful for preloading memories when online
 */
export async function prefetchMedia(urls: string[]): Promise<number> {
  console.log(`📦 Prefetching ${urls.length} media items...`);
  
  let successCount = 0;
  
  for (const url of urls) {
    // Skip if already cached
    if (await isCached(url)) {
      successCount++;
      continue;
    }

    // Cache media
    const success = await cacheMedia(url);
    if (success) {
      successCount++;
    }

    // Small delay to avoid overwhelming the network
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`✅ Prefetched ${successCount}/${urls.length} media items`);
  return successCount;
}
