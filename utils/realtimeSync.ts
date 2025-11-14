// CACHE BUST: 2025-11-14-v3
/**
 * Realtime Sync - Clean Architecture
 * 
 * Uses Supabase Postgres Changes instead of manual broadcasts
 * Much simpler and more reliable!
 * 
 * IMPORTANT: This maintains the same API as the old version for compatibility
 * with AppContent.tsx, but uses the new clean architecture under the hood.
 */

import { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabase/client';

const supabase = getSupabaseClient();

// ============================================================================
// TYPES - Keep same as old version for compatibility
// ============================================================================

export interface PresenceState {
  userId: string;
  userName: string;
  online: boolean;
  lastSeen: string;
}

export interface MemoryUpdate {
  action: 'create' | 'update' | 'delete';
  memoryId: string;
  connectionId: string;
  memory?: any;
  userId: string;
  timestamp?: string;
}

export interface TypingIndicator {
  userId: string;
  userName: string;
  connectionId: string;
  isTyping: boolean;
}

export interface SidebarUpdate {
  connectionId: string;
  lastMessage: {
    preview: string;
    sender: string;
    timestamp: string;
  };
  action: 'increment_unread' | 'clear_unread';
}

// Internal types for Postgres realtime
interface Message {
  id: string;
  connection_id: string;
  sender_id: string;
  type: 'text' | 'photo' | 'voice' | 'video' | 'document';
  content: string;
  created_at: string;
  read_by: string[];
  [key: string]: any;
}

interface Connection {
  id: string;
  keeper_id: string;
  teller_id: string;
  status: string;
  [key: string]: any;
}

// Callback types - same as old version
type PresenceCallback = (connectionId: string, presences: Record<string, PresenceState>) => void;
type MemoryUpdateCallback = (update: MemoryUpdate) => void;
type TypingCallback = (typing: TypingIndicator) => void;
type SidebarUpdateCallback = (update: SidebarUpdate) => void;

// ============================================================================
// REALTIME MANAGER - New implementation, old API
// ============================================================================

class RealtimeSyncManager {
  private channels: Map<string, RealtimeChannel> = new Map();
  private activeConnectionId: string | null = null;
  private userId: string | null = null;
  private userName: string | null = null;

  // Callbacks
  private presenceCallbacks: PresenceCallback[] = [];
  private memoryUpdateCallbacks: MemoryUpdateCallback[] = [];
  private typingCallbacks: TypingCallback[] = [];
  private sidebarUpdateCallbacks: SidebarUpdateCallback[] = [];

  // Presence cache
  private presenceCache: Map<string, Record<string, PresenceState>> = new Map();

  private permanentlyDisabled: boolean = false;

  /**
   * Subscribe to multiple connections (NEW CLEAN ARCH METHOD)
   * This replaces the old connect() method
   */
  async subscribeToConnections(params: {
    connectionIds: string[];
    userId: string;
    userName: string;
    activeConnectionId?: string;
  }): Promise<void> {
    const { connectionIds, userId, userName, activeConnectionId } = params;

    if (this.permanentlyDisabled) {
      console.log('ℹ️ Real-time features are disabled');
      return;
    }

    this.userId = userId;
    this.userName = userName;
    this.activeConnectionId = activeConnectionId || connectionIds[0] || null;

    console.log(`📡 [CLEAN ARCH] Subscribing to ${connectionIds.length} connections`);

    // Subscribe to messages for each connection via Postgres changes
    for (const connectionId of connectionIds) {
      await this.subscribeToMessages(connectionId, userId);
      await this.subscribeToPresence(connectionId, userId, userName);
    }

    // Also subscribe to connection-level changes
    await this.subscribeToConnectionChanges(userId);

    // Clean up old channels
    const activeConnectionIds = new Set(connectionIds);
    for (const [channelName, channel] of this.channels.entries()) {
      const connectionId = channelName.split(':')[1];
      if (!activeConnectionIds.has(connectionId)) {
        await supabase.removeChannel(channel);
        this.channels.delete(channelName);
      }
    }
  }

  /**
   * Subscribe to messages via BOTH Postgres changes AND broadcast (hybrid approach)
   * Works with both KV backend (current) and Postgres backend (future)
   */
  private async subscribeToMessages(connectionId: string, userId: string): Promise<void> {
    const channelName = `messages:${connectionId}`;

    if (this.channels.has(channelName)) {
      console.log(`ℹ️ Already subscribed to ${channelName}`);
      return;
    }

    console.log(`📨 [HYBRID] Subscribing to messages for: ${connectionId}`);

    const channel = supabase
      .channel(channelName)
      // Listen to Postgres changes (for future clean architecture)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `connection_id=eq.${connectionId}`,
        },
        (payload) => {
          const message = payload.new as Message;
          
          // Don't notify for own messages
          if (message.sender_id === userId) {
            console.log(`ℹ️ [POSTGRES] Ignoring own message: ${message.id}`);
            return;
          }

          console.log(`📨 [POSTGRES] New message received: ${message.id}`);
          
          // Convert to MemoryUpdate format for compatibility
          const memoryUpdate: MemoryUpdate = {
            action: 'create',
            memoryId: message.id,
            connectionId: message.connection_id,
            memory: message,
            userId: message.sender_id,
            timestamp: message.created_at,
          };

          this.memoryUpdateCallbacks.forEach(cb => cb(memoryUpdate));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `connection_id=eq.${connectionId}`,
        },
        (payload) => {
          const message = payload.new as Message;
          console.log(`📝 [POSTGRES] Message updated: ${message.id}`);

          const memoryUpdate: MemoryUpdate = {
            action: 'update',
            memoryId: message.id,
            connectionId: message.connection_id,
            memory: message,
            userId: message.sender_id,
            timestamp: message.created_at,
          };

          this.memoryUpdateCallbacks.forEach(cb => cb(memoryUpdate));
        }
      )
      // ALSO listen to broadcast events (for current KV backend)
      .on('broadcast', { event: 'memory-update' }, ({ payload }) => {
        const update = payload as MemoryUpdate;
        
        // Don't notify for own messages
        if (update.userId === userId) {
          console.log(`ℹ️ [BROADCAST] Ignoring own update: ${update.memoryId}`);
          return;
        }

        // Only process updates for this connection
        if (update.connectionId !== connectionId) {
          console.log(`ℹ️ [BROADCAST] Ignoring update for different connection: ${update.connectionId}`);
          return;
        }

        console.log(`📨 [BROADCAST] Memory update received:`, update);
        this.memoryUpdateCallbacks.forEach(cb => cb(update));
      })
      // ALSO listen to typing indicators
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        const typing = payload as TypingIndicator;
        
        // Don't notify for own typing
        if (typing.userId === userId) {
          return;
        }

        console.log(`⌨️ [BROADCAST] Typing indicator:`, typing);
        this.typingCallbacks.forEach(cb => cb(typing));
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ [HYBRID] Subscribed to messages: ${connectionId}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ [HYBRID] Subscription error for ${connectionId}`);
        }
      });

    this.channels.set(channelName, channel);
  }

  /**
   * Subscribe to presence (online/offline status)
   */
  private async subscribeToPresence(connectionId: string, userId: string, userName: string): Promise<void> {
    const channelName = `presence:${connectionId}`;

    if (this.channels.has(channelName)) {
      console.log(`ℹ️ Already subscribed to presence: ${connectionId}`);
      return;
    }

    console.log(`👥 [CLEAN ARCH] Subscribing to presence for: ${connectionId}`);

    const channel = supabase
      .channel(channelName)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const presences: Record<string, PresenceState> = {};

        Object.entries(state).forEach(([key, values]: [string, any[]]) => {
          const presence = values[0];
          if (presence) {
            presences[key] = {
              userId: presence.userId,
              userName: presence.userName,
              online: true,
              lastSeen: presence.lastSeen || new Date().toISOString(),
            };
          }
        });

        // Cache presence state
        this.presenceCache.set(connectionId, presences);

        // Notify callbacks
        this.presenceCallbacks.forEach(cb => cb(connectionId, presences));
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        console.log(`✅ User joined ${connectionId}:`, key);
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        console.log(`👋 User left ${connectionId}:`, key);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Only track presence on active connection
          if (connectionId === this.activeConnectionId) {
            await channel.track({
              userId,
              userName,
              online: true,
              lastSeen: new Date().toISOString(),
            });
            console.log(`✅ Tracking presence in ${connectionId}`);
          }
        }
      });

    this.channels.set(channelName, channel);
  }

  /**
   * Subscribe to connection-level changes
   */
  private async subscribeToConnectionChanges(userId: string): Promise<void> {
    const channelName = `connections:${userId}`;

    if (this.channels.has(channelName)) {
      console.log(`ℹ️ Already subscribed to connection changes`);
      return;
    }

    console.log(`🔗 [CLEAN ARCH] Subscribing to connection changes for: ${userId}`);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connections',
        },
        (payload) => {
          const connection = payload.new as Connection;
          
          // Only process if user is part of connection
          if (connection.keeper_id === userId || connection.teller_id === userId) {
            console.log(`🔗 Connection changed: ${connection.id}`);
            // Could trigger connection list refresh here
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Subscribed to connection changes`);
        }
      });

    this.channels.set(channelName, channel);
  }

  /**
   * Subscribe to user-level sidebar updates (lightweight)
   */
  async subscribeToUserUpdates(userId: string, onUpdate: SidebarUpdateCallback): Promise<void> {
    if (this.permanentlyDisabled) {
      console.log('ℹ️ Real-time features disabled');
      return;
    }

    this.sidebarUpdateCallbacks.push(onUpdate);
    console.log(`📡 Subscribing to user-level updates for: ${userId}`);

    const channelName = `user-updates:${userId}`;

    if (this.channels.has(channelName)) {
      console.log('ℹ️ User-level channel already exists');
      return;
    }

    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event: 'sidebar-update' }, ({ payload }) => {
        console.log(`📬 Sidebar update received:`, payload);
        this.sidebarUpdateCallbacks.forEach(cb => {
          try {
            cb(payload as SidebarUpdate);
          } catch (error) {
            console.error('❌ Error in sidebar callback:', error);
          }
        });
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ User-level channel connected');
        }
      });

    this.channels.set(channelName, channel);
  }

  /**
   * Set active connection (for presence tracking)
   */
  async setActiveConnection(connectionId: string): Promise<void> {
    if (this.activeConnectionId === connectionId) {
      console.log(`ℹ️ Already on active connection: ${connectionId}`);
      return;
    }

    console.log(`🎯 Switching active connection: ${this.activeConnectionId} → ${connectionId}`);

    // Untrack from old connection
    if (this.activeConnectionId) {
      const oldChannelName = `presence:${this.activeConnectionId}`;
      const oldChannel = this.channels.get(oldChannelName);
      if (oldChannel) {
        try {
          await oldChannel.untrack();
        } catch (error) {
          console.warn(`⚠️ Error untracking from old connection:`, error);
        }
      }
    }

    this.activeConnectionId = connectionId;

    // Track on new connection
    const newChannelName = `presence:${connectionId}`;
    const newChannel = this.channels.get(newChannelName);
    if (newChannel && this.userId && this.userName) {
      try {
        await newChannel.track({
          userId: this.userId,
          userName: this.userName,
          online: true,
          lastSeen: new Date().toISOString(),
        });
        console.log(`👤 Tracked presence on: ${connectionId}`);
      } catch (error) {
        console.warn(`⚠️ Error tracking on new connection:`, error);
      }
    }
  }

  /**
   * Broadcast memory update (HYBRID - works with both KV and Postgres)
   */
  async broadcastMemoryUpdate(update: Omit<MemoryUpdate, 'timestamp'>): Promise<void> {
    const fullUpdate: MemoryUpdate = {
      ...update,
      timestamp: new Date().toISOString(),
    };

    // Broadcast via channel (for current KV backend)
    const channelName = `messages:${update.connectionId}`;
    const channel = this.channels.get(channelName);

    if (channel) {
      try {
        await channel.send({
          type: 'broadcast',
          event: 'memory-update',
          payload: fullUpdate,
        });
        console.log(`📡 [HYBRID] Memory update broadcast sent:`, fullUpdate.action, fullUpdate.memoryId);
      } catch (error) {
        console.error(`❌ [HYBRID] Failed to broadcast:`, error);
      }
    } else {
      console.warn(`⚠️ [HYBRID] No channel found for ${update.connectionId}`);
    }

    // Postgres INSERT/UPDATE/DELETE will also trigger callbacks automatically (future)
  }

  /**
   * Send typing indicator
   */
  async broadcastTyping(isTyping: boolean): Promise<void> {
    if (!this.activeConnectionId || !this.userId || !this.userName) {
      return;
    }

    const channelName = `messages:${this.activeConnectionId}`;
    const channel = this.channels.get(channelName);

    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          userId: this.userId,
          userName: this.userName,
          connectionId: this.activeConnectionId,
          isTyping,
        },
      });
    }
  }

  /**
   * Register callbacks (OLD API - maintained for compatibility)
   */
  onPresenceChange(callback: PresenceCallback): () => void {
    this.presenceCallbacks.push(callback);
    return () => {
      this.presenceCallbacks = this.presenceCallbacks.filter(cb => cb !== callback);
    };
  }

  onMemoryUpdate(callback: MemoryUpdateCallback): () => void {
    this.memoryUpdateCallbacks.push(callback);
    return () => {
      this.memoryUpdateCallbacks = this.memoryUpdateCallbacks.filter(cb => cb !== callback);
    };
  }

  onTyping(callback: TypingCallback): () => void {
    this.typingCallbacks.push(callback);
    return () => {
      this.typingCallbacks = this.typingCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Disconnect from all channels
   */
  async disconnectAll(): Promise<void> {
    console.log(`🔌 [CLEAN ARCH] Disconnecting from all ${this.channels.size} channels`);
    
    for (const [channelName, channel] of this.channels.entries()) {
      try {
        await supabase.removeChannel(channel);
        console.log(`✅ Unsubscribed from ${channelName}`);
      } catch (error) {
        // Silently handle errors
      }
    }

    this.channels.clear();
    this.activeConnectionId = null;
  }

  /**
   * Full disconnect including user channel (for logout)
   */
  async disconnect(): Promise<void> {
    await this.disconnectAll();
    this.sidebarUpdateCallbacks = [];
    this.userId = null;
    this.userName = null;
    console.log('🔌 [CLEAN ARCH] Full disconnect complete');
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): {
    isConnected: boolean;
    activeConnectionId: string | null;
    totalChannels: number;
    connectedChannels: number;
  } {
    return {
      isConnected: this.channels.size > 0,
      activeConnectionId: this.activeConnectionId,
      totalChannels: this.channels.size,
      connectedChannels: this.channels.size,
    };
  }

  /**
   * Get presence state for a connection
   */
  getPresenceState(connectionId: string): Record<string, PresenceState> | null {
    return this.presenceCache.get(connectionId) || null;
  }

  /**
   * LEGACY: Old connect method (redirects to subscribeToConnections)
   */
  async connect(params: {
    connectionId: string;
    userId: string;
    userName: string;
  }): Promise<void> {
    console.warn('⚠️ Using legacy connect() method. Use subscribeToConnections() instead.');
    await this.subscribeToConnections({
      connectionIds: [params.connectionId],
      userId: params.userId,
      userName: params.userName,
      activeConnectionId: params.connectionId,
    });
  }
}

// ============================================================================
// SINGLETON EXPORT - Keep same name for compatibility
// ============================================================================

export const realtimeSync = new RealtimeSyncManager();
