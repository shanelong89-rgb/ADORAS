/**
 * Real-time Sync Service - Phase 5 (Multi-Channel Support)
 * Provides live updates, presence indicators, and WebSocket connections
 * Uses Supabase Realtime for real-time communication
 * 
 * UPDATED: Now supports subscribing to MULTIPLE connections simultaneously
 * This ensures sidebar updates for ALL connections, not just the active one
 */

import { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabase/client';

// Get shared Supabase client instance
const supabase = getSupabaseClient();

// Types
export interface PresenceState {
  userId: string;
  userName: string;
  online: boolean;
  lastSeen: string;
  // Note: userPhoto is NOT stored in presence to keep payloads small
  // Photos should be fetched separately from user profiles
}

export interface MemoryUpdate {
  action: 'create' | 'update' | 'delete';
  memoryId: string;
  connectionId: string;
  memory?: any;
  userId: string;
  timestamp: string;
}

export interface TypingIndicator {
  userId: string;
  userName: string;
  connectionId: string;
  isTyping: boolean;
}

type PresenceCallback = (connectionId: string, presences: Record<string, PresenceState>) => void;
type MemoryUpdateCallback = (update: MemoryUpdate) => void;
type TypingCallback = (typing: TypingIndicator) => void;

interface ChannelInfo {
  channel: RealtimeChannel;
  connectionId: string;
  isConnected: boolean;
  reconnectAttempts: number;
}

/**
 * Real-time Sync Manager (Multi-Channel Version)
 * Manages WebSocket connections, presence, and live updates
 * Can subscribe to multiple connections simultaneously
 */
class RealtimeSyncManager {
  // Map of connectionId -> ChannelInfo
  private channels: Map<string, ChannelInfo> = new Map();
  
  // Active connection for presence tracking
  private activeConnectionId: string | null = null;
  private userId: string | null = null;
  private userName: string | null = null;
  
  // Presence state cache (connectionId -> userId -> PresenceState)
  private presenceCache: Map<string, Record<string, PresenceState>> = new Map();
  
  private presenceCallbacks: PresenceCallback[] = [];
  private memoryUpdateCallbacks: MemoryUpdateCallback[] = [];
  private typingCallbacks: TypingCallback[] = [];
  
  private maxReconnectAttempts: number = 3;
  private permanentlyDisabled: boolean = false;

  /**
   * Subscribe to multiple connections at once
   * This allows real-time updates for ALL user connections, not just the active one
   */
  async subscribeToConnections(params: {
    connectionIds: string[];
    userId: string;
    userName: string;
    activeConnectionId?: string;
  }): Promise<void> {
    const { connectionIds, userId, userName, activeConnectionId } = params;

    if (this.permanentlyDisabled) {
      console.log('ℹ️ Real-time features are disabled due to repeated connection failures');
      return;
    }

    this.userId = userId;
    this.userName = userName;
    this.activeConnectionId = activeConnectionId || connectionIds[0] || null;

    console.log(`🔌 Subscribing to ${connectionIds.length} connections:`, connectionIds);
    console.log(`   Active connection: ${this.activeConnectionId}`);

    // Subscribe to each connection
    for (const connectionId of connectionIds) {
      await this.connectToChannel(connectionId, userId, userName);
    }

    // Remove channels that are no longer needed
    const activeConnectionIds = new Set(connectionIds);
    for (const [connectionId, channelInfo] of this.channels.entries()) {
      if (!activeConnectionIds.has(connectionId)) {
        console.log(`🗑️ Removing old channel: ${connectionId}`);
        await this.disconnectFromChannel(connectionId);
      }
    }
  }

  /**
   * Connect to a single channel
   */
  private async connectToChannel(
    connectionId: string,
    userId: string,
    userName: string
  ): Promise<void> {
    // Skip if already connected
    if (this.channels.has(connectionId)) {
      console.log(`ℹ️ Already subscribed to connection: ${connectionId}`);
      return;
    }

    try {
      console.log(`🔌 Connecting to channel: ${connectionId}`);

      // Create channel for this connection
      const channel = supabase.channel(`connection:${connectionId}`, {
        config: {
          broadcast: { self: true }, // Receive own messages (for multi-tab)
          presence: { key: userId }, // Use userId as presence key
        },
      });

      // Store channel info
      const channelInfo: ChannelInfo = {
        channel,
        connectionId,
        isConnected: false,
        reconnectAttempts: 0,
      };

      this.channels.set(connectionId, channelInfo);

      // Subscribe to presence changes
      channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        
        // Convert presence state to our format
        const presences: Record<string, PresenceState> = {};
        Object.entries(state).forEach(([key, values]: [string, any[]]) => {
          const presence = values[0];
          if (presence) {
            presences[key] = {
              userId: presence.userId,
              userName: presence.userName,
              online: true,
              lastSeen: new Date().toISOString(),
            };
          }
        });
        
        // Cache presence state for quick lookups
        this.presenceCache.set(connectionId, presences);
        
        // Notify callbacks with connectionId
        this.presenceCallbacks.forEach(cb => cb(connectionId, presences));
      });

      channel.on('presence', { event: 'join' }, ({ key }) => {
        console.log(`✅ User joined ${connectionId}:`, key);
      });

      channel.on('presence', { event: 'leave' }, ({ key }) => {
        console.log(`👋 User left ${connectionId}:`, key);
      });

      // Subscribe to memory updates
      channel.on('broadcast', { event: 'memory-update' }, ({ payload }) => {
        console.log(`📡 Memory update received on ${connectionId}:`, payload);
        this.memoryUpdateCallbacks.forEach(cb => cb(payload as MemoryUpdate));
      });

      // Subscribe to typing indicators
      channel.on('broadcast', { event: 'typing' }, ({ payload }) => {
        console.log(`⌨️ Typing indicator on ${connectionId}:`, payload);
        this.typingCallbacks.forEach(cb => cb(payload as TypingIndicator));
      });

      // Subscribe and track presence
      await channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Connected to channel: ${connectionId}`);
          channelInfo.isConnected = true;
          channelInfo.reconnectAttempts = 0;

          // Only track presence on the ACTIVE connection to avoid presence spam
          if (connectionId === this.activeConnectionId) {
            const presenceData: PresenceState = {
              userId,
              userName,
              online: true,
              lastSeen: new Date().toISOString(),
            };

            await channel.track(presenceData);
            console.log(`👤 Presence tracked on active channel: ${connectionId}`);
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`⚠️ Channel ${connectionId} error/timeout`);
          channelInfo.isConnected = false;
          this.attemptReconnectChannel(connectionId);
        } else if (status === 'CLOSED') {
          console.log(`🔌 Channel ${connectionId} closed`);
          channelInfo.isConnected = false;
        }
      });
    } catch (error) {
      console.error(`❌ Error connecting to ${connectionId}:`, error);
      this.attemptReconnectChannel(connectionId);
    }
  }

  /**
   * Attempt to reconnect a specific channel
   */
  private attemptReconnectChannel(connectionId: string): void {
    const channelInfo = this.channels.get(connectionId);
    if (!channelInfo) return;

    if (channelInfo.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn(`⚠️ Max reconnection attempts reached for ${connectionId}`);
      this.channels.delete(connectionId);
      return;
    }

    channelInfo.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, channelInfo.reconnectAttempts), 30000);

    console.log(`🔄 Reconnecting ${connectionId} in ${delay}ms (attempt ${channelInfo.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      if (this.userId && this.userName) {
        this.disconnectFromChannel(connectionId).then(() => {
          this.connectToChannel(connectionId, this.userId!, this.userName!);
        });
      }
    }, delay);
  }

  /**
   * Disconnect from a specific channel
   */
  private async disconnectFromChannel(connectionId: string): Promise<void> {
    const channelInfo = this.channels.get(connectionId);
    if (!channelInfo) return;

    console.log(`🔌 Disconnecting from channel: ${connectionId}`);

    try {
      // Untrack presence if this was the active connection
      if (connectionId === this.activeConnectionId) {
        try {
          await channelInfo.channel.untrack();
        } catch (untrackError) {
          console.warn(`⚠️ Error untracking presence on ${connectionId}:`, untrackError);
        }
      }

      // Remove channel
      try {
        await supabase.removeChannel(channelInfo.channel);
      } catch (removeError) {
        // Silently handle errors
      }
    } catch (error) {
      console.error(`❌ Error disconnecting from ${connectionId}:`, error);
    } finally {
      this.channels.delete(connectionId);
    }
  }

  /**
   * Disconnect from ALL channels
   */
  async disconnectAll(): Promise<void> {
    console.log(`🔌 Disconnecting from all ${this.channels.size} channels`);
    
    const connectionIds = Array.from(this.channels.keys());
    for (const connectionId of connectionIds) {
      await this.disconnectFromChannel(connectionId);
    }

    this.channels.clear();
    this.activeConnectionId = null;
  }

  /**
   * Set which connection is currently active (for presence tracking)
   */
  async setActiveConnection(connectionId: string): Promise<void> {
    if (this.activeConnectionId === connectionId) {
      return; // Already active
    }

    console.log(`🎯 Switching active connection: ${this.activeConnectionId} → ${connectionId}`);

    // Untrack presence from old active connection
    if (this.activeConnectionId) {
      const oldChannel = this.channels.get(this.activeConnectionId);
      if (oldChannel && oldChannel.channel) {
        try {
          await oldChannel.channel.untrack();
          console.log(`👤 Untracked presence from: ${this.activeConnectionId}`);
        } catch (error) {
          console.warn(`⚠️ Error untracking from ${this.activeConnectionId}:`, error);
        }
      }
    }

    // Track presence on new active connection
    this.activeConnectionId = connectionId;
    const newChannel = this.channels.get(connectionId);
    if (newChannel && newChannel.channel && newChannel.isConnected && this.userId && this.userName) {
      try {
        const presenceData: PresenceState = {
          userId: this.userId,
          userName: this.userName,
          online: true,
          lastSeen: new Date().toISOString(),
        };

        await newChannel.channel.track(presenceData);
        console.log(`👤 Tracked presence on: ${connectionId}`);
      } catch (error) {
        console.warn(`⚠️ Error tracking presence on ${connectionId}:`, error);
      }
    }
  }

  /**
   * Broadcast memory update to a specific connection's channel
   */
  async broadcastMemoryUpdate(update: Omit<MemoryUpdate, 'timestamp'>): Promise<void> {
    const channelInfo = this.channels.get(update.connectionId);
    
    if (!channelInfo || !channelInfo.isConnected) {
      console.warn(`⚠️ Not connected to channel ${update.connectionId}, skipping broadcast`);
      return;
    }

    const payload: MemoryUpdate = {
      ...update,
      timestamp: new Date().toISOString(),
    };

    console.log(`📡 Broadcasting memory update to ${update.connectionId}:`, payload);

    await channelInfo.channel.send({
      type: 'broadcast',
      event: 'memory-update',
      payload,
    });
  }

  /**
   * Broadcast typing indicator on active connection
   */
  async broadcastTyping(isTyping: boolean): Promise<void> {
    if (!this.activeConnectionId || !this.userId || !this.userName) {
      return;
    }

    const channelInfo = this.channels.get(this.activeConnectionId);
    if (!channelInfo || !channelInfo.isConnected) {
      return;
    }

    const payload: TypingIndicator = {
      userId: this.userId,
      userName: this.userName,
      connectionId: this.activeConnectionId,
      isTyping,
    };

    await channelInfo.channel.send({
      type: 'broadcast',
      event: 'typing',
      payload,
    });
  }

  /**
   * Subscribe to presence updates
   */
  onPresenceChange(callback: PresenceCallback): () => void {
    this.presenceCallbacks.push(callback);
    
    return () => {
      this.presenceCallbacks = this.presenceCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Subscribe to memory updates
   */
  onMemoryUpdate(callback: MemoryUpdateCallback): () => void {
    this.memoryUpdateCallbacks.push(callback);
    
    return () => {
      this.memoryUpdateCallbacks = this.memoryUpdateCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Subscribe to typing indicators
   */
  onTyping(callback: TypingCallback): () => void {
    this.typingCallbacks.push(callback);
    
    return () => {
      this.typingCallbacks = this.typingCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): {
    isConnected: boolean;
    activeConnectionId: string | null;
    totalChannels: number;
    connectedChannels: number;
  } {
    const connectedChannels = Array.from(this.channels.values()).filter(
      ch => ch.isConnected
    ).length;

    return {
      isConnected: connectedChannels > 0,
      activeConnectionId: this.activeConnectionId,
      totalChannels: this.channels.size,
      connectedChannels,
    };
  }

  /**
   * Get presence state for a specific connection
   * Used to check if partner is actively viewing the chat
   */
  getPresenceState(connectionId: string): Record<string, PresenceState> | null {
    return this.presenceCache.get(connectionId) || null;
  }

  /**
   * LEGACY: Old single-channel connect method (for backward compatibility)
   * Redirects to subscribeToConnections with a single connection
   */
  async connect(params: {
    connectionId: string;
    userId: string;
    userName: string;
  }): Promise<void> {
    console.warn('⚠️ Using legacy connect() method. Consider using subscribeToConnections() instead.');
    await this.subscribeToConnections({
      connectionIds: [params.connectionId],
      userId: params.userId,
      userName: params.userName,
      activeConnectionId: params.connectionId,
    });
  }

  /**
   * LEGACY: Old disconnect method
   */
  async disconnect(): Promise<void> {
    await this.disconnectAll();
  }
}

// Export singleton instance
export const realtimeSync = new RealtimeSyncManager();
