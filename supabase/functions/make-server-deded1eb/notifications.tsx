/**
 * Push Notifications Service - Optimized for Production
 * Manages web push notification subscriptions and delivery with performance optimizations
 */

import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { createClient } from 'npm:@supabase/supabase-js';
import webpush from 'npm:web-push';
import { Buffer } from 'node:buffer';
import * as kv from './kv_store.tsx';

// Make Buffer available globally for web-push library
// @ts-ignore: Deno global augmentation
globalThis.Buffer = Buffer;

// Production mode - disable verbose logging
const IS_PRODUCTION = Deno.env.get('DENO_ENV') === 'production' || true; // Enable by default
const DEBUG = !IS_PRODUCTION;

// Performance logging helper (only logs in debug mode)
function debugLog(...args: any[]) {
  if (DEBUG) {
    console.log(...args);
  }
}

// Error logging (always logs)
function errorLog(...args: any[]) {
  console.error(...args);
}

// Deno-compatible base64 encoding function (optimized)
function base64Encode(str: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  let binary = '';
  const len = data.length;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary);
}

// Cache for VAPID configuration (avoid repeated env reads)
let vapidConfigCache: {
  publicKey: string;
  privateKey: string;
  subject: string;
  timestamp: number;
} | null = null;

const VAPID_CACHE_TTL = 60 * 60 * 1000; // 1 hour

function getVapidConfig() {
  const now = Date.now();
  
  if (vapidConfigCache && (now - vapidConfigCache.timestamp) < VAPID_CACHE_TTL) {
    return vapidConfigCache;
  }
  
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const subject = Deno.env.get('VAPID_SUBJECT') || 'mailto:noreply@adoras.app';
  
  if (!publicKey || !privateKey) {
    return null;
  }
  
  vapidConfigCache = { publicKey, privateKey, subject, timestamp: now };
  return vapidConfigCache;
}

const notifications = new Hono();

// Log that notifications module is loading
console.log('📱 Notifications module initializing with /new-memory endpoint...');

// Apply CORS
notifications.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Simple diagnostic endpoint to verify notifications module is loaded
notifications.get('/make-server-deded1eb/notifications/diagnostic', (c) => {
  console.log('✅ Notifications diagnostic endpoint hit!');
  return c.json({
    status: 'ok',
    message: 'Notifications module is loaded and working',
    endpoints: [
      'POST /notifications/subscribe',
      'POST /notifications/unsubscribe',
      'POST /notifications/send',
      'POST /notifications/new-memory',
      'POST /notifications/milestone',
      'POST /notifications/test',
    ],
    timestamp: new Date().toISOString(),
  });
});

/**
 * Send a Web Push notification using the web-push library (Optimized)
 */
async function sendWebPushNotification(
  subscription: PushSubscription,
  payload: any,
  vapidConfig: { publicKey: string; privateKey: string; subject: string }
): Promise<void> {
  try {
    // Configure VAPID details (cached)
    webpush.setVapidDetails(
      vapidConfig.subject,
      vapidConfig.publicKey,
      vapidConfig.privateKey
    );
    
    // Send the notification with timeout
    const payloadString = JSON.stringify(payload);
    
    // Add timeout for push notification (5 seconds max)
    await Promise.race([
      webpush.sendNotification(subscription, payloadString),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Push notification timeout')), 5000)
      )
    ]);
    
    debugLog('✅ Push notification delivered successfully');
  } catch (error) {
    // Only log errors in debug mode or for critical errors
    if (DEBUG || error.statusCode === 404 || error.statusCode === 410) {
      errorLog('❌ Error sending web push:', error);
    }
    
    // If subscription is invalid (404, 410), throw specific error
    if (error.statusCode === 404 || error.statusCode === 410) {
      throw new Error('Subscription expired');
    }
    
    throw error;
  }
}

