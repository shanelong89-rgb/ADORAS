/**
 * Memory Utilities
 * Shared helper functions for memory state management
 */

import type { Memory } from '../App';

/**
 * Merges two memory arrays, preserving existing items and adding new ones
 * Uses MERGE strategy: keeps all existing memories, updates with incoming data if available
 * 
 * @param existing - Current memory array
 * @param incoming - New memory array from API
 * @returns Merged array sorted chronologically
 */
export function mergeMemories(existing: Memory[], incoming: Memory[]): Memory[] {
  const existingById = new Map(existing.map(m => [m.id, m]));
  const incomingById = new Map(incoming.map(m => [m.id, m]));
  
  // Keep all existing, update with incoming data if available
  const merged = existing.map(m => incomingById.get(m.id) || m);
  
  // Add new memories not in existing
  incoming.forEach(m => {
    if (!existingById.has(m.id)) {
      merged.push(m);
    }
  });
  
  // Sort chronologically
  merged.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  
  return merged;
}

/**
 * Checks if a memory already exists in an array
 * 
 * @param memories - Array to check
 * @param memoryId - ID to look for
 * @returns True if memory exists
 */
export function memoryExists(memories: Memory[], memoryId: string): boolean {
  return memories.some(m => m.id === memoryId);
}

/**
 * Calculates unread message count for a connection
 * 
 * @param memories - Array of memories for this connection
 * @param userId - Current user's ID
 * @param userSenderType - 'keeper' or 'teller'
 * @returns Number of unread messages
 */
export function calculateUnreadCount(
  memories: Memory[],
  userId: string,
  userSenderType: 'keeper' | 'teller'
): number {
  return memories.filter(m => {
    const notReadByMe = !m.readBy?.includes(userId);
    const notSentByMe = m.sender !== userSenderType;
    return notReadByMe && notSentByMe;
  }).length;
}
