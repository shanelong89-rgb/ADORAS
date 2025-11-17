/**
 * useRealtimeSetup Hook
 * Main hook for setting up real-time synchronization
 * 
 * This hook orchestrates the entire realtime setup process:
 * - Manages connection/disconnection logic
 * - Subscribes to realtime channels
 * - Registers callbacks for presence and memory updates
 * - Handles connection switching
 */

import { useEffect, useRef } from 'react';
import { realtimeSync } from '../realtimeSync';
import type { UserType, User, Storyteller, LegacyKeeper } from '../../App';

interface UseRealtimeSetupParams {
  user: User | null;
  userType: UserType;
  activeStorytellerId: string;
  activeLegacyKeeperId: string;
  storytellers: Storyteller[];
  legacyKeepers: LegacyKeeper[];
  handlePresenceChange: (connectionId: string, presenceState: any) => void;
  handleMemoryUpdate: (update: any) => Promise<void>;
  setRealtimeConnected: React.Dispatch<React.SetStateAction<boolean>>;
  setPresences: React.Dispatch<React.SetStateAction<Record<string, any>>>;
}

export function useRealtimeSetup(params: UseRealtimeSetupParams) {
  const {
    user,
    userType,
    activeStorytellerId,
    activeLegacyKeeperId,
    storytellers,
    legacyKeepers,
    handlePresenceChange,
    handleMemoryUpdate,
    setRealtimeConnected,
    setPresences,
  } = params;

  // Ref to store setupRealtime function for external access
  const setupRealtimeRef = useRef<(() => Promise<void>) | null>(null);

  // Track previous connection ID to detect changes vs initial setup
  const prevRealtimeConnectionRef = useRef<{
    userType: string | null;
    userId: string | undefined;
    connectionId: string | undefined;
  }>({
    userType: null,
    userId: undefined,
    connectionId: undefined,
  });

  useEffect(() => {
    let unsubscribePresence: (() => void) | null = null;
    let unsubscribeMemoryUpdates: (() => void) | null = null;
    let isCleanedUp = false; // Track if this subscription has been cleaned up

    const setupRealtime = async () => {
      console.log('🔧 [REALTIME-SETUP] setupRealtime() called', {
        hasUser: !!user,
        userId: user?.id,
        userType,
        activeStorytellerId,
        activeLegacyKeeperId
      });
      
      // Only connect if user is authenticated
      if (!user) {
        console.log('⚠️ [REALTIME-SETUP] No user - skipping realtime setup');
        return;
      }

      // Only subscribe to ACTIVE connection (prevents badge bleeding)
      const activeConnectionId = userType === 'keeper' ? activeStorytellerId : activeLegacyKeeperId;
      
      console.log('🎯 [REALTIME-SETUP] Active connection ID:', activeConnectionId);
      
      if (!activeConnectionId) {
        console.log('ℹ️ [REALTIME-SETUP] No active connection to subscribe to');
        return;
      }

      // Check if this is a TRUE change (not initial setup)
      const prev = prevRealtimeConnectionRef.current;
      const isUserChanged = prev.userId !== user.id;
      const isTypeChanged = prev.userType !== userType;
      const isConnectionChanged = prev.connectionId !== undefined && prev.connectionId !== activeConnectionId;
      
      // Only cleanup if user, type, or connection actually changed (not initial setup)
      if (isUserChanged || isTypeChanged) {
        console.log(`🔄 User or type changed - reconnecting realtime`);
        await realtimeSync.disconnectAll();
      } else if (isConnectionChanged) {
        console.log(`🔄 Connection changed from ${prev.connectionId} to ${activeConnectionId} - switching channel`);
        // Don't return early - we need to re-register callbacks for the new connection
        // The callbacks were cleared by disconnectAll() when switching connections
        console.log(`🔄 Re-registering callbacks for new connection...`);
        // Note: we don't call disconnectAll() here because channels are already set up
        // We just need to update the active connection and re-register callbacks
        realtimeSync.setActiveConnection(activeConnectionId);
      } else {
        console.log(`ℹ️ Initial realtime setup for ${activeConnectionId}`);
      }
      
      // Update tracking ref
      prevRealtimeConnectionRef.current = {
        userType,
        userId: user.id,
        connectionId: activeConnectionId,
      };

      // Subscribe to ALL connections to receive messages from any connection
      // This allows sidebar badges to update even when user is in a different chat
      // Use storytellers/legacyKeepers since connections have been transformed
      const allConnectionIds = userType === 'keeper'
        ? storytellers.map(s => s.id).filter(Boolean)
        : legacyKeepers.map(k => k.id).filter(Boolean);
      
      // If no connections loaded yet, at least subscribe to active one
      if (allConnectionIds.length === 0 && activeConnectionId) {
        allConnectionIds.push(activeConnectionId);
      }

      console.log(`📡 Setting up realtime sync for ${allConnectionIds.length} connection(s):`, allConnectionIds);

      try {
        // Register callbacks BEFORE subscribing to channels to prevent race conditions
        
        // Subscribe to presence updates (now receives connectionId)
        unsubscribePresence = realtimeSync.onPresenceChange((connectionId, presenceState) => {
          if (isCleanedUp) return; // Ignore stale callbacks
          handlePresenceChange(connectionId, presenceState);
        });

        // Subscribe to memory updates from other clients
        unsubscribeMemoryUpdates = realtimeSync.onMemoryUpdate(async (update) => {
          if (isCleanedUp) {
            console.log(`⚠️ IGNORING stale realtime update for ${update.connectionId} (subscription cleaned up)`);
            return; // Ignore stale callbacks
          }
          await handleMemoryUpdate(update);
        });

        // NOW subscribe to connections (after callbacks are registered)
        // This prevents race conditions where broadcasts arrive before callbacks exist
        await realtimeSync.subscribeToConnections({
          connectionIds: allConnectionIds,
          userId: user.id,
          userName: user.name,
          activeConnectionId,
        });

        setRealtimeConnected(true);
        console.log('✅ Realtime sync setup complete with callbacks registered first');

      } catch (error) {
        console.error('❌ Failed to setup real-time sync:', error);
        console.log('ℹ️ App will continue to work without real-time features');
        setRealtimeConnected(false);
        // Don't show error to user - real-time is optional
      }
    };

    // Store setupRealtime function for external access
    setupRealtimeRef.current = setupRealtime;

    setupRealtime();

    // Cleanup on unmount or when effect re-runs
    return () => {
      isCleanedUp = true; // Mark as cleaned up to prevent stale callbacks
      
      if (unsubscribePresence) {
        unsubscribePresence();
      }
      if (unsubscribeMemoryUpdates) {
        unsubscribeMemoryUpdates();
      }
      // Don't call disconnectAll here - setupRealtime handles disconnection intelligently
      setPresences({});
    };
    // Watch for changes - but setupRealtime() will decide if cleanup is needed
  }, [
    userType,
    activeStorytellerId,
    activeLegacyKeeperId,
    user?.id,
    handlePresenceChange,
    handleMemoryUpdate,
    setRealtimeConnected,
    setPresences,
    storytellers,
    legacyKeepers,
  ]);

  /**
   * Update active connection in realtime sync when switching chats
   * This is separate from the main effect to avoid unnecessary re-subscriptions
   */
  useEffect(() => {
    const activeConnectionId = userType === 'keeper' ? activeStorytellerId : activeLegacyKeeperId;
    
    if (activeConnectionId) {
      console.log(`🎯 Updating active connection in realtime: ${activeConnectionId}`);
      realtimeSync.setActiveConnection(activeConnectionId);
    }
  }, [activeStorytellerId, activeLegacyKeeperId, userType]);

  // Return setupRealtime function for external use (e.g., PWA visibility handler)
  return {
    triggerReconnect: async () => {
      if (setupRealtimeRef.current) {
        await setupRealtimeRef.current();
      }
    },
  };
}
