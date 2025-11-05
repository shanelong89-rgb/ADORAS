/**
 * Performance Monitor for Adoras
 * Phase 3f: Track and analyze app performance metrics
 */

export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  timestamp: number;
  category: 'navigation' | 'render' | 'api' | 'media' | 'custom';
  metadata?: Record<string, any>;
}

// In-memory metrics storage
const metrics: PerformanceMetric[] = [];
const MAX_METRICS = 200;

// Performance observers
let navigationObserver: PerformanceObserver | null = null;
let resourceObserver: PerformanceObserver | null = null;

// Track first API call to detect cold starts
const firstApiCalls = new Set<string>();

/**
 * Initialize performance monitoring
 */
export function initPerformanceMonitoring(): () => void {
  console.log('🔍 Initializing performance monitoring...');

  // Monitor navigation timing
  if ('PerformanceObserver' in window) {
    try {
      // Navigation timing
      navigationObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            
            recordMetric('page-load', navEntry.loadEventEnd - navEntry.fetchStart, 'navigation', {
              domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.fetchStart,
              domInteractive: navEntry.domInteractive - navEntry.fetchStart,
            });
          }
        });
      });

      navigationObserver.observe({ entryTypes: ['navigation'] });

      // Resource timing (for API calls, images, etc.)
      resourceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'resource') {
            const resEntry = entry as PerformanceResourceTiming;
            
            // Only track API calls and large resources
            if (resEntry.name.includes('/functions/v1/') || resEntry.transferSize > 100000) {
              // Detect if this is the first call to a specific endpoint
              const endpoint = resEntry.name.split('/make-server-deded1eb/')[1]?.split('?')[0] || 'unknown';
              const isFirstCall = !firstApiCalls.has(endpoint);
              if (isFirstCall) {
                firstApiCalls.add(endpoint);
              }
              
              recordMetric(
                `resource-${resEntry.initiatorType}`,
                resEntry.duration,
                'media',
                {
                  name: resEntry.name,
                  size: resEntry.transferSize,
                  type: resEntry.initiatorType,
                  endpoint,
                  coldStart: isFirstCall,
                }
              );
            }
          }
        });
      });

      resourceObserver.observe({ entryTypes: ['resource'] });
    } catch (error) {
      console.warn('⚠️ Failed to setup PerformanceObserver:', error);
    }
  }

  // Cleanup function
  return () => {
    navigationObserver?.disconnect();
    resourceObserver?.disconnect();
  };
}

/**
 * Record a performance metric
 */
