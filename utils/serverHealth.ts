/**
 * Server Health Check Utility
 * Optimized health checks with caching and fast timeouts
 */

import { projectId, publicAnonKey } from './supabase/info';

const HEALTH_CHECK_URL = `https://${projectId}.supabase.co/functions/v1/make-server-deded1eb/health`;
const HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds max (reduced for faster feedback)
const CACHE_DURATION = 60000; // Cache result for 60 seconds (reduced health check frequency)

interface HealthCheckResult {
  online: boolean;
  timestamp: number;
  latency?: number;
  error?: string;
}

let cachedResult: HealthCheckResult | null = null;
let lastCheckTime = 0;

/**
 * Check if the backend server is online
 * Uses caching to avoid repeated slow checks
 */
export async function checkServerHealth(forceRefresh = false): Promise<HealthCheckResult> {
  const now = Date.now();
  
  // Return cached result if fresh and not forcing refresh
  if (!forceRefresh && cachedResult && (now - lastCheckTime < CACHE_DURATION)) {
    return cachedResult;
  }

  const startTime = Date.now();
  
  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);
    
    const response = await fetch(HEALTH_CHECK_URL, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      // Disable caching to avoid stale responses
      cache: 'no-store',
    });
    
    clearTimeout(timeoutId);
    
    const latency = Date.now() - startTime;
    
    if (response.ok) {
      // Don't parse JSON if not needed - faster response
      cachedResult = {
        online: true,
        timestamp: now,
        latency,
      };
      
      lastCheckTime = now;
      
      // Only log if slow (>2 seconds) to reduce console noise
      if (latency > 2000) {
        console.warn(`⚠️ Slow health check: ${latency}ms (server may be cold-starting)`);
      } else {
        console.log(`✅ Server online (${latency}ms)`);
      }
      
      return cachedResult;
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
  } catch (error) {
    const latency = Date.now() - startTime;
    
    let errorMessage = 'Unknown error';
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = `Timeout after ${HEALTH_CHECK_TIMEOUT}ms`;
      } else if (error.message.includes('fetch')) {
        errorMessage = 'Network error - server not reachable';
      } else {
        errorMessage = error.message;
      }
    }
    
    cachedResult = {
      online: false,
      timestamp: now,
      latency,
      error: errorMessage,
    };
    
    lastCheckTime = now;
    console.warn(`❌ Server health check failed (${latency}ms):`, errorMessage);
    
    return cachedResult;
  }
}

/**
 * Get cached server status without making a new request
 */
export function getCachedServerStatus(): HealthCheckResult | null {
  const now = Date.now();
  
  if (cachedResult && (now - lastCheckTime < CACHE_DURATION)) {
    return cachedResult;
  }
  
  return null;
}

/**
 * Clear the health check cache
 */
export function clearHealthCache(): void {
  cachedResult = null;
  lastCheckTime = 0;
}

/**
 * Check if server is likely online based on cached data
 */
export function isServerLikelyOnline(): boolean {
  const cached = getCachedServerStatus();
  return cached?.online ?? false;
}

/**
 * Get server latency from last successful check
 */
export function getServerLatency(): number | null {
  return cachedResult?.latency ?? null;
}