// Types
interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface NotificationSubscriptionData {
  userId: string;
  subscription: PushSubscription;
  deviceInfo?: {
    userAgent?: string;
    platform?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface NotificationPreferences {
  userId: string;
  newMemories: boolean;
  dailyPrompts: boolean;
  responses: boolean;
  milestones: boolean;
  partnerActivity: boolean;
  quietHoursStart?: string; // HH:MM format
  quietHoursEnd?: string; // HH:MM format
  timezone?: string;
}

/**
 * Get VAPID public key for client subscription (Cached)
 * GET /make-server-deded1eb/notifications/vapid-public-key
 */
notifications.get('/make-server-deded1eb/notifications/vapid-public-key', async (c) => {
  try {
    const config = getVapidConfig();
    
    if (!config) {
      errorLog('VAPID_PUBLIC_KEY not configured');
      return c.json({ 
        error: 'Push notifications not configured',
        needsSetup: true 
      }, 503);
    }

    // Cache response for 1 hour
    c.header('Cache-Control', 'public, max-age=3600');
    return c.json({ publicKey: config.publicKey });
  } catch (error) {
    errorLog('Error getting VAPID public key:', error);
    return c.json({ error: 'Failed to get VAPID key' }, 500);
  }
});

/**
 * Subscribe to push notifications
 * POST /make-server-deded1eb/notifications/subscribe
 * 
 * Body: {
 *   userId: string,
 *   subscription: PushSubscription,
 *   deviceInfo?: object
 * }
 */
notifications.post('/make-server-deded1eb/notifications/subscribe', async (c) => {
  try {
    const { userId, subscription, deviceInfo } = await c.req.json();

    if (!userId || !subscription) {
      return c.json({ error: 'userId and subscription are required' }, 400);
    }

    debugLog('Subscribing user to push notifications:', userId);

    // Generate subscription key once
    const key = `push_sub:${userId}:${base64Encode(subscription.endpoint).substring(0, 32)}`;
    const userSubsKey = `push_subs_list:${userId}`;

    // Batch database operations for better performance
    const [existingSubs] = await Promise.all([
      kv.get(userSubsKey)
    ]);

    // Store subscription in KV store
    const subscriptionData: NotificationSubscriptionData = {
      userId,
      subscription,
      deviceInfo,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Prepare batch operations
    const operations = [kv.set(key, subscriptionData)];
    
    // Add new subscription if not already present
    const subsList = existingSubs || { subscriptions: [] };
    if (!subsList.subscriptions.includes(key)) {
      subsList.subscriptions.push(key);
      operations.push(kv.set(userSubsKey, subsList));
    }

    // Execute all operations in parallel
    await Promise.all(operations);

    debugLog('Push subscription saved:', key);

    return c.json({ 
      success: true,
      message: 'Successfully subscribed to push notifications' 
    });

  } catch (error) {
    errorLog('Error subscribing to push notifications:', error);
    return c.json({ 
      error: 'Failed to subscribe',
      details: error.message 
    }, 500);
  }
});

/**
 * Unsubscribe from push notifications
 * POST /make-server-deded1eb/notifications/unsubscribe
 * 
 * Body: {
 *   userId: string,
 *   endpoint: string
 * }
 */
notifications.post('/make-server-deded1eb/notifications/unsubscribe', async (c) => {
  try {
    const { userId, endpoint } = await c.req.json();

    if (!userId || !endpoint) {
      return c.json({ error: 'userId and endpoint are required' }, 400);
    }

    debugLog('Unsubscribing user from push notifications:', userId);

    // Generate subscription key (using Deno-compatible encoding)
    const key = `push_sub:${userId}:${base64Encode(endpoint).substring(0, 32)}`;
    const userSubsKey = `push_subs_list:${userId}`;
    
    // Batch operations
    const [existingSubs] = await Promise.all([
      kv.get(userSubsKey),
      kv.del(key)
    ]);

    // Remove from user's subscription list
    const subsList = existingSubs || { subscriptions: [] };
    subsList.subscriptions = subsList.subscriptions.filter((sub: string) => sub !== key);
    await kv.set(userSubsKey, subsList);

    debugLog('Push subscription removed:', key);

    return c.json({ 
      success: true,
      message: 'Successfully unsubscribed from push notifications' 
    });

  } catch (error) {
    errorLog('Error unsubscribing from push notifications:', error);
    return c.json({ 
      error: 'Failed to unsubscribe',
      details: error.message 
    }, 500);
  }
});

/**
 * Get notification preferences
 * GET /make-server-deded1eb/notifications/preferences/:userId
 */
notifications.get('/make-server-deded1eb/notifications/preferences/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');

    if (!userId) {
      return c.json({ error: 'userId is required' }, 400);
    }

    const key = `notif_prefs:${userId}`;
    const preferences = await kv.get(key);

    // Return default preferences if not set
    if (!preferences) {
      const defaultPreferences: NotificationPreferences = {
        userId,
        newMemories: true,
        dailyPrompts: true,
        responses: true,
        milestones: true,
        partnerActivity: true,
        timezone: 'America/New_York',
      };
      return c.json(defaultPreferences);
    }

    return c.json(preferences);

  } catch (error) {
    errorLog('Error getting notification preferences:', error);
    return c.json({ error: 'Failed to get preferences' }, 500);
  }
});

