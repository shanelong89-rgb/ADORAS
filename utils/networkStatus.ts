/**
 * Network Status Utility for Adoras
 * Phase 3e: Detect online/offline state and monitor network changes
 */

import { useState, useEffect } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  effectiveType?: string; // '4g', '3g', '2g', 'slow-2g'
  downlink?: number; // Mbps
  rtt?: number; // Round-trip time in ms
}

/**
 * React hook to monitor network status
 * Returns real-time network state including online/offline and connection quality
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSlowConnection: false,
  });

  useEffect(() => {
    // Update online/offline status
    const updateOnlineStatus = () => {
      const connection = getConnectionInfo();
      setStatus({
        isOnline: navigator.onLine,
        isSlowConnection: connection.isSlowConnection,
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
      });
    };

    // Listen for online/offline events
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Listen for connection changes (if supported)
    const connection = getNavigatorConnection();
    if (connection) {
      connection.addEventListener('change', updateOnlineStatus);
    }

    // Initial check
    updateOnlineStatus();

    // Cleanup
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      if (connection) {
        connection.removeEventListener('change', updateOnlineStatus);
      }
    };
  }, []);

  return status;
}

/**
 * Get Navigator Connection API if available
 */
function getNavigatorConnection(): any {
  if (typeof navigator === 'undefined') return null;
  
  return (
    (navigator as any).connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection
  );
}

/**
 * Get connection information from Network Information API
 */
function getConnectionInfo() {
  const connection = getNavigatorConnection();
  
  if (!connection) {
    return {
      isSlowConnection: false,
      effectiveType: undefined,
      downlink: undefined,
      rtt: undefined,
    };
  }

  // Determine if connection is slow
  const effectiveType = connection.effectiveType || '';
  const isSlowConnection = 
    effectiveType === 'slow-2g' || 
    effectiveType === '2g' || 
    connection.saveData === true ||
    (connection.downlink && connection.downlink < 1); // Less than 1 Mbps

  return {
    isSlowConnection,
    effectiveType,
    downlink: connection.downlink,
    rtt: connection.rtt,
  };
}

/**
 * Check if currently online (non-hook version for use outside React)
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * Wait for network to come back online
 * Returns a promise that resolves when online
 */
export function waitForOnline(timeoutMs: number = 30000): Promise<boolean> {
  return new Promise((resolve) => {
    if (isOnline()) {
      resolve(true);
      return;
    }

    const timeout = setTimeout(() => {
      window.removeEventListener('online', onlineHandler);
      resolve(false); // Timeout reached
    }, timeoutMs);

    const onlineHandler = () => {
      clearTimeout(timeout);
      window.removeEventListener('online', onlineHandler);
      resolve(true);
    };

    window.addEventListener('online', onlineHandler);
  });
}

/**
 * Execute a function with retry logic on network failure
 */
export async function withNetworkRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    waitForOnline?: boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    waitForOnline: shouldWaitForOnline = true,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Wait for online if offline and option is enabled
      if (shouldWaitForOnline && !isOnline()) {
        console.log(`🔄 Offline detected, waiting for network... (attempt ${attempt + 1}/${maxRetries})`);
        const online = await waitForOnline(10000);
        if (!online) {
          throw new Error('Network timeout: Device is offline');
        }
      }

      // Execute function
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.warn(`⚠️ Network operation failed (attempt ${attempt + 1}/${maxRetries}):`, lastError.message);

      // Don't retry if it's not a network error
      const isNetworkError = 
        lastError.message.includes('network') ||
        lastError.message.includes('fetch') ||
        lastError.message.includes('timeout') ||
        lastError.message.includes('offline');

      if (!isNetworkError) {
        throw lastError; // Non-network error, don't retry
      }

      // Wait before retrying (except on last attempt)
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
      }
    }
  }

  // All retries failed
  throw lastError || new Error('Network operation failed after retries');
}
