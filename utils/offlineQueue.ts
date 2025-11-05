/**
 * Offline Queue Manager for Adoras
 * Phase 3e: Queue API operations when offline and sync when back online
 */

import { isOnline, waitForOnline } from './networkStatus';

// IndexedDB Configuration
const DB_NAME = 'adoras-offline-queue';
const DB_VERSION = 1;
const STORE_NAME = 'pending-operations';

export interface QueuedOperation {
  id: string;
  type: 'create-memory' | 'update-memory' | 'delete-memory' | 'update-profile';
  payload: any;
  createdAt: number;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
}

/**
 * Initialize IndexedDB for offline queue
 */
function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('❌ Failed to open offline queue DB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('type', 'type', { unique: false });
        console.log('✅ Offline queue object store created');
      }
    };
  });
}

/**
 * Add an operation to the offline queue
 */
export async function queueOperation(
  type: QueuedOperation['type'],
  payload: any,
  maxRetries: number = 3
): Promise<string> {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const operation: QueuedOperation = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      type,
      payload,
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries,
    };

    await new Promise((resolve, reject) => {
      const request = store.add(operation);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    console.log(`📥 Operation queued: ${type} (${operation.id})`);
    return operation.id;
  } catch (error) {
    console.error('❌ Failed to queue operation:', error);
    throw error;
  }
}

/**
 * Get all pending operations
 */
export async function getPendingOperations(): Promise<QueuedOperation[]> {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    const operations = await new Promise<QueuedOperation[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return operations;
  } catch (error) {
    console.error('❌ Failed to get pending operations:', error);
    return [];
  }
}

/**
 * Remove an operation from the queue
 */
export async function removeOperation(operationId: string): Promise<void> {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    await new Promise((resolve, reject) => {
      const request = store.delete(operationId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    console.log(`🗑️ Removed operation from queue: ${operationId}`);
  } catch (error) {
    console.error('❌ Failed to remove operation:', error);
  }
}

/**
 * Update an operation in the queue
 */
async function updateOperation(operation: QueuedOperation): Promise<void> {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    await new Promise((resolve, reject) => {
      const request = store.put(operation);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('❌ Failed to update operation:', error);
  }
}

/**
 * Process a single queued operation
 */
async function processOperation(
  operation: QueuedOperation,
  executor: (op: QueuedOperation) => Promise<boolean>
): Promise<boolean> {
  try {
    console.log(`🔄 Processing queued operation: ${operation.type} (${operation.id})`);
    
    const success = await executor(operation);
    
    if (success) {
      // Remove from queue on success
      await removeOperation(operation.id);
      console.log(`✅ Operation completed: ${operation.type} (${operation.id})`);
      return true;
    } else {
      // Increment retry count
      operation.retryCount++;
      operation.lastError = 'Execution failed';
      
      if (operation.retryCount >= operation.maxRetries) {
        console.error(`❌ Operation failed after ${operation.maxRetries} retries, removing: ${operation.id}`);
        await removeOperation(operation.id);
        return false;
      } else {
        console.warn(`⚠️ Operation failed, will retry (${operation.retryCount}/${operation.maxRetries}): ${operation.id}`);
        await updateOperation(operation);
        return false;
      }
    }
  } catch (error) {
    console.error(`❌ Error processing operation ${operation.id}:`, error);
    
    // Increment retry count
    operation.retryCount++;
    operation.lastError = error instanceof Error ? error.message : 'Unknown error';
    
    if (operation.retryCount >= operation.maxRetries) {
      console.error(`❌ Operation failed after ${operation.maxRetries} retries, removing: ${operation.id}`);
      await removeOperation(operation.id);
      return false;
    } else {
      await updateOperation(operation);
      return false;
    }
  }
}

/**
 * Process all queued operations
 * Returns number of successfully processed operations
 */
export async function processQueue(
  executor: (op: QueuedOperation) => Promise<boolean>
): Promise<{ processed: number; failed: number }> {
  // Check if online
  if (!isOnline()) {
    console.log('📴 Device is offline, skipping queue processing');
    return { processed: 0, failed: 0 };
  }

  const operations = await getPendingOperations();
  
  if (operations.length === 0) {
    console.log('✅ No queued operations to process');
    return { processed: 0, failed: 0 };
  }

  console.log(`🔄 Processing ${operations.length} queued operations...`);
  
  let processed = 0;
  let failed = 0;

  // Sort by creation time (FIFO)
  operations.sort((a, b) => a.createdAt - b.createdAt);

  // Process operations sequentially
  for (const operation of operations) {
    const success = await processOperation(operation, executor);
    if (success) {
      processed++;
    } else {
      failed++;
    }

    // Small delay between operations
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`✅ Queue processing complete: ${processed} processed, ${failed} failed`);
  return { processed, failed };
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<{
  totalCount: number;
  byType: Record<string, number>;
  oldestOperation?: QueuedOperation;
}> {
  try {
    const operations = await getPendingOperations();
    
    const byType: Record<string, number> = {};
    let oldestOperation: QueuedOperation | undefined;

    for (const op of operations) {
      byType[op.type] = (byType[op.type] || 0) + 1;
      
      if (!oldestOperation || op.createdAt < oldestOperation.createdAt) {
        oldestOperation = op;
      }
    }

    return {
      totalCount: operations.length,
      byType,
      oldestOperation,
    };
  } catch (error) {
    console.error('❌ Failed to get queue stats:', error);
    return {
      totalCount: 0,
      byType: {},
    };
  }
}

/**
 * Clear all queued operations (use with caution!)
 */
export async function clearQueue(): Promise<void> {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    await new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    console.log('🗑️ Cleared offline queue');
  } catch (error) {
    console.error('❌ Failed to clear queue:', error);
  }
}

/**
 * Set up automatic queue processing when coming back online
 */
export function setupAutoSync(
  executor: (op: QueuedOperation) => Promise<boolean>
): () => void {
  const handleOnline = async () => {
    console.log('🌐 Device back online, processing queued operations...');
    
    // Wait a bit for network to stabilize
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Process queue
    const result = await processQueue(executor);
    
    if (result.processed > 0) {
      console.log(`✅ Auto-sync complete: ${result.processed} operations synced`);
      
      // Dispatch custom event for UI updates
      window.dispatchEvent(new CustomEvent('adoras:sync-complete', {
        detail: { processed: result.processed, failed: result.failed }
      }));
    }
  };

  window.addEventListener('online', handleOnline);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
  };
}
