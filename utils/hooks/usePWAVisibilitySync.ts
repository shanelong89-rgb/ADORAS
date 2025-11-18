/**
 * usePWAVisibilitySync Hook
 * Handles PWA foreground/background synchronization for iOS
 * 
 * This hook sets up the PWA visibility handler to re-sync data
 * when the app comes back to the foreground (iOS-specific behavior).
 */

import { useEffect } from 'react';
import { pwaVisibilityHandler } from '../pwaVisibilityHandler';
import { getPersistedBadge } from '../sidebarUtils';
import type { UserType, Storyteller, LegacyKeeper } from '../../App';

interface UsePWAVisibilitySyncParams {
  userType: UserType;
  activeStorytellerId: string;
  activeLegacyKeeperId: string;
  storytellers: Storyteller[];
  legacyKeepers: LegacyKeeper[];
  loadConnectionsFromAPI: () => Promise<void>;
  loadMemoriesForConnection: (connectionId: string, isActiveConnection: boolean) => Promise<void>;
  setupRealtime: () => Promise<void>;
  fetchAndUpdateUnreadSummary?: () => Promise<void>; // NEW: For badge recalibration
}

export function usePWAVisibilitySync(params: UsePWAVisibilitySyncParams) {
  const {
    userType,
    activeStorytellerId,
    activeLegacyKeeperId,
    storytellers,
    legacyKeepers,
    loadConnectionsFromAPI,
    loadMemoriesForConnection,
    setupRealtime,
    fetchAndUpdateUnreadSummary,
  } = params;

  useEffect(() => {
    // Initialize PWA visibility handler for iOS foreground/background sync
    pwaVisibilityHandler.initialize(async () => {
      console.log('🔄 PWA came to foreground - re-syncing...');
      
      // CRITICAL: Read persisted badge count FIRST for instant display
      // This shows the badge immediately without waiting for API
      const persistedBadgeCount = await getPersistedBadge();
      if (persistedBadgeCount > 0 && 'setAppBadge' in navigator) {
        try {
          await (navigator as any).setAppBadge(persistedBadgeCount);
          console.log(`📱 [INSTANT-BADGE] Restored badge from persistence: ${persistedBadgeCount} unread`);
        } catch (error) {
          console.error('❌ Failed to restore badge:', error);
        }
      }
      
      // Step 1: Reload connections (in case partner sent connection requests)
      console.log('📡 Step 1: Reloading connections...');
      await loadConnectionsFromAPI();
      
      // Step 1.5: Fetch unread summary from backend for accurate badge counts
      // This is MUCH faster than loading all memories for all connections
      if (fetchAndUpdateUnreadSummary) {
        console.log('📊 Step 1.5: Fetching unread summary from backend...');
        await fetchAndUpdateUnreadSummary();
      }
      
      // Step 2: Reload memories for active connection only (for viewing)
      // Background connection badges are updated via the unread summary API
      console.log('📡 Step 2: Reloading memories for active connection...');
      const activeConnectionId = userType === 'keeper' ? activeStorytellerId : activeLegacyKeeperId;
      const allConnectionIds = userType === 'keeper' 
        ? storytellers.map(s => s.id) 
        : legacyKeepers.map(k => k.id);
      
      if (activeConnectionId && allConnectionIds.includes(activeConnectionId)) {
        // Load ONLY active connection (user is viewing this one)
        // Badge counts for background connections are already updated via unread summary API
        console.log(`📦 Fetching messages for active connection: ${activeConnectionId}`);
        await loadMemoriesForConnection(activeConnectionId, true);
        console.log('ℹ️ Background connections NOT loaded (badges updated via API)');
      } else {
        console.log('⚠️ No active connection or connection list empty - skipping memory reload');
      }
      
      // Step 3: Reconnect realtime channels
      console.log('📡 Step 3: Reconnecting realtime...');
      await setupRealtime();
    });

    // Cleanup on unmount
    return () => {
      pwaVisibilityHandler.cleanup();
    };
  }, [
    userType,
    activeStorytellerId,
    activeLegacyKeeperId,
    storytellers,
    legacyKeepers,
    loadConnectionsFromAPI,
    loadMemoriesForConnection,
    setupRealtime,
    fetchAndUpdateUnreadSummary, // Include in deps
  ]);
}
