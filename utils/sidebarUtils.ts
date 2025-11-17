/**
 * Sidebar Utilities
 * Shared helper functions for sidebar message preview logic and badge counts
 */

import type { Memory } from '../App';
import { setAndPersistBadge, clearBadge, getPersistedBadgeCount } from './badgeSync';

/**
 * Gets the last message preview for a connection
 * Filters to only text/voice messages and returns truncated preview
 * 
 * @param memories - Array of memories for this connection
 * @returns Message preview and timestamp, or null if no messages
 */
export function getLastMessagePreview(
  memories: Memory[]
): { message: string; time: Date } | null {
  if (memories.length === 0) return null;
  
  // Filter to only text and voice messages (not photos, videos, documents, or prompts)
  const messages = memories.filter(m => 
    (m.type === 'text' || m.type === 'voice') && 
    !m.promptQuestion // Exclude prompt questions
  );
  
  if (messages.length === 0) return null;
  
  // Sort messages by timestamp to ensure we get the actual latest message
  // Messages might be added out of order via realtime updates
  const sortedMessages = [...messages].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  // Get the most recent message (last in sorted array)
  const lastMsg = sortedMessages[sortedMessages.length - 1];
  
  // Create preview text
  let preview = '';
  if (lastMsg.type === 'voice') {
    preview = lastMsg.transcript || '🎤 Voice message';
  } else {
    preview = lastMsg.content;
  }
  
  // Truncate to 50 characters
  if (preview.length > 50) {
    preview = preview.substring(0, 50) + '...';
  }
  
  return { message: preview, time: lastMsg.timestamp };
}

/**
 * Updates a connection item with new last message info
 * Generic utility that works for both Storyteller and LegacyKeeper types
 * 
 * @param connections - Array of connection objects
 * @param connectionId - ID of connection to update
 * @param messageInfo - New message preview info (or null to clear)
 * @returns Updated connections array
 */
export function updateConnectionLastMessage<T extends { id: string }>(
  connections: T[],
  connectionId: string,
  messageInfo: { message: string; time: Date } | null
): T[] {
  return connections.map(conn => 
    conn.id === connectionId
      ? {
          ...conn,
          lastMessage: messageInfo?.message,
          lastMessageTime: messageInfo?.time,
        }
      : conn
  );
}

/**
 * Calculate total badge count from unread counts map
 * Also persists to IndexedDB so service worker and app stay in sync
 * 
 * @param unreadCounts - Map of connection IDs to unread message counts
 */
export async function updateAndPersistTotalBadge(unreadCounts: Record<string, number>): Promise<void> {
  const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
  
  console.log('📱 [BADGE-CALC] Unread counts by connection:', unreadCounts);
  console.log('📱 [BADGE-CALC] Total unread:', totalUnread);
  
  if (totalUnread > 0) {
    await setAndPersistBadge(totalUnread);
    console.log(`📱 iOS Badge updated: ${totalUnread} unread messages`);
  } else {
    await clearBadge();
    console.log('📱 iOS Badge cleared (all messages read)');
  }
}

/**
 * Get persisted badge count for immediate display on app foreground
 * This allows showing the badge instantly without waiting for API fetch
 * 
 * @returns Persisted badge count from IndexedDB
 */
export async function getPersistedBadge(): Promise<number> {
  return getPersistedBadgeCount();
}