export function recordMetric(
  name: string,
  value: number,
  category: PerformanceMetric['category'] = 'custom',
  metadata?: Record<string, any>
): PerformanceMetric {
  const metric: PerformanceMetric = {
    id: `metric-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    name,
    value,
    timestamp: Date.now(),
    category,
    metadata,
  };

  metrics.unshift(metric);

  // Keep only last MAX_METRICS
  if (metrics.length > MAX_METRICS) {
    metrics.pop();
  }

  // Log slow operations, but be more lenient with API calls
  const isColdStart = metadata?.coldStart === true;
  const isApiCall = metadata?.name?.includes('/functions/v1/');
  const isHealthCheck = metadata?.endpoint === 'health';
  const isAIEndpoint = metadata?.endpoint?.includes('ai/');
  const isAuthEndpoint = metadata?.endpoint?.includes('auth/');
  const isConnectionEndpoint = metadata?.endpoint === 'connections' || metadata?.endpoint?.includes('ensure-connected');
  const isMemoryFetch = metadata?.endpoint?.includes('memories/');
  
  // Different thresholds for different operation types
  let threshold = 1000; // Default 1 second
  
  if (isApiCall) {
    // AI endpoints can be very slow (external API calls to OpenAI/Groq)
    if (isAIEndpoint) {
      threshold = 10000; // AI calls up to 10s are acceptable
    }
    // Auth and connection endpoints: Higher threshold for cold starts (server needs to boot)
    else if ((isAuthEndpoint || isConnectionEndpoint) && isColdStart) {
      threshold = 18000; // Auth/connection cold starts up to 18s are expected (Supabase Edge Function cold boot + DB queries)
    }
    // Memory fetches can be slow (large payloads, media URLs, etc.)
    else if (isMemoryFetch) {
      threshold = 5000; // Memory fetches up to 5s are acceptable
    }
    // API calls: 3 seconds threshold (cold starts can be slow)
    // Health check cold starts are expected - use higher threshold
    else if (isHealthCheck && isColdStart) {
      threshold = 10000; // Health check cold starts up to 10s are fine
    } else {
      threshold = isColdStart ? 6000 : 3000;
    }
  } else if (category === 'render') {
    // Renders should be fast: 100ms threshold
    threshold = 100;
  } else if (category === 'navigation') {
    // Page loads: 2 seconds threshold
    threshold = 2000;
  }
  
  if (value > threshold) {
    const coldStartNote = isColdStart ? ' (cold start - expected)' : '';
    console.warn(`⚠️ Slow operation detected: ${name} took ${value.toFixed(0)}ms${coldStartNote}`, metadata);
  } else if (isColdStart && value > 1000) {
    // Log cold starts informatively only if they're interesting (over 3s)
    if (value > 3000) {
      console.log(`🔥 Cold start: ${name} took ${value.toFixed(0)}ms`, metadata);
    }
  }

  return metric;
}

/**
 * Measure function execution time
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  category: PerformanceMetric['category'] = 'custom'
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    recordMetric(name, duration, category, { success: true });
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    recordMetric(name, duration, category, { success: false, error: (error as Error).message });
    throw error;
  }
}

/**
 * Measure synchronous function execution time
 */
export function measure<T>(
  name: string,
  fn: () => T,
  category: PerformanceMetric['category'] = 'custom'
): T {
  const start = performance.now();
  try {
    const result = fn();
    const duration = performance.now() - start;
    recordMetric(name, duration, category, { success: true });
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    recordMetric(name, duration, category, { success: false, error: (error as Error).message });
    throw error;
  }
}

/**
 * Get all recorded metrics
 */
export function getMetrics(): PerformanceMetric[] {
  return [...metrics];
}

/**
 * Get metrics by category
 */
export function getMetricsByCategory(
  category: PerformanceMetric['category']
): PerformanceMetric[] {
  return metrics.filter((m) => m.category === category);
}

/**
 * Get performance statistics
 */
export function getPerformanceStats(): {
  totalMetrics: number;
  byCategory: Record<string, number>;
  avgByCategory: Record<string, number>;
  slowOperations: PerformanceMetric[];
} {
  const byCategory: Record<string, number> = {};
  const sumsByCategory: Record<string, number> = {};
  const countsByCategory: Record<string, number> = {};

  metrics.forEach((metric) => {
    byCategory[metric.category] = (byCategory[metric.category] || 0) + 1;
    sumsByCategory[metric.category] = (sumsByCategory[metric.category] || 0) + metric.value;
    countsByCategory[metric.category] = (countsByCategory[metric.category] || 0) + 1;
  });

  const avgByCategory: Record<string, number> = {};
  Object.keys(sumsByCategory).forEach((category) => {
    avgByCategory[category] = sumsByCategory[category] / countsByCategory[category];
  });

  const slowOperations = metrics
    .filter((m) => m.value > 1000)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  return {
    totalMetrics: metrics.length,
    byCategory,
    avgByCategory,
    slowOperations,
  };
}

/**
 * Get Core Web Vitals (LCP, FID, CLS)
 */
export function getCoreWebVitals(): Promise<{
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
}> {
  return new Promise((resolve) => {
    const vitals: any = {};

    if ('PerformanceObserver' in window) {
      try {
        // LCP
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          vitals.lcp = lastEntry.renderTime || lastEntry.loadTime;
          lcpObserver.disconnect();
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

        // FID
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            vitals.fid = entry.processingStart - entry.startTime;
          });
          fidObserver.disconnect();
        });
        fidObserver.observe({ entryTypes: ['first-input'] });

        // CLS
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
              vitals.cls = clsValue;
            }
          });
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });

        // Resolve after 5 seconds (give time to collect metrics)
        setTimeout(() => {
          lcpObserver.disconnect();
          fidObserver.disconnect();
          clsObserver.disconnect();
          resolve(vitals);
        }, 5000);
      } catch (error) {
        console.warn('⚠️ Failed to collect Core Web Vitals:', error);
        resolve({});
      }
    } else {
      resolve({});
    }
  });
}

/**
 * Get memory usage (if available)
 */
export function getMemoryUsage(): {
  used?: number;
  total?: number;
  percentage?: number;
} | null {
  if ('memory' in performance && (performance as any).memory) {
    const memory = (performance as any).memory;
    return {
      used: memory.usedJSHeapSize,
      total: memory.jsHeapSizeLimit,
      percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
    };
  }
  return null;
}

/**
 * Clear metrics
 */
export function clearMetrics(): void {
  metrics.length = 0;
  console.log('✅ Performance metrics cleared');
}

/**
 * Export metrics as JSON
 */
export function exportMetrics(): string {
  const stats = getPerformanceStats();
  const webVitals = getCoreWebVitals();
  const memoryUsage = getMemoryUsage();

  return JSON.stringify(
    {
      timestamp: new Date().toISOString(),
      stats,
      webVitals,
      memoryUsage,
      metrics: metrics.slice(0, 50), // Export last 50 metrics
    },
    null,
    2
  );
}

/**
 * Download metrics as file
 */
export function downloadMetrics(): void {
  const data = exportMetrics();
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `adoras-performance-${new Date().toISOString()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  console.log('📥 Performance metrics downloaded');
}

/**
 * React hook for measuring component render time
 */
export function usePerformanceMonitor(componentName: string) {
  const renderStart = performance.now();

  return () => {
    const renderTime = performance.now() - renderStart;
    recordMetric(`render-${componentName}`, renderTime, 'render');
  };
}