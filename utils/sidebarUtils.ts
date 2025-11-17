/**
 * Sidebar Utilities
 * Shared helper functions for sidebar message preview logic
 */

import type { Memory } from '../App';

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
