/**
 * usePWAVisibilitySync Hook
 * Handles PWA foreground/background synchronization for iOS
 * 
 * This hook sets up the PWA visibility handler to re-sync data
 * when the app comes back to the foreground (iOS-specific behavior).
 */

import { useEffect } from 'react';
import { pwaVisibilityHandler } from '../pwaVisibilityHandler';
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
      
      // Step 1: Reload connections (in case partner sent connection requests)
      console.log('📡 Step 1: Reloading connections...');
      await loadConnectionsFromAPI();
      
      // Step 2: Reload memories for ALL connections (not just active)
      // This ensures unread badge counts are accurate after backgrounding
      console.log('📡 Step 2: Reloading memories for all connections...');
      const activeConnectionId = userType === 'keeper' ? activeStorytellerId : activeLegacyKeeperId;
      const allConnectionIds = userType === 'keeper' 
        ? storytellers.map(s => s.id) 
        : legacyKeepers.map(k => k.id);
      
      if (activeConnectionId && allConnectionIds.includes(activeConnectionId)) {
        // Load active connection FIRST (priority)
        console.log(`📦 Fetching messages for active connection: ${activeConnectionId}`);
        await loadMemoriesForConnection(activeConnectionId, true);
        
        // Then load all other connections in background (for badge counts)
        const otherConnectionIds = allConnectionIds.filter(id => id !== activeConnectionId);
        if (otherConnectionIds.length > 0) {
          console.log(`📦 Fetching messages for ${otherConnectionIds.length} other connection(s) in background (for badge counts)...`);
          Promise.all(otherConnectionIds.map(id => {
            console.log(`   → Loading memories for ${id}...`);
            return loadMemoriesForConnection(id, false);
          })).catch(err => {
            console.warn('⚠️ Some background memory loads failed:', err);
          });
        } else {
          console.log('ℹ️ No other connections to load in background');
        }
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
