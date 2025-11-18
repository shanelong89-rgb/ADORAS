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
  // Badge recalibration removed - happens automatically after memories load
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
      
      // Step 2: Reload memories for active connection only (for viewing)
      // Badge recalibration happens automatically after memories load via recalculateUnreadCounts
      console.log('📡 Step 2: Reloading memories for active connection...');
      const activeConnectionId = userType === 'keeper' ? activeStorytellerId : activeLegacyKeeperId;
      const allConnectionIds = userType === 'keeper' 
        ? storytellers.map(s => s.id) 
        : legacyKeepers.map(k => k.id);
      
      if (activeConnectionId && allConnectionIds.includes(activeConnectionId)) {
        // Load ONLY active connection (user is viewing this one)
        // Badge counts will be recalculated automatically after memories load
        console.log(`📦 Fetching messages for active connection: ${activeConnectionId}`);
        await loadMemoriesForConnection(activeConnectionId, true);
        console.log('ℹ️ Background connections NOT loaded (optimized for speed)');
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
  ]);
}
