/**
 * Realtime Sync - Clean Architecture
 * 
 * Uses Supabase Postgres Changes instead of manual broadcasts
 * Much simpler and more reliable!
 */

import { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabase/client';

const supabase = getSupabaseClient();

// ============================================================================
// TYPES
// ============================================================================

export interface Message {
  id: string;
  connection_id: string;
  sender_id: string;
  type: 'text' | 'photo' | 'voice' | 'video' | 'document';
  content: string;
  created_at: string;
  read_by: string[];
  // ... other fields
  [key: string]: any;
}

export interface Connection {
  id: string;
  keeper_id: string;
  teller_id: string;
  status: string;
  // ... other fields
  [key: string]: any;
}

type MessageCallback = (message: Message, event: 'INSERT' | 'UPDATE' | 'DELETE') => void;
type ConnectionCallback = (connection: Connection, event: 'INSERT' | 'UPDATE' | 'DELETE') => void;
type PresenceCallback = (connectionId: string, users: { userId: string; userName: string; online: boolean }[]) => void;

// ============================================================================
// REALTIME MANAGER
// ============================================================================

class RealtimeManager {
  private channels: Map<string, RealtimeChannel> = new Map();
  private messageCallbacks: MessageCallback[] = [];
  private connectionCallbacks: ConnectionCallback[] = [];
  private presenceCallbacks: Map<string, PresenceCallback> = new Map();

  /**
   * Subscribe to messages for a specific connection
   */
  subscribeToMessages(connectionId: string, userId: string) {
    const channelName = `messages:${connectionId}`;

    // Check if already subscribed
    if (this.channels.has(channelName)) {
      console.log(`ℹ️ Already subscribed to ${channelName}`);
      return;
    }

    console.log(`📡 Subscribing to messages for connection: ${connectionId}`);

    const channel = supabase
      .channel(channelName)
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
            console.log(`ℹ️ Ignoring own message: ${message.id}`);
            return;
          }

          console.log(`📨 New message received: ${message.id}`);
          this.messageCallbacks.forEach(cb => cb(message, 'INSERT'));
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
          console.log(`📝 Message updated: ${message.id}`);
          this.messageCallbacks.forEach(cb => cb(message, 'UPDATE'));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `connection_id=eq.${connectionId}`,
        },
        (payload) => {
          const message = payload.old as Message;
          console.log(`🗑️ Message deleted: ${message.id}`);
          this.messageCallbacks.forEach(cb => cb(message, 'DELETE'));
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Subscribed to messages: ${connectionId}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Subscription error for ${connectionId}`);
        }
      });

    this.channels.set(channelName, channel);
  }

  /**
   * Subscribe to connection changes (for all user's connections)
   */
  subscribeToConnections(userId: string) {
    const channelName = `connections:${userId}`;

    // Check if already subscribed
    if (this.channels.has(channelName)) {
      console.log(`ℹ️ Already subscribed to ${channelName}`);
      return;
    }

    console.log(`📡 Subscribing to connections for user: ${userId}`);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'connections',
          // Filter: where user is either keeper or teller
          // Note: Postgres RLS handles this automatically, so we just listen to all
        },
        (payload) => {
          const connection = payload.new as Connection;
          
          // Only process if user is part of connection
          if (connection.keeper_id === userId || connection.teller_id === userId) {
            console.log(`🔗 New connection: ${connection.id}`);
            this.connectionCallbacks.forEach(cb => cb(connection, 'INSERT'));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'connections',
        },
        (payload) => {
          const connection = payload.new as Connection;
          
          if (connection.keeper_id === userId || connection.teller_id === userId) {
            console.log(`🔗 Connection updated: ${connection.id}`);
            this.connectionCallbacks.forEach(cb => cb(connection, 'UPDATE'));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Subscribed to connections for user: ${userId}`);
        }
      });

    this.channels.set(channelName, channel);
  }

  /**
   * Subscribe to presence (online/offline status)
   */
  subscribeToPresence(connectionId: string, userId: string, userName: string) {
    const channelName = `presence:${connectionId}`;

    // Check if already subscribed
    if (this.channels.has(channelName)) {
      console.log(`ℹ️ Already subscribed to presence: ${connectionId}`);
      return;
    }

    console.log(`👥 Subscribing to presence for connection: ${connectionId}`);

    const channel = supabase
      .channel(channelName)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.entries(state).map(([key, presences]: [string, any[]]) => ({
          userId: presences[0]?.userId,
          userName: presences[0]?.userName,
          online: true,
        }));

        const callback = this.presenceCallbacks.get(connectionId);
        if (callback) {
          callback(connectionId, users);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track own presence
          await channel.track({
            userId,
            userName,
            online: true,
            lastSeen: new Date().toISOString(),
          });
          console.log(`✅ Tracking presence in ${connectionId}`);
        }
      });

    this.channels.set(channelName, channel);
  }

  /**
   * Unsubscribe from messages
   */
  unsubscribeFromMessages(connectionId: string) {
    const channelName = `messages:${connectionId}`;
    const channel = this.channels.get(channelName);

    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
      console.log(`✅ Unsubscribed from messages: ${connectionId}`);
    }
  }

  /**
   * Unsubscribe from presence
   */
  unsubscribeFromPresence(connectionId: string) {
    const channelName = `presence:${connectionId}`;
    const channel = this.channels.get(channelName);

    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
      console.log(`✅ Unsubscribed from presence: ${connectionId}`);
    }
  }

  /**
   * Unsubscribe from all
   */
  unsubscribeAll() {
    this.channels.forEach((channel, name) => {
      supabase.removeChannel(channel);
      console.log(`✅ Unsubscribed from ${name}`);
    });
    this.channels.clear();
    this.messageCallbacks = [];
    this.connectionCallbacks = [];
    this.presenceCallbacks.clear();
  }

  /**
   * Register message callback
   */
  onMessage(callback: MessageCallback) {
    this.messageCallbacks.push(callback);
    return () => {
      this.messageCallbacks = this.messageCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Register connection callback
   */
  onConnection(callback: ConnectionCallback) {
    this.connectionCallbacks.push(callback);
    return () => {
      this.connectionCallbacks = this.connectionCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Register presence callback
   */
  onPresence(connectionId: string, callback: PresenceCallback) {
    this.presenceCallbacks.set(connectionId, callback);
    return () => {
      this.presenceCallbacks.delete(connectionId);
    };
  }

  /**
   * Send typing indicator (broadcast)
   */
  async sendTyping(connectionId: string, isTyping: boolean) {
    const channelName = `messages:${connectionId}`;
    const channel = this.channels.get(channelName);

    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { isTyping },
      });
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const realtimeManager = new RealtimeManager();
