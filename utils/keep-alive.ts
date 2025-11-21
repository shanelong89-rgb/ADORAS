/**
 * Keep-Alive Utility
 * Prevents Supabase Edge Function cold starts by periodically pinging the server
 */

const PING_INTERVAL = 4 * 60 * 1000; // 4 minutes (cold start happens after ~5 mins)
const PING_ENDPOINT = '/make-server-deded1eb/ping';

let pingIntervalId: number | null = null;
let isAppActive = true;

/**
 * Ping the server to keep it warm
 */
async function pingServer(): Promise<void> {
  // Only ping if app is active
  if (!isAppActive) {
    return; // Silent skip
  }

  try {
    const projectId = (await import('./supabase/info.tsx')).projectId;
    const publicAnonKey = (await import('./supabase/info.tsx')).publicAnonKey;
    
    const url = `https://${projectId}.supabase.co/functions/v1${PING_ENDPOINT}`;
    
    const startTime = performance.now();
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    });

    const latency = Math.round(performance.now() - startTime);

    if (response.ok) {
      // Only log if it's slow (potential cold start) or first ping
      if (latency > 1000) {
        console.log(`🏓 [KEEP-ALIVE] Pong (${latency}ms - prevented cold start)`);
      }
      // Silent success for fast pings
    } else {
      console.warn('⚠️ [KEEP-ALIVE] Ping failed:', response.status);
    }
  } catch (error) {
    console.error('❌ [KEEP-ALIVE] Ping error:', error);
  }
}

/**
 * Start the keep-alive system
 */
export function startKeepAlive(): void {
  // Don't start if already running
  if (pingIntervalId !== null) {
    return; // Silent skip
  }

  console.log(`🚀 [KEEP-ALIVE] Started (pings every ${PING_INTERVAL / 60 / 1000} min to prevent cold starts)`);

  // Ping immediately to pre-warm on app load
  pingServer();

  // Set up periodic pings
  pingIntervalId = window.setInterval(() => {
    pingServer();
  }, PING_INTERVAL);

  // Listen for visibility changes to pause when app is hidden
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // Listen for page hide (iOS specific)
  window.addEventListener('pagehide', handlePageHide);
  window.addEventListener('pageshow', handlePageShow);
}

/**
 * Stop the keep-alive system
 */
export function stopKeepAlive(): void {
  if (pingIntervalId !== null) {
    console.log('🛑 [KEEP-ALIVE] Stopped');
    clearInterval(pingIntervalId);
    pingIntervalId = null;
  }

  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.removeEventListener('pagehide', handlePageHide);
  window.removeEventListener('pageshow', handlePageShow);
}

/**
 * Handle visibility changes
 */
function handleVisibilityChange(): void {
  if (document.hidden) {
    isAppActive = false;
    // Silent pause
  } else {
    isAppActive = true;
    console.log('▶️ [KEEP-ALIVE] Resuming (app visible)');
    // Ping immediately when app becomes visible again
    pingServer();
  }
}

/**
 * Handle page hide (iOS)
 */
function handlePageHide(): void {
  isAppActive = false;
  // Silent pause
}

/**
 * Handle page show (iOS)
 */
function handlePageShow(): void {
  isAppActive = true;
  console.log('▶️ [KEEP-ALIVE] Resuming (page visible)');
  // Ping immediately when app becomes visible again
  pingServer();
}

/**
 * Get keep-alive status
 */
export function getKeepAliveStatus(): { running: boolean; active: boolean } {
  return {
    running: pingIntervalId !== null,
    active: isAppActive,
  };
}