/**
 * Update notification preferences (Optimized)
 * PUT /make-server-deded1eb/notifications/preferences
 * 
 * Body: NotificationPreferences
 */
notifications.put('/make-server-deded1eb/notifications/preferences', async (c) => {
  try {
    const preferences = await c.req.json() as NotificationPreferences;

    if (!preferences.userId) {
      return c.json({ error: 'userId is required' }, 400);
    }

    debugLog('Updating notification preferences for user:', preferences.userId);

    const key = `notif_prefs:${preferences.userId}`;
    await kv.set(key, preferences);

    debugLog('Notification preferences updated');

    return c.json({ 
      success: true,
      preferences 
    });

  } catch (error) {
    errorLog('Error updating notification preferences:', error);
    return c.json({ 
      error: 'Failed to update preferences',
      details: error.message 
    }, 500);
  }
});

/**
 * Send a push notification to a user
 * POST /make-server-deded1eb/notifications/send
 * 
 * Body: {
 *   userId: string,
 *   title: string,
 *   body: string,
 *   icon?: string,
 *   badge?: string,
 *   data?: object,
 *   tag?: string
 * }
 */
notifications.post('/make-server-deded1eb/notifications/send', async (c) => {
  try {
    const { userId, title, body, icon, badge, data, tag } = await c.req.json();

    if (!userId || !title || !body) {
      return c.json({ error: 'userId, title, and body are required' }, 400);
    }

    // Get VAPID config from cache
    const vapidConfig = getVapidConfig();

    if (!vapidConfig) {
      return c.json({ 
        error: 'Push notifications not configured',
        needsSetup: true 
      }, 503);
    }

    debugLog('📱 [SEND] Sending push notification to user:', userId);

    // Batch fetch subscriptions and preferences in parallel
    const userSubsKey = `push_subs_list:${userId}`;
    const prefsKey = `notif_prefs:${userId}`;
    
    const [userSubs, preferences] = await Promise.all([
      kv.get(userSubsKey),
      kv.get(prefsKey)
    ]);

    debugLog('📱 [SEND] User subscriptions:', {
      userId,
      subsCount: userSubs?.subscriptions?.length || 0,
    });

    if (!userSubs || !userSubs.subscriptions || userSubs.subscriptions.length === 0) {
      debugLog('⚠️ [SEND] No active subscriptions for user:', userId);
      return c.json({ 
        success: true,
        message: 'No active subscriptions',
        sent: 0 
      });
    }

    // Check quiet hours (quick exit)
    if (preferences?.quietHoursStart && preferences?.quietHoursEnd) {
      const now = new Date();
      const currentHour = now.getHours();
      const quietStart = parseInt(preferences.quietHoursStart.split(':')[0]);
      const quietEnd = parseInt(preferences.quietHoursEnd.split(':')[0]);

      if (currentHour >= quietStart || currentHour < quietEnd) {
        debugLog('Notification suppressed due to quiet hours');
        return c.json({ 
          success: true,
          message: 'Notification suppressed (quiet hours)',
          sent: 0 
        });
      }
    }

    // Build notification payload once
    const notificationPayload = {
      title,
      body,
      icon: icon || '/icon-192.png',
      badge: badge || '/icon-192.png',
      data: data || {},
      tag: tag || 'adoras-notification',
      timestamp: Date.now(),
      requireInteraction: false,
    };

    // Fetch all subscriptions in parallel (batch optimization)
    const subDataPromises = userSubs.subscriptions.map((subKey: string) => 
      kv.get(subKey).then(data => ({ subKey, data }))
    );
    const allSubData = await Promise.all(subDataPromises);

    // Send to all subscriptions in parallel with Promise.allSettled
    const sendPromises = allSubData
      .filter(({ data }) => data && data.subscription)
      .map(({ subKey, data }) => 
        sendWebPushNotification(
          data.subscription,
          notificationPayload,
          vapidConfig
        ).then(() => ({ success: true, subKey }))
          .catch(error => ({ success: false, subKey, error }))
      );

    const results = await Promise.allSettled(sendPromises);

    // Process results
    let successCount = 0;
    const failedSubscriptions: string[] = [];
    const deletePromises: Promise<any>[] = [];

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { success, subKey, error } = result.value;
        if (success) {
          successCount++;
        } else {
          debugLog('Failed to send notification:', subKey, error);
          failedSubscriptions.push(subKey);
          deletePromises.push(kv.del(subKey));
        }
      }
    }

    // Batch delete invalid subscriptions
    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
      
      // Update user's subscription list
      userSubs.subscriptions = userSubs.subscriptions.filter(
        (sub: string) => !failedSubscriptions.includes(sub)
      );
      await kv.set(userSubsKey, userSubs);
    }

    debugLog(`Notification sent to ${successCount} subscriptions`);

    return c.json({ 
      success: true,
      sent: successCount,
      failed: failedSubscriptions.length 
    });

  } catch (error) {
    errorLog('Error sending push notification:', error);
    return c.json({ 
      error: 'Failed to send notification',
      details: error.message 
    }, 500);
  }
});

