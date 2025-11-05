/**
 * Real-time Sync Service - Phase 5
 * Provides live updates, presence indicators, and WebSocket connections
 * Uses Supabase Realtime for real-time communication
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

type PresenceCallback = (presences: Record<string, PresenceState>) => void;
type MemoryUpdateCallback = (update: MemoryUpdate) => void;
type TypingCallback = (typing: TypingIndicator) => void;

/**
 * Real-time Sync Manager
 * Manages WebSocket connections, presence, and live updates
 */
class RealtimeSyncManager {
  private channel: RealtimeChannel | null = null;
  private connectionId: string | null = null;
  private userId: string | null = null;
  private userName: string | null = null;
  
  private presenceCallbacks: PresenceCallback[] = [];
  private memoryUpdateCallbacks: MemoryUpdateCallback[] = [];
  private typingCallbacks: TypingCallback[] = [];
  
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3; // Reduced from 5 to 3
  private reconnectTimeout: number | null = null;
  private isReconnecting: boolean = false;
  private permanentlyDisabled: boolean = false; // Stop trying if we keep failing

  /**
   * Initialize real-time sync for a connection
   */
  async connect(params: {
    connectionId: string;
    userId: string;
    userName: string;
  }): Promise<void> {
    const { connectionId, userId, userName } = params;

    // Don't attempt to connect if permanently disabled
    if (this.permanentlyDisabled) {
      console.log('ℹ️ Real-time features are disabled due to repeated connection failures');
      return;
    }

    // Prevent multiple simultaneous connection attempts
    if (this.isReconnecting) {
      console.log('ℹ️ Connection attempt already in progress, skipping...');
      return;
    }

    this.isReconnecting = true;

    try {
      // Disconnect existing channel if any
      if (this.channel) {
        await this.disconnect();
      }

      this.connectionId = connectionId;
      this.userId = userId;
      this.userName = userName;

      console.log('🔌 Connecting to real-time channel:', connectionId);

      // Create channel for this connection
      this.channel = supabase.channel(`connection:${connectionId}`, {
        config: {
          broadcast: { self: true }, // Receive own messages (for multi-tab)
          presence: { key: userId }, // Use userId as presence key
        },
      });

      // Subscribe to presence changes
      this.channel.on('presence', { event: 'sync' }, () => {
        const state = this.channel!.presenceState();
        
        // Log presence sync without photos (to avoid huge console logs)
        const presenceSummary = Object.entries(state).reduce((acc, [key, values]: [string, any[]]) => {
          const presence = values[0];
          acc[key] = {
            userId: presence?.userId,
            userName: presence?.userName,
            online: true,
            hasPhoto: !!presence?.userPhoto
          };
          return acc;
        }, {} as Record<string, any>);
        console.log('👥 Presence synced:', presenceSummary);
        
        // Convert presence state to our format
        const presences: Record<string, PresenceState> = {};
        Object.entries(state).forEach(([key, values]: [string, any[]]) => {
          const presence = values[0]; // Take first presence for each user
          if (presence) {
            presences[key] = {
              userId: presence.userId,
              userName: presence.userName,
              online: true,
              lastSeen: new Date().toISOString(),
            };
          }
        });
        
        // Notify callbacks
        this.presenceCallbacks.forEach(cb => cb(presences));
      });

      this.channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('✅ User joined:', key, newPresences);
      });

