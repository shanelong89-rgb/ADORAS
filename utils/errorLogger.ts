/**
 * Error Logger for Adoras
 * Phase 3f: Centralized error logging and reporting
 */

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface LoggedError {
  id: string;
  timestamp: number;
  message: string;
  stack?: string;
  severity: ErrorSeverity;
  context?: Record<string, any>;
  userAgent?: string;
  url?: string;
  component?: string;
}

// In-memory error log (kept in browser)
const errorLog: LoggedError[] = [];
const MAX_ERRORS = 100; // Keep last 100 errors

/**
 * Log an error with context
 */
export function logError(
  error: Error | string,
  severity: ErrorSeverity = 'medium',
  context?: Record<string, any>
): LoggedError {
  const loggedError: LoggedError = {
    id: generateErrorId(),
    timestamp: Date.now(),
    message: typeof error === 'string' ? error : error.message,
    stack: typeof error === 'string' ? undefined : error.stack,
    severity,
    context,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
  };

  // Add to in-memory log
  errorLog.unshift(loggedError);
  
  // Keep only last MAX_ERRORS
  if (errorLog.length > MAX_ERRORS) {
    errorLog.pop();
  }

  // Log to console based on severity
  const consoleMethod = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
  console[consoleMethod]('🚨 Error logged:', {
    message: loggedError.message,
    severity: loggedError.severity,
    context: loggedError.context,
  });

  // Store in localStorage for persistence across sessions
  try {
    const storedErrors = getStoredErrors();
    storedErrors.unshift(loggedError);
    
    // Keep only last 50 errors in storage
    if (storedErrors.length > 50) {
      storedErrors.length = 50;
    }
    
    localStorage.setItem('adoras-error-log', JSON.stringify(storedErrors));
  } catch (e) {
    console.warn('Failed to store error in localStorage:', e);
  }

  // In production, you could send critical errors to a monitoring service
  if (severity === 'critical' && process.env.NODE_ENV === 'production') {
    sendErrorToMonitoring(loggedError);
  }

  return loggedError;
}

/**
 * Get all logged errors
 */
export function getErrorLog(): LoggedError[] {
  return [...errorLog];
}

/**
 * Get errors from localStorage
 */
export function getStoredErrors(): LoggedError[] {
  try {
    const stored = localStorage.getItem('adoras-error-log');
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Clear error log
 */
export function clearErrorLog(): void {
  errorLog.length = 0;
  try {
    localStorage.removeItem('adoras-error-log');
  } catch (e) {
    console.warn('Failed to clear error log from localStorage:', e);
  }
  console.log('✅ Error log cleared');
}

/**
 * Get error statistics
 */
export function getErrorStats(): {
  total: number;
  bySeverity: Record<ErrorSeverity, number>;
  recent: LoggedError[];
} {
  const bySeverity: Record<ErrorSeverity, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  errorLog.forEach((error) => {
    bySeverity[error.severity]++;
  });

  return {
    total: errorLog.length,
    bySeverity,
    recent: errorLog.slice(0, 5),
  };
}

/**
 * Generate unique error ID
 */
function generateErrorId(): string {
  return `err-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Send error to monitoring service (placeholder)
 * In production, integrate with Sentry, LogRocket, etc.
 */
function sendErrorToMonitoring(error: LoggedError): void {
  // Placeholder for monitoring service integration
  // Example: Sentry.captureException(error);
  console.log('📡 Would send error to monitoring service:', error.id);
}

/**
 * Setup global error handlers
 */
export function setupGlobalErrorHandlers(): () => void {
  // Handle unhandled promise rejections
  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    // Filter out clipboard API errors - these are expected and handled gracefully
    const reason = String(event.reason);
    if (
      reason.includes('Clipboard API') ||
      reason.includes('writeText') ||
      reason.includes('clipboard') ||
      reason.includes('NotAllowedError')
    ) {
      // Silently ignore clipboard errors - they have fallbacks
      event.preventDefault();
      return;
    }

    logError(
      new Error(`Unhandled Promise Rejection: ${event.reason}`),
      'high',
      { type: 'unhandled-rejection' }
    );
  };

  // Handle global errors
  const handleGlobalError = (event: ErrorEvent) => {
    // Filter out clipboard errors
    if (
      event.message?.includes('Clipboard') ||
      event.message?.includes('clipboard') ||
      event.message?.includes('writeText')
    ) {
      event.preventDefault();
      return;
    }

    logError(
      new Error(`Global Error: ${event.message}`),
      'high',
      {
        type: 'global-error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      }
    );
  };

  window.addEventListener('unhandledrejection', handleUnhandledRejection);
  window.addEventListener('error', handleGlobalError);

  // Return cleanup function
  return () => {
    window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    window.removeEventListener('error', handleGlobalError);
  };
}

/**
 * Log API error with context
 */
export function logApiError(
  endpoint: string,
  error: Error | string,
  context?: Record<string, any>
): LoggedError {
  return logError(error, 'medium', {
    type: 'api-error',
    endpoint,
    ...context,
  });
}

/**
 * Log network error
 */
export function logNetworkError(
  error: Error | string,
  context?: Record<string, any>
): LoggedError {
  return logError(error, 'medium', {
    type: 'network-error',
    ...context,
  });
}

/**
 * Log storage error (Supabase Storage, IndexedDB, etc.)
 */
export function logStorageError(
  operation: string,
  error: Error | string,
  context?: Record<string, any>
): LoggedError {
  return logError(error, 'medium', {
    type: 'storage-error',
    operation,
    ...context,
  });
}

/**
 * Log media error (upload, compression, playback, etc.)
 */
export function logMediaError(
  operation: string,
  error: Error | string,
  context?: Record<string, any>
): LoggedError {
  return logError(error, 'medium', {
    type: 'media-error',
    operation,
    ...context,
  });
}

/**
 * Export error log as JSON for debugging
 */
export function exportErrorLog(): string {
  const allErrors = [...getStoredErrors(), ...errorLog];
  return JSON.stringify(allErrors, null, 2);
}

/**
 * Download error log as file
 */
export function downloadErrorLog(): void {
  const log = exportErrorLog();
  const blob = new Blob([log], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `adoras-error-log-${new Date().toISOString()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  console.log('📥 Error log downloaded');
}
