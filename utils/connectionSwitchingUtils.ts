/**
 * Connection Switching Utilities
 * Shared helper functions for managing connection switching logic
 */

import type { Storyteller, LegacyKeeper, UserProfile } from '../App';

/**
 * Connection selection result
 */
export interface ConnectionSelection<T> {
  connection: T | null;
  isConnected: boolean;
  source: 'restored' | 'first-active' | 'first-pending' | 'none';
}

/**
 * Selects which connection should be active based on priority rules
 * 
 * Priority:
 * 1. Restore last active connection from localStorage (if still exists and is active)
 * 2. First connected/active connection
 * 3. First pending connection
 * 4. None (empty state)
 * 
 * @param connections - Array of connections
 * @param userId - Current user ID for localStorage key
 * @returns Connection selection result with source indicator
 */
export function selectActiveConnection<T extends { id: string; isConnected: boolean }>(
  connections: T[],
  userId: string | undefined
): ConnectionSelection<T> {
  if (connections.length === 0) {
    return { connection: null, isConnected: false, source: 'none' };
  }

  // Try to restore last active connection from localStorage
  if (userId) {
    const lastActiveId = localStorage.getItem(`adoras_last_active_connection_${userId}`);
    if (lastActiveId) {
      const restoredConnection = connections.find(
        (conn) => conn.id === lastActiveId && conn.isConnected
      );
      if (restoredConnection) {
        return { 
          connection: restoredConnection, 
          isConnected: true, 
          source: 'restored' 
        };
      }
    }
  }

  // Fall back to first active connection
  const firstActive = connections.find((conn) => conn.isConnected);
  if (firstActive) {
    return { 
      connection: firstActive, 
      isConnected: true, 
      source: 'first-active' 
    };
  }

  // Fall back to first pending connection
  const firstPending = connections[0];
  return { 
    connection: firstPending, 
    isConnected: false, 
    source: 'first-pending' 
  };
}

/**
 * Persists the active connection ID to localStorage
 * 
 * @param userId - Current user ID
 * @param connectionId - Connection ID to persist
 */
export function persistActiveConnection(
  userId: string | undefined,
  connectionId: string
): void {
  if (userId) {
    localStorage.setItem(`adoras_last_active_connection_${userId}`, connectionId);
    console.log(`💾 Persisted last active connection: ${connectionId}`);
  }
}

/**
 * Converts a connection object to a UserProfile format
 * Used when setting partner profile state
 * 
 * @param connection - Connection object (Storyteller or LegacyKeeper)
 * @returns UserProfile object
 */
export function connectionToUserProfile(
  connection: Storyteller | LegacyKeeper
): UserProfile {
  return {
    id: connection.id,
    name: connection.name,
    relationship: connection.relationship,
    bio: connection.bio,
    photo: connection.photo,
  };
}

/**
 * Data needed to switch to a new connection
 */
export interface ConnectionSwitchData {
  connectionId: string;
  partnerProfile: UserProfile;
  isConnected: boolean;
  cachedMemories: any[]; // Memories to load immediately
}

/**
 * Prepares data needed to switch to a connection
 * Extracts connection info and finds cached memories
 * 
 * @param connection - Connection to switch to
 * @param memoriesCache - Cached memories by connection ID
 * @returns Switch data or null if connection not found
 */
export function prepareConnectionSwitch<T extends Storyteller | LegacyKeeper>(
  connection: T | undefined,
  memoriesCache: Record<string, any[]>
): ConnectionSwitchData | null {
  if (!connection) {
    return null;
  }

  return {
    connectionId: connection.id,
    partnerProfile: connectionToUserProfile(connection),
    isConnected: connection.isConnected,
    cachedMemories: memoriesCache[connection.id] || [],
  };
}

/**
 * Log messages for connection selection
 * Provides clear logging for debugging connection selection logic
 * 
 * @param selection - Connection selection result
 * @param connectionName - Name of the selected connection
 * @param userType - 'keeper' or 'teller' for logging context
 */
export function logConnectionSelection<T extends { id: string; name: string }>(
  selection: ConnectionSelection<T>,
  userType: 'keeper' | 'teller'
): void {
  const connType = userType === 'keeper' ? 'storyteller' : 'legacy keeper';
  
  switch (selection.source) {
    case 'restored':
      console.log(`   ♻️ Restoring last active ${connType}: ${selection.connection?.name} (${selection.connection?.id})`);
      break;
    case 'first-active':
      console.log(`   First active ${connType}:`, selection.connection);
      console.log(`   🎯 Setting active connection to: ${selection.connection?.id}`);
      break;
    case 'first-pending':
      console.log(`   🎯 Setting active connection to pending: ${selection.connection?.id}`);
      console.log(`   ⏳ Pending connection to: ${selection.connection?.name} (ID: ${selection.connection?.id})`);
      break;
    case 'none':
      console.log(`   ❌ No ${connType}s found - clearing active connection`);
      break;
  }

  if (selection.isConnected && selection.connection) {
    console.log(`   ✅ Connected to ${connType}: ${selection.connection.name} (ID: ${selection.connection.id})`);
  }
}
