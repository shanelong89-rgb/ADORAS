/**
 * useRealtimeMemorySync Hook
 * Handles real-time memory updates (create, update, delete)
 * 
 * This hook processes incoming memory updates from realtime channels
 * and updates both per-connection caches and global memory state.
 */

import { useRef, useCallback } from 'react';
import type { Memory, UserType } from '../../App';
import type { MemoryUpdate } from '../realtimeSync';
import { memoryExists } from '../memoryUtils';

interface UseRealtimeMemorySyncParams {
  userId: string | undefined;
  userType: UserType;
  activeConnectionId: string;
  convertApiMemoryToUIMemory: (apiMemory: any) => Memory;
  updateSidebarLastMessage: (connectionId: string) => void;
  setMemories: React.Dispatch<React.SetStateAction<Memory[]>>;
  setMemoriesByStoryteller: React.Dispatch<React.SetStateAction<Record<string, Memory[]>>>;
  setMemoriesByLegacyKeeper: React.Dispatch<React.SetStateAction<Record<string, Memory[]>>>;
}

export function useRealtimeMemorySync(params: UseRealtimeMemorySyncParams) {
  const {
    userId,
    userType,
    activeConnectionId,
    convertApiMemoryToUIMemory,
    updateSidebarLastMessage,
    setMemories,
    setMemoriesByStoryteller,
    setMemoriesByLegacyKeeper,
  } = params;

  // Use refs to access current values in callbacks (avoid stale closures)
  const userTypeRef = useRef<UserType>(userType);
  const activeConnectionIdRef = useRef<string>(activeConnectionId);

  // Update refs when values change
  userTypeRef.current = userType;
  activeConnectionIdRef.current = activeConnectionId;

  /**
   * Handle incoming memory updates from realtime channels
   */
  const handleMemoryUpdate = useCallback(async (update: MemoryUpdate) => {
    try {
      // Use refs to get current active connection (not closure values)
      const currentUserType = userTypeRef.current;
      const currentActiveConnectionId = activeConnectionIdRef.current;
      const isActiveConnection = update.connectionId === currentActiveConnectionId;

      console.log('📡 Received memory update:', update, { 
        currentActiveConnectionId,
        updateConnectionId: update.connectionId,
        isForCurrentConnection: isActiveConnection
      });

      // Ignore updates from ourselves (current user)
      if (update.userId === userId) {
        console.log('   ℹ️ Ignoring update from self');
        return;
      }
      
      console.log(`   🎯 Update is for ${isActiveConnection ? 'ACTIVE' : 'BACKGROUND'} connection (active: ${currentActiveConnectionId}, update: ${update.connectionId})`);

      // Handle different update types
      if (update.action === 'create' && update.memory) {
        handleMemoryCreate(update, isActiveConnection, currentUserType);
      } else if (update.action === 'update' && update.memory) {
        handleMemoryUpdateAction(update, isActiveConnection, currentUserType);
      } else if (update.action === 'delete') {
        handleMemoryDelete(update, isActiveConnection, currentUserType);
      }
    } catch (error) {
      console.error('❌ Error processing memory update:', error);
      console.error('Update data:', update);
    }
  }, [userId]); // Only depend on userId since refs handle the rest

  /**
   * Handle memory creation
   */
  const handleMemoryCreate = (
    update: MemoryUpdate,
    isActiveConnection: boolean,
    currentUserType: UserType
  ) => {
    if (!update.memory) return;

    // Convert and add new memory
    const newMemory = convertApiMemoryToUIMemory(update.memory);
    
    console.log(`   ➕ Adding new memory: ${newMemory.id} (${newMemory.type})`);
    
    // Update per-connection cache first (for Dashboard validation)
    if (currentUserType === 'keeper') {
      setMemoriesByStoryteller((prev) => {
        const existing = prev[update.connectionId] || [];
        if (memoryExists(existing, newMemory.id)) {
          console.log(`   ⚠️ Memory ${newMemory.id} already exists in connection cache, skipping`);
          return prev;
        }
        return {
          ...prev,
          [update.connectionId]: [...existing, newMemory],
        };
      });
    } else {
      setMemoriesByLegacyKeeper((prev) => {
        const existing = prev[update.connectionId] || [];
        if (memoryExists(existing, newMemory.id)) {
          console.log(`   ⚠️ Memory ${newMemory.id} already exists in connection cache, skipping`);
          return prev;
        }
        return {
          ...prev,
          [update.connectionId]: [...existing, newMemory],
        };
      });
    }

    // Then update global memories array if this is the ACTIVE connection
    if (isActiveConnection) {
      setMemories((prev) => {
        if (memoryExists(prev, newMemory.id)) {
          console.log(`   ⚠️ Memory ${newMemory.id} already exists in global array, skipping`);
          return prev;
        }
        return [...prev, newMemory];
      });
    } else {
      console.log(`   ℹ️ Skipping global memories update for background connection`);
    }

    // Update sidebar last message preview for this connection (real-time)
    // Only update for text/voice messages (not photos, videos, etc.)
    if (newMemory.type === 'text' || newMemory.type === 'voice') {
      console.log(`   📱 Updating sidebar last message for connection: ${update.connectionId}`);
      updateSidebarLastMessage(update.connectionId);
    }

    // Don't show toast notification here - let Dashboard handle it
    // This prevents duplicate notifications
  };

  /**
   * Handle memory update
   */
  const handleMemoryUpdateAction = (
    update: MemoryUpdate,
    isActiveConnection: boolean,
    currentUserType: UserType
  ) => {
    if (!update.memory) return;

    // Update existing memory
    const updatedMemory = convertApiMemoryToUIMemory(update.memory);
    
    // Update per-connection cache first (for Dashboard validation)
    if (currentUserType === 'keeper') {
      setMemoriesByStoryteller((prev) => ({
        ...prev,
        [update.connectionId]: (prev[update.connectionId] || []).map((m) => 
          m.id === update.memoryId ? updatedMemory : m
        ),
      }));
    } else {
      setMemoriesByLegacyKeeper((prev) => ({
        ...prev,
        [update.connectionId]: (prev[update.connectionId] || []).map((m) => 
          m.id === update.memoryId ? updatedMemory : m
        ),
      }));
    }
    
    // Then update global memories array if this is the ACTIVE connection
    if (isActiveConnection) {
      setMemories((prev) =>
        prev.map((m) => (m.id === update.memoryId ? updatedMemory : m))
      );
    }
  };

  /**
   * Handle memory deletion
   */
  const handleMemoryDelete = (
    update: MemoryUpdate,
    isActiveConnection: boolean,
    currentUserType: UserType
  ) => {
    console.log(`   🗑️ Deleting memory: ${update.memoryId}`);
    
    // Update per-connection cache first (for Dashboard validation)
    if (currentUserType === 'keeper') {
      setMemoriesByStoryteller((prev) => ({
        ...prev,
        [update.connectionId]: (prev[update.connectionId] || []).filter((m) => 
          m.id !== update.memoryId
        ),
      }));
    } else {
      setMemoriesByLegacyKeeper((prev) => ({
        ...prev,
        [update.connectionId]: (prev[update.connectionId] || []).filter((m) => 
          m.id !== update.memoryId
        ),
      }));
    }
    
    // Then update global memories array if this is the ACTIVE connection
    if (isActiveConnection) {
      setMemories((prev) => {
        const filtered = prev.filter((m) => m.id !== update.memoryId);
        console.log(`   ✅ Removed from global array (${prev.length} → ${filtered.length})`);
        return filtered;
      });
    } else {
      console.log(`   ℹ️ Skipping global memories update for background connection`);
    }
    
    console.log(`   ✅ Memory ${update.memoryId} deleted from all caches`);
  };

  return {
    handleMemoryUpdate,
  };
}