      this.channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('👋 User left:', key, leftPresences);
      });

      // Subscribe to memory updates
      this.channel.on('broadcast', { event: 'memory-update' }, ({ payload }) => {
        console.log('📡 Memory update received:', payload);
        this.memoryUpdateCallbacks.forEach(cb => cb(payload as MemoryUpdate));
      });

      // Subscribe to typing indicators
      this.channel.on('broadcast', { event: 'typing' }, ({ payload }) => {
        console.log('⌨️ Typing indicator:', payload);
        this.typingCallbacks.forEach(cb => cb(payload as TypingIndicator));
      });

      // Subscribe and track presence
      await this.channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time channel connected!');
          this.isConnected = true;
          this.reconnectAttempts = 0;

          // Track our presence (without photo to keep payload small)
          const presenceData: PresenceState = {
            userId,
            userName,
            online: true,
            lastSeen: new Date().toISOString(),
          };

          await this.channel!.track(presenceData);
          console.log('👤 Presence tracked:', presenceData);
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('⚠️ Real-time channel error - will retry');
          this.isConnected = false;
          this.attemptReconnect();
        } else if (status === 'TIMED_OUT') {
          console.warn('⚠️ Real-time channel timed out - will retry');
          this.isConnected = false;
          this.attemptReconnect();
        } else if (status === 'CLOSED') {
          console.log('🔌 Real-time channel closed');
          this.isConnected = false;
        }
      });
    } catch (error) {
      console.error('❌ Error during connection:', error);
      this.attemptReconnect();
    } finally {
      this.isReconnecting = false;
    }
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('⚠️ Max reconnection attempts reached - real-time features disabled');
      console.log('ℹ️ App will continue to work without real-time sync');
      this.permanentlyDisabled = true;
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff, max 30s

    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = window.setTimeout(() => {
      if (this.connectionId && this.userId && this.userName) {
        this.connect({
          connectionId: this.connectionId,
          userId: this.userId,
          userName: this.userName,
        });
      }
    }, delay);
  }

  /**
   * Disconnect from real-time channel
   */
  async disconnect(): Promise<void> {
    if (this.channel) {
      console.log('🔌 Disconnecting from real-time channel');
      
      try {
        // Untrack presence before disconnecting (safely)
        try {
          await this.channel.untrack();
        } catch (untrackError) {
          console.warn('⚠️ Error untracking presence:', untrackError);
        }
        
        // Store reference and clear before unsubscribing to prevent race conditions
        const channelToRemove = this.channel;
        this.channel = null;
        this.connectionId = null;
        this.isConnected = false;
        
        // Unsubscribe from channel - wrap in try/catch
        try {
          if (channelToRemove && typeof channelToRemove.unsubscribe === 'function') {
            await supabase.removeChannel(channelToRemove);
          }
        } catch (removeError) {
          // Silently handle removeChannel errors - this is expected during cleanup
          // Channel might already be removed by Supabase or never fully initialized
        }
      } catch (error) {
        console.error('❌ Error during disconnect:', error);
        // Ensure state is cleared even if disconnect fails
        this.channel = null;
        this.connectionId = null;
        this.isConnected = false;
      }
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  /**
   * Broadcast memory update to all connected clients
   */
  async broadcastMemoryUpdate(update: Omit<MemoryUpdate, 'timestamp'>): Promise<void> {
    if (!this.channel || !this.isConnected) {
      console.warn('⚠️ Not connected to real-time channel, skipping broadcast');
      return;
    }

    const payload: MemoryUpdate = {
      ...update,
      timestamp: new Date().toISOString(),
    };

    console.log('📡 Broadcasting memory update:', payload);

    await this.channel.send({
      type: 'broadcast',
      event: 'memory-update',
      payload,
    });
  }

  /**
   * Broadcast typing indicator
   */
  async broadcastTyping(isTyping: boolean): Promise<void> {
    if (!this.channel || !this.isConnected || !this.userId || !this.userName || !this.connectionId) {
      return;
    }

    const payload: TypingIndicator = {
      userId: this.userId,
      userName: this.userName,
      connectionId: this.connectionId,
      isTyping,
    };

    await this.channel.send({
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
    
    // Return unsubscribe function
    return () => {
      this.presenceCallbacks = this.presenceCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Subscribe to memory updates
   */
  onMemoryUpdate(callback: MemoryUpdateCallback): () => void {
    this.memoryUpdateCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.memoryUpdateCallbacks = this.memoryUpdateCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Subscribe to typing indicators
   */
  onTyping(callback: TypingCallback): () => void {
    this.typingCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.typingCallbacks = this.typingCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): {
    isConnected: boolean;
    connectionId: string | null;
    reconnectAttempts: number;
  } {
    return {
      isConnected: this.isConnected,
      connectionId: this.connectionId,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  /**
   * Get current presence state
   */
  getCurrentPresences(): Record<string, PresenceState> {
    if (!this.channel) return {};

    const state = this.channel.presenceState();
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

    return presences;
  }
}

// Export singleton instance
export const realtimeSync = new RealtimeSyncManager();