/**
 * useRealtimePresence Hook
 * Handles real-time presence tracking for connections
 * 
 * This hook processes incoming presence updates and manages
 * the presence state for all active connections.
 */

import { useCallback } from 'react';
import type { PresenceState } from '../realtimeSync';

interface UseRealtimePresenceParams {
  activeConnectionId: string;
  setPresences: React.Dispatch<React.SetStateAction<Record<string, PresenceState>>>;
}

export function useRealtimePresence(params: UseRealtimePresenceParams) {
  const { activeConnectionId, setPresences } = params;

  /**
   * Handle incoming presence updates from realtime channels
   * 
   * Note: Presence updates happen frequently, so logging is minimal
   * For now, we only track presence for the active connection
   */
  const handlePresenceChange = useCallback((connectionId: string, presenceState: PresenceState) => {
    // Reduced logging - presence updates happen frequently
    // console.log(`👥 Presence updated for ${connectionId}:`, presenceState);
    
    // For now, only track presence for active connection
    if (connectionId === activeConnectionId) {
      setPresences(presenceState);
    }
  }, [activeConnectionId, setPresences]);

  return {
    handlePresenceChange,
  };
}
