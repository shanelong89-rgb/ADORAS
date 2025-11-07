/**
 * Adoras Memories Management
 * 
 * Handles creation, retrieval, updating, and deletion of memories
 * with Supabase Storage integration for media files
 */

import { createClient } from 'jsr:@supabase/supabase-js';
import * as kv from './kv_store.tsx';
import { Memory, Connection, Keys, generateId } from './database.tsx';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

const BUCKET_NAME = 'make-deded1eb-adoras-media';

/**
 * Initialize Supabase Storage bucket
 */
export async function initializeStorage() {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);

    if (!bucketExists) {
      const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true, // Make bucket public so AI services can access images
      });

      if (error) {
        // If bucket already exists, it's not an error - just log and continue
        if (error.message.includes('already exists')) {
          console.log(`ℹ️  Storage bucket already exists: ${BUCKET_NAME}`);
          return { success: true };
        }
        throw new Error(`Failed to create bucket: ${error.message}`);
      }

      console.log(`✅ Created storage bucket: ${BUCKET_NAME}`);
    } else {
      console.log(`ℹ️  Storage bucket already exists: ${BUCKET_NAME}`);
      
      // Update bucket to be public if it exists but is private
      try {
        await supabase.storage.updateBucket(BUCKET_NAME, {
          public: true,
        });
        console.log(`✅ Updated storage bucket to public: ${BUCKET_NAME}`);
      } catch (updateError) {
        console.log(`ℹ️  Bucket update skipped (may already be public)`);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error initializing storage:', error);
    // Don't return error if bucket already exists
    if (error instanceof Error && error.message.includes('already exists')) {
      return { success: true };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Upload file to Supabase Storage
 */
export async function uploadFile(params: {
  userId: string;
  connectionId: string;
  file: File | Blob;
  fileName: string;
  contentType: string;
}) {
  try {
    const filePath = `${params.connectionId}/${params.userId}/${Date.now()}-${params.fileName}`;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, params.file, {
        contentType: params.contentType,
        upsert: false,
      });

    if (error) {
      throw new Error(`File upload failed: ${error.message}`);
    }

    return {
      success: true,
      path: data.path,
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get signed URL for private file
 */
export async function getSignedUrl(filePath: string, expiresIn: number = 3600) {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`);
    }

    return {
      success: true,
      url: data.signedUrl,
    };
  } catch (error) {
    console.error('Error getting signed URL:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get public URL for a file (since bucket is now public)
 * This is used for AI analysis where external services need to access images
 */
export async function getPublicUrl(filePath: string) {
  try {
    const { data } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return {
      success: true,
      url: data.publicUrl,
    };
  } catch (error) {
    console.error('Error getting public URL:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create a new memory
 */
export async function createMemory(params: {
  userId: string;
  connectionId: string;
  type: Memory['type'];
  content: string;
  sender: 'keeper' | 'teller';
  estimatedDate?: string;
  category?: string;
  tags?: string[];
  transcript?: string;
  originalText?: string;
  voiceLanguage?: string;
  englishTranslation?: string;
  audioUrl?: string;
  photoUrl?: string;
  photoDate?: string;
  photoLocation?: string;
  photoGPSCoordinates?: { latitude: number; longitude: number };
  detectedPeople?: string[];
  videoUrl?: string;
  videoThumbnail?: string;
  videoDate?: string;
  videoLocation?: string;
  videoGPSCoordinates?: { latitude: number; longitude: number };
  videoPeople?: string[];
  documentUrl?: string;
  documentType?: string;
  documentFileName?: string;
  notes?: string;
  location?: string;
  promptQuestion?: string;
  conversationContext?: string;
  voiceVisualReference?: string;
}) {
  try {
    // Verify connection exists
    const connection = await kv.get<Connection>(Keys.connection(params.connectionId));
    if (!connection) {
      throw new Error('Connection not found');
    }

    // Verify user is part of this connection
    if (connection.keeperId !== params.userId && connection.tellerId !== params.userId) {
      throw new Error('User not authorized for this connection');
    }

    // Create memory
    const memoryId = generateId();
    const memory: Memory = {
      id: memoryId,
      userId: params.userId,
      connectionId: params.connectionId,
      type: params.type,
      content: params.content,
      sender: params.sender,
      timestamp: new Date().toISOString(),
      estimatedDate: params.estimatedDate,
      category: params.category || 'Uncategorized',
      tags: params.tags || [],
      transcript: params.transcript,
      originalText: params.originalText,
      voiceLanguage: params.voiceLanguage,
      englishTranslation: params.englishTranslation,
      audioUrl: params.audioUrl,
      photoUrl: params.photoUrl,
      photoDate: params.photoDate,
      photoLocation: params.photoLocation,
      photoGPSCoordinates: params.photoGPSCoordinates,
      detectedPeople: params.detectedPeople,
      videoUrl: params.videoUrl,
      videoThumbnail: params.videoThumbnail,
      videoDate: params.videoDate,
      videoLocation: params.videoLocation,
      videoGPSCoordinates: params.videoGPSCoordinates,
      videoPeople: params.videoPeople,
      documentUrl: params.documentUrl,
      documentType: params.documentType,
      documentFileName: params.documentFileName,
      notes: params.notes,
      location: params.location,
      promptQuestion: params.promptQuestion,
      conversationContext: params.conversationContext,
      voiceVisualReference: params.voiceVisualReference,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Store memory
    await kv.set(Keys.memory(memoryId), memory);

    // Add to connection's memories list
    const connectionMemories = await kv.get<string[]>(Keys.connectionMemories(params.connectionId)) || [];
    connectionMemories.push(memoryId);
    await kv.set(Keys.connectionMemories(params.connectionId), connectionMemories);

    // Send notification to the other person in the connection
    try {
      const recipientId = connection.keeperId === params.userId ? connection.tellerId : connection.keeperId;
      
      if (recipientId) {
        // Get sender's profile for notification
        const senderProfile = await kv.get<{ name?: string }>(Keys.user(params.userId));
        const senderName = senderProfile?.name || 'Someone';
        
        // Determine notification title and body based on memory type
        let notificationTitle = `New message from ${senderName}`;
        let notificationBody = '';
        
        if (params.type === 'text') {
          notificationBody = params.content.length > 100 
            ? params.content.substring(0, 100) + '...' 
            : params.content;
        } else if (params.type === 'voice') {
          notificationBody = params.transcript || '🎤 Voice message';
        } else if (params.type === 'photo') {
          notificationBody = '📷 Photo';
        } else if (params.type === 'video') {
          notificationBody = '🎥 Video';
        } else if (params.type === 'document') {
          notificationBody = `📄 ${params.documentFileName || 'Document'}`;
        }
        
        // Send notification (use internal API - we're already in the server)
        const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
        const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
        
        if (vapidPublicKey && vapidPrivateKey) {
          // Import the notification sending functionality
          const webpush = await import('npm:web-push');
          
          // Get recipient's push subscriptions
          const userSubsKey = `push_subs_list:${recipientId}`;
          const userSubs = await kv.get(userSubsKey);
          
          if (userSubs && userSubs.subscriptions && userSubs.subscriptions.length > 0) {
            const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:noreply@adoras.app';
            
            webpush.default.setVapidDetails(
              vapidSubject,
              vapidPublicKey,
              vapidPrivateKey
            );
            
            const notificationPayload = {
              title: notificationTitle,
              body: notificationBody,
              icon: '/icon-192.png',
              badge: '/icon-192.png',
              data: {
                type: 'new_message',
                connectionId: params.connectionId,
                memoryId: memoryId,
                sender: senderName
              },
              tag: `message-${memoryId}`,
              timestamp: Date.now(),
              requireInteraction: false,
            };
            
            // Send to all subscriptions
            for (const subKey of userSubs.subscriptions) {
              try {
                const subData = await kv.get(subKey);
                
                if (subData && subData.subscription) {
                  await webpush.default.sendNotification(
                    subData.subscription,
                    JSON.stringify(notificationPayload)
                  );
                  console.log(`✅ Notification sent to ${recipientId} for memory ${memoryId}`);
                }
              } catch (notifError) {
                // Log but don't fail memory creation if notification fails
                console.error(`⚠️ Failed to send notification:`, notifError);
              }
            }
          } else {
            console.log(`ℹ️ No push subscriptions found for user ${recipientId}`);
          }
        }
      }
    } catch (notificationError) {
      // Log error but don't fail memory creation
      console.error('Error sending notification:', notificationError);
    }

    return {
      success: true,
      memory,
    };
  } catch (error) {
    console.error('Error creating memory:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get memories for a connection
 */
export async function getConnectionMemories(params: {
  connectionId: string;
  userId: string;
}) {
  try {
    // Verify connection exists and user is authorized
    const connection = await kv.get<Connection>(Keys.connection(params.connectionId));
    if (!connection) {
      console.warn(`⚠️ Connection not found: ${params.connectionId}`);
      return {
        success: true,
        hasMemories: false,
        memories: [],
      };
    }

    if (connection.keeperId !== params.userId && connection.tellerId !== params.userId) {
      console.warn(`⚠️ User ${params.userId} not authorized for connection ${params.connectionId}`);
      return {
        success: false,
        error: 'User not authorized for this connection',
      };
    }

    // Get memory IDs - handle null/undefined case
    const memoryIds = await kv.get<string[]>(Keys.connectionMemories(params.connectionId));
    
    // If no memories exist yet, return empty array (not an error)
    if (!memoryIds || memoryIds.length === 0) {
      console.log(`ℹ️ No memories found for connection: ${params.connectionId}`);
      return {
        success: true,
        hasMemories: false,
        memories: [],
      };
    }

    // Fetch all memories - handle errors gracefully
    const memories = await Promise.all(
      memoryIds.map(async (id) => {
        try {
          const memory = await kv.get<Memory>(Keys.memory(id));
          return memory;
        } catch (error) {
          // Handle Supabase/Cloudflare errors gracefully
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          // Check if this is a Cloudflare 500 error (HTML response)
          if (errorMessage.includes('<!DOCTYPE html>') || errorMessage.includes('Internal server error')) {
            console.error(`❌ Supabase database error fetching memory ${id} - Database may be temporarily unavailable`);
          } else {
            console.error(`❌ Error fetching memory ${id}:`, errorMessage.substring(0, 200));
          }
          
          return null;
        }
      })
    );

    // Filter out null memories and sort by timestamp
    const validMemories = memories
      .filter((m): m is Memory => m !== null && m !== undefined)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Log warning if some memories failed to load
    const failedCount = memoryIds.length - validMemories.length;
    if (failedCount > 0) {
      console.warn(`⚠️ Failed to load ${failedCount} out of ${memoryIds.length} memories for connection ${params.connectionId}. This may be due to temporary database issues.`);
    }

    // Helper to extract file path from URL (handles both signed URLs and regular paths)
    const extractFilePath = (url: string): string | null => {
      if (!url) return null;
      
      try {
        // Check if it's already a full URL
        if (url.startsWith('http')) {
          const urlObj = new URL(url);
          
          // Extract path from signed URL format: /storage/v1/object/sign/{bucket}/{path}
          const signedMatch = urlObj.pathname.match(/\/storage\/v1\/object\/sign\/[^/]+\/(.+)/);
          if (signedMatch && signedMatch[1]) {
            return decodeURIComponent(signedMatch[1]);
          }
          
          // Extract path from public URL format: /storage/v1/object/public/{bucket}/{path}
          const publicMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
          if (publicMatch && publicMatch[1]) {
            return decodeURIComponent(publicMatch[1]);
          }
        }
        
        // If it's just a path, return it as is
        return url;
      } catch {
        return url; // Return as-is if URL parsing fails
      }
    };

    // Refresh signed URLs for all media (they expire after 1 hour)
    const memoriesWithFreshUrls = await Promise.all(
      validMemories.map(async (memory) => {
        const updatedMemory = { ...memory };
        let hasUpdates = false;

        try {
          // Refresh photo URL
          if (memory.photoUrl) {
            const path = extractFilePath(memory.photoUrl);
            if (path) {
              const { data, error } = await supabase.storage
                .from(BUCKET_NAME)
                .createSignedUrl(path, 3600);
              
              if (data?.signedUrl) {
                updatedMemory.photoUrl = data.signedUrl;
                hasUpdates = true;
              }
            }
          }

          // Refresh video URL
          if (memory.videoUrl) {
            const path = extractFilePath(memory.videoUrl);
            if (path) {
              const { data, error } = await supabase.storage
                .from(BUCKET_NAME)
                .createSignedUrl(path, 3600);
              
              if (data?.signedUrl) {
                updatedMemory.videoUrl = data.signedUrl;
                hasUpdates = true;
              }
            }
          }

          // Refresh audio URL
          if (memory.audioUrl) {
            const path = extractFilePath(memory.audioUrl);
            if (path) {
              const { data, error } = await supabase.storage
                .from(BUCKET_NAME)
                .createSignedUrl(path, 3600);
              
              if (data?.signedUrl) {
                updatedMemory.audioUrl = data.signedUrl;
                hasUpdates = true;
              }
            }
          }

          // Refresh document URL
          if (memory.documentUrl) {
            const path = extractFilePath(memory.documentUrl);
            if (path) {
              const { data, error } = await supabase.storage
                .from(BUCKET_NAME)
                .createSignedUrl(path, 3600);
              
              if (data?.signedUrl) {
                updatedMemory.documentUrl = data.signedUrl;
                hasUpdates = true;
              }
            }
          }

          // Refresh video thumbnail URL
          if (memory.videoThumbnail) {
            const path = extractFilePath(memory.videoThumbnail);
            if (path) {
              const { data, error } = await supabase.storage
                .from(BUCKET_NAME)
                .createSignedUrl(path, 3600);
              
              if (data?.signedUrl) {
                updatedMemory.videoThumbnail = data.signedUrl;
                hasUpdates = true;
              }
            }
          }

          // Update memory in database if URLs were refreshed
          if (hasUpdates) {
            updatedMemory.updatedAt = new Date().toISOString();
            await kv.set(Keys.memory(memory.id), updatedMemory);
          }
        } catch (error) {
          console.error(`Error refreshing URLs for memory ${memory.id}:`, error);
          // Return original memory if refresh fails
        }

        return updatedMemory;
      })
    );

    return {
      success: true,
      hasMemories: memoriesWithFreshUrls.length > 0,
      memories: memoriesWithFreshUrls,
    };
  } catch (error) {
    console.error('Error getting connection memories:', error);
    return {
      success: false,
      hasMemories: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Update a memory (admin action for Legacy Keepers)
 */
export async function updateMemory(params: {
  memoryId: string;
  userId: string;
  updates: Partial<Omit<Memory, 'id' | 'userId' | 'connectionId' | 'createdAt'>>;
}) {
  try {
    // Get existing memory
    const memory = await kv.get<Memory>(Keys.memory(params.memoryId));
    if (!memory) {
      throw new Error('Memory not found');
    }

    // Verify connection and user authorization
    const connection = await kv.get<Connection>(Keys.connection(memory.connectionId));
    if (!connection) {
      throw new Error('Connection not found');
    }

    // Only Legacy Keeper can edit memories
    if (connection.keeperId !== params.userId) {
      throw new Error('Only Legacy Keepers can edit memories');
    }

    // Update memory
    const updatedMemory: Memory = {
      ...memory,
      ...params.updates,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(Keys.memory(params.memoryId), updatedMemory);

    return {
      success: true,
      memory: updatedMemory,
    };
  } catch (error) {
    console.error('Error updating memory:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete a memory (admin action for Legacy Keepers)
 */
export async function deleteMemory(params: {
  memoryId: string;
  userId: string;
}) {
  try {
    // Get existing memory
    const memory = await kv.get<Memory>(Keys.memory(params.memoryId));
    if (!memory) {
      throw new Error('Memory not found');
    }

    // Verify connection and user authorization
    const connection = await kv.get<Connection>(Keys.connection(memory.connectionId));
    if (!connection) {
      throw new Error('Connection not found');
    }

    // Only Legacy Keeper can delete memories
    if (connection.keeperId !== params.userId) {
      throw new Error('Only Legacy Keepers can delete memories');
    }

    // Remove from connection's memories list
    const connectionMemories = await kv.get<string[]>(Keys.connectionMemories(memory.connectionId)) || [];
    const updatedMemories = connectionMemories.filter(id => id !== params.memoryId);
    await kv.set(Keys.connectionMemories(memory.connectionId), updatedMemories);

    // Delete memory
    await kv.del(Keys.memory(params.memoryId));

    // TODO: Delete associated files from Storage if they exist
    // This would require parsing URLs and deleting from bucket

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error deleting memory:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get a single memory by ID
 */
export async function getMemory(params: {
  memoryId: string;
  userId: string;
}) {
  try {
    const memory = await kv.get<Memory>(Keys.memory(params.memoryId));
    if (!memory) {
      throw new Error('Memory not found');
    }

    // Verify user is authorized to view this memory
    const connection = await kv.get<Connection>(Keys.connection(memory.connectionId));
    if (!connection) {
      throw new Error('Connection not found');
    }

    if (connection.keeperId !== params.userId && connection.tellerId !== params.userId) {
      throw new Error('User not authorized to view this memory');
    }

    return {
      success: true,
      memory,
    };
  } catch (error) {
    console.error('Error getting memory:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Mark messages as read by a user
 */
export async function markMessagesAsRead(params: {
  connectionId: string;
  userId: string;
  messageIds?: string[]; // If not provided, mark ALL messages in connection as read
}) {
  try {
    console.log(`📖 Marking messages as read for user ${params.userId} in connection ${params.connectionId}`);
    
    // Verify connection exists and user is authorized
    const connection = await kv.get<Connection>(Keys.connection(params.connectionId));
    if (!connection) {
      throw new Error('Connection not found');
    }

    if (connection.keeperId !== params.userId && connection.tellerId !== params.userId) {
      throw new Error('User not authorized for this connection');
    }

    // Get message IDs to mark as read
    let targetMessageIds: string[];
    if (params.messageIds && params.messageIds.length > 0) {
      targetMessageIds = params.messageIds;
    } else {
      // Mark all messages in connection as read
      targetMessageIds = await kv.get<string[]>(Keys.connectionMemories(params.connectionId)) || [];
    }

    console.log(`📖 Marking ${targetMessageIds.length} messages as read`);

    // Update each message's readBy array
    let updatedCount = 0;
    await Promise.all(
      targetMessageIds.map(async (messageId) => {
        try {
          const memory = await kv.get<Memory>(Keys.memory(messageId));
          if (!memory) {
            console.warn(`⚠️ Memory ${messageId} not found when marking as read`);
            return;
          }

          // Skip if user already marked as read
          if (memory.readBy && memory.readBy.includes(params.userId)) {
            return;
          }

          // Add user to readBy array
          const updatedMemory = {
            ...memory,
            readBy: [...(memory.readBy || []), params.userId],
            updatedAt: new Date().toISOString(),
          };

          await kv.set(Keys.memory(messageId), updatedMemory);
          updatedCount++;
        } catch (error) {
          console.error(`❌ Error marking message ${messageId} as read:`, error);
        }
      })
    );

    console.log(`✅ Marked ${updatedCount} messages as read`);

    return {
      success: true,
      updatedCount,
    };
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Refresh signed URLs for a memory's media files
 * Phase 3b: Prevents broken images after URLs expire (1 hour)
 */
export async function refreshMemoryUrls(params: {
  memoryId: string;
  userId: string;
}) {
  try {
    // Get memory
    const memory = await kv.get<Memory>(Keys.memory(params.memoryId));
    if (!memory) {
      throw new Error('Memory not found');
    }

    // Verify connection and user authorization
    const connection = await kv.get<Connection>(Keys.connection(memory.connectionId));
    if (!connection) {
      throw new Error('Connection not found');
    }

    if (connection.keeperId !== params.userId && connection.tellerId !== params.userId) {
      throw new Error('User not authorized to access this memory');
    }

    // Helper function to extract path from signed URL
    const extractPathFromUrl = (url: string): string | null => {
      try {
        // Supabase signed URL format:
        // https://{project}.supabase.co/storage/v1/object/sign/{bucket}/{path}?token=...
        const urlObj = new URL(url);
        const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/sign\/[^/]+\/(.+)/);
        if (pathMatch && pathMatch[1]) {
          return decodeURIComponent(pathMatch[1]);
        }
        return null;
      } catch {
        return null;
      }
    };

    // Helper function to generate new signed URL
    const generateNewSignedUrl = async (path: string): Promise<string | null> => {
      try {
        const { data, error } = await supabase.storage
          .from(BUCKET_NAME)
          .createSignedUrl(path, 3600); // 1 hour expiry

        if (error || !data) {
          console.error('Failed to generate signed URL:', error);
          return null;
        }

        return data.signedUrl;
      } catch (error) {
        console.error('Error generating signed URL:', error);
        return null;
      }
    };

    // Refresh URLs based on memory type
    let refreshedUrl: string | null = null;

    if (memory.type === 'photo' && memory.photoUrl) {
      const path = extractPathFromUrl(memory.photoUrl);
      if (path) {
        refreshedUrl = await generateNewSignedUrl(path);
        if (refreshedUrl) {
          memory.photoUrl = refreshedUrl;
        }
      }
    } else if (memory.type === 'video' && memory.videoUrl) {
      const path = extractPathFromUrl(memory.videoUrl);
      if (path) {
        refreshedUrl = await generateNewSignedUrl(path);
        if (refreshedUrl) {
          memory.videoUrl = refreshedUrl;
        }
      }
    } else if (memory.type === 'voice' && memory.audioUrl) {
      const path = extractPathFromUrl(memory.audioUrl);
      if (path) {
        refreshedUrl = await generateNewSignedUrl(path);
        if (refreshedUrl) {
          memory.audioUrl = refreshedUrl;
        }
      }
    } else if (memory.type === 'document' && memory.documentUrl) {
      const path = extractPathFromUrl(memory.documentUrl);
      if (path) {
        refreshedUrl = await generateNewSignedUrl(path);
        if (refreshedUrl) {
          memory.documentUrl = refreshedUrl;
        }
      }
    }

    if (!refreshedUrl) {
      throw new Error('Failed to refresh URL or no media URL found');
    }

    // Update memory in database with new URL
    memory.updatedAt = new Date().toISOString();
    await kv.set(Keys.memory(params.memoryId), memory);

    console.log(`✅ Refreshed URL for memory ${params.memoryId}`);

    return {
      success: true,
      memory,
    };
  } catch (error) {
    console.error('Error refreshing memory URLs:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get storage usage statistics for a user
 */
export async function getStorageStats(userId: string) {
  try {
    // Get all user's connections to filter their files
    const userConnectionsKey = Keys.userConnections(userId);
    const connectionIds = await kv.get<string[]>(userConnectionsKey) || [];

    let totalSize = 0;
    let photoSize = 0;
    let videoSize = 0;
    let audioSize = 0;
    let documentSize = 0;

    // Function to recursively list files in folders
    const processFolder = async (path: string = '') => {
      const { data: folderFiles, error: folderError } = await supabase.storage
        .from(BUCKET_NAME)
        .list(path, {
          limit: 10000,
          sortBy: { column: 'name', order: 'asc' }
        });

      if (folderError || !folderFiles) {
        return;
      }

      for (const file of folderFiles) {
        const fullPath = path ? `${path}/${file.name}` : file.name;
        
        // If it's a folder, recurse into it
        if (file.id === null) {
          // Check if folder belongs to user's connections
          const folderConnectionId = fullPath.split('/')[0];
          if (connectionIds.includes(folderConnectionId)) {
            await processFolder(fullPath);
          }
        } else {
          // It's a file - check if it belongs to user's connections
          const fileConnectionId = fullPath.split('/')[0];
          if (connectionIds.includes(fileConnectionId)) {
            const fileSize = file.metadata?.size || 0;
            totalSize += fileSize;

            // Categorize by file type
            const fileName = file.name.toLowerCase();
            if (fileName.match(/\.(jpg|jpeg|png|gif|webp|heic|heif)$/)) {
              photoSize += fileSize;
            } else if (fileName.match(/\.(mp4|mov|avi|mkv|webm)$/)) {
              videoSize += fileSize;
            } else if (fileName.match(/\.(mp3|wav|m4a|ogg|webm|aac)$/)) {
              audioSize += fileSize;
            } else if (fileName.match(/\.(pdf|doc|docx|txt|rtf)$/)) {
              documentSize += fileSize;
            }
          }
        }
      }
    };

    // Start processing from root
    await processFolder();

    // Convert bytes to GB
    const bytesToGB = (bytes: number) => bytes / (1024 * 1024 * 1024);

    // Storage limit: 2GB for free tier
    const storageLimit = 2; // GB

    return {
      success: true,
      totalSize: bytesToGB(totalSize),
      photoSize: bytesToGB(photoSize),
      videoSize: bytesToGB(videoSize),
      audioSize: bytesToGB(audioSize),
      documentSize: bytesToGB(documentSize),
      storageLimit,
      usagePercentage: (bytesToGB(totalSize) / storageLimit) * 100,
    };
  } catch (error) {
    console.error('Error getting storage stats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      totalSize: 0,
      photoSize: 0,
      videoSize: 0,
      audioSize: 0,
      documentSize: 0,
      storageLimit: 2,
      usagePercentage: 0,
    };
  }
}
