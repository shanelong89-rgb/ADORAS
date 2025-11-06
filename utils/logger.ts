/**
 * Production-optimized logger for Vercel
 * Automatically disabled in production, enabled in development
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isLocalhost = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
);

// Only log in development or localhost
const shouldLog = isDevelopment || isLocalhost;

export const logger = {
  log: (...args: any[]) => {
    if (shouldLog) console.log(...args);
  },
  
  info: (...args: any[]) => {
    if (shouldLog) console.info(...args);
  },
  
  warn: (...args: any[]) => {
    if (shouldLog) console.warn(...args);
  },
  
  error: (...args: any[]) => {
    // Always log errors, even in production
    console.error(...args);
  },
  
  // Special methods for important production logs
  production: (...args: any[]) => {
    console.log(...args);
  }
};

// For backward compatibility, export as default
export default logger;