/**
 * Send notification to all family members
 * POST /make-server-deded1eb/notifications/send-to-family
 * 
 * Body: {
 *   familyId: string,
 *   title: string,
 *   body: string,
 *   icon?: string,
 *   data?: object,
 *   excludeUserId?: string
 * }
 */
notifications.post('/make-server-deded1eb/notifications/send-to-family', async (c) => {
  try {
    const { familyId, title, body, icon, data, excludeUserId } = await c.req.json();

    if (!familyId || !title || !body) {
      return c.json({ error: 'familyId, title, and body are required' }, 400);
    }

    console.log('Sending notification to family:', familyId);

    // Get family members from KV store
    const familyKey = `family:${familyId}`;
    const familyData = await kv.get(familyKey);

    if (!familyData || !familyData.members) {
      return c.json({ error: 'Family not found' }, 404);
    }

    // Send notification to each member
    let totalSent = 0;

    for (const memberId of familyData.members) {
      // Skip excluded user
      if (memberId === excludeUserId) continue;

      try {
        // Call the send endpoint for each member
        const response = await fetch(`${c.req.url.replace('/send-to-family', '/send')}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': c.req.header('Authorization') || '',
          },
          body: JSON.stringify({
            userId: memberId,
            title,
            body,
            icon,
            data,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          totalSent += result.sent || 0;
        }
      } catch (error) {
        console.error('Failed to send notification to member:', memberId, error);
      }
    }

    console.log(`Notifications sent to ${totalSent} devices across family`);

    return c.json({ 
      success: true,
      sent: totalSent 
    });

  } catch (error) {
    console.error('Error sending family notification:', error);
    return c.json({ 
      error: 'Failed to send family notification',
      details: error.message 
    }, 500);
  }
});

/**
 * Test notification (for development)
 * POST /make-server-deded1eb/notifications/test
 * 
 * Body: {
 *   userId: string
 * }
 */
notifications.post('/make-server-deded1eb/notifications/test', async (c) => {
  try {
    const { userId } = await c.req.json();

    if (!userId) {
      return c.json({ error: 'userId is required' }, 400);
    }

    // Send test notification
    const response = await fetch(`${c.req.url.replace('/test', '/send')}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': c.req.header('Authorization') || '',
      },
      body: JSON.stringify({
        userId,
        title: '🎉 Adoras Test Notification',
        body: 'Your notifications are working perfectly!',
        data: { test: true },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return c.json({ error: error.error || 'Test failed' }, response.status);
    }

    const result = await response.json();

    return c.json({ 
      success: true,
      message: 'Test notification sent',
      result 
    });

  } catch (error) {
    console.error('Error sending test notification:', error);
    return c.json({ 
      error: 'Failed to send test notification',
      details: error.message 
    }, 500);
  }
});

/**
 * Schedule daily prompt notification
 * POST /make-server-deded1eb/notifications/schedule-daily-prompt
 * 
 * Body: {
 *   userId: string,
 *   promptText: string,
 *   scheduledTime?: string, // ISO format, defaults to 9 AM user's timezone
 * }
 */
notifications.post('/make-server-deded1eb/notifications/schedule-daily-prompt', async (c) => {
  try {
    const { userId, promptText, scheduledTime } = await c.req.json();

    if (!userId || !promptText) {
      return c.json({ error: 'userId and promptText are required' }, 400);
    }

    console.log('Scheduling daily prompt for user:', userId);

    // Get user's notification preferences
    const prefsKey = `notif_prefs:${userId}`;
    const preferences = await kv.get(prefsKey);

    // Check if daily prompts are enabled
    if (preferences && preferences.dailyPrompts === false) {
      return c.json({ 
        success: true,
        message: 'Daily prompts disabled for this user',
        scheduled: false 
      });
    }

    // Gamified daily prompt notification (Duolingo-style)
    const emojis = ['🌟', '✨', '💭', '🎯', '🔥', '💡', '🎨', '📖'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    
    const encouragements = [
      'Your story matters!',
      'Time to share a memory!',
      'Keep your streak going!',
      'Your family is waiting!',
      'Make today memorable!',
    ];
    const randomEncouragement = encouragements[Math.floor(Math.random() * encouragements.length)];

    // Send the notification
    const response = await fetch(`${c.req.url.replace('/schedule-daily-prompt', '/send')}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': c.req.header('Authorization') || '',
      },
      body: JSON.stringify({
        userId,
        title: `${randomEmoji} ${randomEncouragement}`,
        body: promptText,
        type: 'prompt',
        tag: 'daily-prompt',
        requireInteraction: true,
        data: {
          type: 'daily_prompt',
          promptText,
          timestamp: scheduledTime || new Date().toISOString(),
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return c.json({ error: error.error || 'Failed to send prompt' }, response.status);
    }

    const result = await response.json();

    return c.json({ 
      success: true,
      scheduled: true,
      message: 'Daily prompt notification sent',
      result 
    });

  } catch (error) {
    console.error('Error scheduling daily prompt:', error);
    return c.json({ 
      error: 'Failed to schedule daily prompt',
      details: error.message 
    }, 500);
  }
});

/**
 * Send iMessage-style notification for new memory
 * POST /make-server-deded1eb/notifications/new-memory
 * 
 * Body: {
 *   userId: string,
 *   senderName: string,
 *   memoryType: 'photo' | 'video' | 'voice' | 'text',
 *   memoryId: string,
 *   previewText?: string,
 *   mediaUrl?: string,
 * }
 */
notifications.post('/make-server-deded1eb/notifications/new-memory', async (c) => {
  try {
    const requestBody = await c.req.json();
    const { userId, senderName, memoryType, memoryId, previewText, mediaUrl } = requestBody;

    console.log('📱 [NEW MEMORY NOTIFICATION] Request received:', {
      userId,
      senderName,
      memoryType,
      memoryId,
      hasPreviewText: !!previewText,
      hasMediaUrl: !!mediaUrl,
    });

    if (!userId || !senderName || !memoryType) {
      console.error('❌ Missing required fields:', { userId, senderName, memoryType });
      return c.json({ error: 'userId, senderName, and memoryType are required' }, 400);
    }

    console.log('📱 Sending new memory notification to user:', userId);

    // Get user's notification preferences
    const prefsKey = `notif_prefs:${userId}`;
    const preferences = await kv.get(prefsKey);

    console.log('📱 User preferences:', {
      userId,
      prefsKey,
      hasPreferences: !!preferences,
      newMemoriesEnabled: preferences?.newMemories !== false,
      preferences,
    });

    // Check if new memory notifications are enabled
    if (preferences && preferences.newMemories === false) {
      console.log('⚠️ New memory notifications disabled for user:', userId);
      return c.json({ 
        success: true,
        message: 'New memory notifications disabled for this user',
        sent: false 
      });
    }

    // Create iMessage-style notification
    const typeEmojis = {
      photo: '📷',
      video: '🎥',
      voice: '🎤',
      text: '💬',
      document: '📄',
    };

    const typeLabels = {
      photo: 'sent a photo',
      video: 'sent a video',
      voice: 'sent a voice note',
      text: 'sent a message',
      document: 'sent a document',
    };

    const emoji = typeEmojis[memoryType] || '💭';
    const action = typeLabels[memoryType] || 'shared a memory';
    
    let body = `${action}`;
    if (previewText) {
      body = previewText.length > 80 
        ? previewText.substring(0, 77) + '...' 
        : previewText;
    }

    // Send the notification
    const notificationPayload = {
      userId,
      title: `${emoji} ${senderName}`,
      body,
      type: 'message',
      tag: `memory-${memoryId}`,
      requireInteraction: false,
      image: memoryType === 'photo' ? mediaUrl : undefined,
      data: {
        type: 'new_memory',
        memoryId,
        memoryType,
        senderName,
        timestamp: new Date().toISOString(),
      },
    };

    console.log('📱 Calling /send endpoint with payload:', notificationPayload);

    const sendUrl = c.req.url.replace('/new-memory', '/send');
    console.log('📱 Send URL:', sendUrl);

    const response = await fetch(sendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': c.req.header('Authorization') || '',
      },
      body: JSON.stringify(notificationPayload),
    });

    console.log('📱 /send response status:', response.status, response.statusText);

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ /send failed:', error);
      return c.json({ error: error.error || 'Failed to send notification' }, response.status);
    }

    const result = await response.json();
    console.log('✅ /send success:', result);

    return c.json({ 
      success: true,
      sent: true,
      message: 'New memory notification sent',
      result 
    });

  } catch (error) {
    console.error('Error sending new memory notification:', error);
    return c.json({ 
      error: 'Failed to send new memory notification',
      details: error.message 
    }, 500);
  }
});

/**
 * Send milestone/celebration notification
 * POST /make-server-deded1eb/notifications/milestone
 * 
 * Body: {
 *   userId: string,
 *   milestoneType: 'streak' | 'memories' | 'anniversary',
 *   count?: number,
 *   message: string,
 * }
 */
notifications.post('/make-server-deded1eb/notifications/milestone', async (c) => {
  try {
    const { userId, milestoneType, count, message } = await c.req.json();

    if (!userId || !milestoneType || !message) {
      return c.json({ error: 'userId, milestoneType, and message are required' }, 400);
    }

    // Get user's notification preferences
    const prefsKey = `notif_prefs:${userId}`;
    const preferences = await kv.get(prefsKey);

    if (preferences && preferences.milestones === false) {
      return c.json({ 
        success: true,
        message: 'Milestone notifications disabled for this user',
        sent: false 
      });
    }

    const celebrationEmojis = {
      streak: '🔥',
      memories: '🎉',
      anniversary: '💝',
    };

    const emoji = celebrationEmojis[milestoneType] || '🌟';
    const title = count 
      ? `${emoji} ${count} ${milestoneType === 'streak' ? 'Day Streak!' : milestoneType === 'memories' ? 'Memories!' : 'Years Together!'}`
      : `${emoji} Milestone Reached!`;

    // Send the notification
    const response = await fetch(`${c.req.url.replace('/milestone', '/send')}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': c.req.header('Authorization') || '',
      },
      body: JSON.stringify({
        userId,
        title,
        body: message,
        type: 'milestone',
        tag: `milestone-${milestoneType}`,
        requireInteraction: true,
        data: {
          type: 'milestone',
          milestoneType,
          count,
          timestamp: new Date().toISOString(),
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return c.json({ error: error.error || 'Failed to send milestone notification' }, response.status);
    }

    const result = await response.json();

    return c.json({ 
      success: true,
      sent: true,
      message: 'Milestone notification sent',
      result 
    });

  } catch (error) {
    console.error('Error sending milestone notification:', error);
    return c.json({ 
      error: 'Failed to send milestone notification',
      details: error.message 
    }, 500);
  }
});

export default notifications;
