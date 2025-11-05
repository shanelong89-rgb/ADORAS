/**
 * Push Notifications Service - Phase 4d
 * Manages web push notification subscriptions and delivery
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

// Deno-compatible base64 encoding function (replaces Buffer for our code)
function base64Encode(str: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary);
}

const notifications = new Hono();

// Apply CORS
notifications.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

/**
 * Send a Web Push notification using the web-push library
 */
async function sendWebPushNotification(
  subscription: PushSubscription,
  payload: any,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<void> {
  try {
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:noreply@adoras.app';
    
    // Configure VAPID details
    webpush.setVapidDetails(
      vapidSubject,
      vapidPublicKey,
      vapidPrivateKey
    );
    
    // Send the notification
    const payloadString = JSON.stringify(payload);
    await webpush.sendNotification(subscription, payloadString);
    
    console.log('✅ Push notification delivered successfully');
  } catch (error) {
    console.error('❌ Error sending web push:', error);
    
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
 * Get VAPID public key for client subscription
 * GET /make-server-deded1eb/notifications/vapid-public-key
 */
notifications.get('/make-server-deded1eb/notifications/vapid-public-key', async (c) => {
  try {
    const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    
    if (!publicKey) {
      console.error('VAPID_PUBLIC_KEY not configured');
      return c.json({ 
        error: 'Push notifications not configured',
        needsSetup: true 
      }, 503);
    }

    return c.json({ publicKey });
  } catch (error) {
    console.error('Error getting VAPID public key:', error);
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

    console.log('Subscribing user to push notifications:', userId);

    // Store subscription in KV store
    const subscriptionData: NotificationSubscriptionData = {
      userId,
      subscription,
      deviceInfo,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Use endpoint as unique key (using Deno-compatible encoding)
    const key = `push_sub:${userId}:${base64Encode(subscription.endpoint).substring(0, 32)}`;
    await kv.set(key, subscriptionData);

    // Store in user's subscription list
    const userSubsKey = `push_subs_list:${userId}`;
    const existingSubs = await kv.get(userSubsKey) || { subscriptions: [] };
    
    // Add new subscription if not already present
    if (!existingSubs.subscriptions.includes(key)) {
      existingSubs.subscriptions.push(key);
      await kv.set(userSubsKey, existingSubs);
    }

    console.log('Push subscription saved:', key);

    return c.json({ 
      success: true,
      message: 'Successfully subscribed to push notifications' 
    });

  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
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

    console.log('Unsubscribing user from push notifications:', userId);

    // Generate subscription key (using Deno-compatible encoding)
    const key = `push_sub:${userId}:${base64Encode(endpoint).substring(0, 32)}`;
    
    // Delete subscription
    await kv.del(key);

    // Remove from user's subscription list
    const userSubsKey = `push_subs_list:${userId}`;
    const existingSubs = await kv.get(userSubsKey) || { subscriptions: [] };
    existingSubs.subscriptions = existingSubs.subscriptions.filter((sub: string) => sub !== key);
    await kv.set(userSubsKey, existingSubs);

    console.log('Push subscription removed:', key);

    return c.json({ 
      success: true,
      message: 'Successfully unsubscribed from push notifications' 
    });

  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
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
    console.error('Error getting notification preferences:', error);
    return c.json({ error: 'Failed to get preferences' }, 500);
  }
});

/**
 * Update notification preferences
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

    console.log('Updating notification preferences for user:', preferences.userId);

    const key = `notif_prefs:${preferences.userId}`;
    await kv.set(key, preferences);

    console.log('Notification preferences updated');

    return c.json({ 
      success: true,
      preferences 
    });

  } catch (error) {
    console.error('Error updating notification preferences:', error);
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

    // Get VAPID keys
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      return c.json({ 
        error: 'Push notifications not configured',
        needsSetup: true 
      }, 503);
    }

    console.log('📱 [SEND] Sending push notification to user:', userId);

    // Get user's subscriptions
    const userSubsKey = `push_subs_list:${userId}`;
    const userSubs = await kv.get(userSubsKey);

    console.log('📱 [SEND] User subscriptions lookup:', {
      userId,
      userSubsKey,
      hasUserSubs: !!userSubs,
      subsCount: userSubs?.subscriptions?.length || 0,
      subscriptions: userSubs?.subscriptions || [],
    });

    if (!userSubs || !userSubs.subscriptions || userSubs.subscriptions.length === 0) {
      console.warn('⚠️ [SEND] No active subscriptions for user:', userId);
      return c.json({ 
        success: true,
        message: 'No active subscriptions',
        sent: 0 
      });
    }

    // Check notification preferences
    const prefsKey = `notif_prefs:${userId}`;
    const preferences = await kv.get(prefsKey);

    // Check quiet hours
    if (preferences?.quietHoursStart && preferences?.quietHoursEnd) {
      const now = new Date();
      const currentHour = now.getHours();
      const quietStart = parseInt(preferences.quietHoursStart.split(':')[0]);
      const quietEnd = parseInt(preferences.quietHoursEnd.split(':')[0]);

      if (currentHour >= quietStart || currentHour < quietEnd) {
        console.log('Notification suppressed due to quiet hours');
        return c.json({ 
          success: true,
          message: 'Notification suppressed (quiet hours)',
          sent: 0 
        });
      }
    }

    // Build notification payload
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

    // Send to all subscriptions (use web-push library in production)
    let successCount = 0;
    const failedSubscriptions: string[] = [];

    for (const subKey of userSubs.subscriptions) {
      try {
        const subData = await kv.get(subKey);
        
        if (!subData || !subData.subscription) {
          console.warn('Invalid subscription data for key:', subKey);
          continue;
        }

        // Send actual push notification using Web Push Protocol
        await sendWebPushNotification(
          subData.subscription,
          notificationPayload,
          vapidPublicKey,
          vapidPrivateKey
        );
        
        console.log('✅ Notification sent to:', subData.subscription.endpoint.substring(0, 50) + '...');
        successCount++;
      } catch (error) {
        console.error('Failed to send notification to subscription:', subKey, error);
        failedSubscriptions.push(subKey);
        
        // Remove invalid subscription
        await kv.del(subKey);
      }
    }

    // Update user's subscription list
    if (failedSubscriptions.length > 0) {
      userSubs.subscriptions = userSubs.subscriptions.filter(
        (sub: string) => !failedSubscriptions.includes(sub)
      );
      await kv.set(userSubsKey, userSubs);
    }

    console.log(`Notification sent to ${successCount} subscriptions`);

    return c.json({ 
      success: true,
      sent: successCount,
      failed: failedSubscriptions.length 
    });

  } catch (error) {
    console.error('Error sending push notification:', error);
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
