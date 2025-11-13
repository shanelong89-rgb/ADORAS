/**
 * AppContent Component
 * Main app logic with access to AuthContext
 */

import React, { useState, useEffect } from 'react';
import { WelcomeScreen } from './WelcomeScreen';
import { LoginScreen } from './LoginScreen';
import { SignUpInitialScreen, SignUpCredentials } from './SignUpInitialScreen';
import { UserTypeSelection } from './UserTypeSelection';
import { KeeperOnboarding } from './KeeperOnboarding';
import { TellerOnboarding } from './TellerOnboarding';
import { Dashboard } from './Dashboard';
import { useAuth } from '../utils/api/AuthContext';
import { apiClient } from '../utils/api/client';
import { uploadPhoto, uploadVideo, uploadAudio, uploadDocument } from '../utils/api/storage';
import { compressImage, validateVideo, validateAudio, formatFileSize } from '../utils/mediaOptimizer'; // Phase 3d
import { useNetworkStatus } from '../utils/networkStatus'; // Phase 3e
import { prefetchMedia, clearExpiredCache } from '../utils/mediaCache'; // Phase 3e
import { queueOperation, processQueue, setupAutoSync, getQueueStats, type QueuedOperation } from '../utils/offlineQueue'; // Phase 3e
import { autoTagPhoto } from '../utils/aiService'; // Phase 4a
import { autoTranscribeVoiceNote, getLanguageCode } from '../utils/aiService'; // Phase 4b
import { realtimeSync, type PresenceState, type MemoryUpdate } from '../utils/realtimeSync'; // Phase 5
import { initializeDailyPromptScheduler } from '../utils/dailyPromptScheduler'; // Daily prompts
import { subscribeToPushNotifications, isPushSubscribed, getNotificationPreferences } from '../utils/notificationService'; // Push notifications
import { canReceivePushNotifications, isPWAMode, getNotificationCapabilityMessage } from '../utils/pwaDetection'; // PWA detection
import { NotificationOnboardingDialog } from './NotificationOnboardingDialog'; // First-time notification prompt
import { projectId, publicAnonKey } from '../utils/supabase/info'; // Supabase credentials
import { toast } from 'sonner';
import type { UserType, UserProfile, Storyteller, LegacyKeeper, Memory, DisplayLanguage } from '../App';
import type { ConnectionWithPartner, Memory as ApiMemory } from '../utils/api/types';

export function AppContent() {
  const { signup, user, isLoading, isAuthenticated, accessToken } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<
    'welcome' | 'login' | 'signup' | 'userType' | 'keeperOnboarding' | 'tellerOnboarding' | 'dashboard'
  >('welcome');
  const [userType, setUserType] = useState<UserType>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [signupCredentials, setSignupCredentials] = useState<SignUpCredentials | null>(null);
  const [storytellers, setStorytellers] = useState<Storyteller[]>([]);
  const [activeStorytellerId, setActiveStorytellerId] = useState<string>('');
  const [memoriesByStoryteller, setMemoriesByStoryteller] = useState<Record<string, Memory[]>>({});
  const [legacyKeepers, setLegacyKeepers] = useState<LegacyKeeper[]>([]);
  const [activeLegacyKeeperId, setActiveLegacyKeeperId] = useState<string>('');
  const [memoriesByLegacyKeeper, setMemoriesByLegacyKeeper] = useState<Record<string, Memory[]>>({});
  const [partnerProfile, setPartnerProfile] = useState<UserProfile | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [displayLanguage, setDisplayLanguage] = useState<DisplayLanguage>('all');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [hasInitializedAuth, setHasInitializedAuth] = useState(false);
  
  // Phase 1d: Connection loading state
  const [isLoadingConnections, setIsLoadingConnections] = useState(false);
  const [connectionsError, setConnectionsError] = useState<string | null>(null);
  const [connections, setConnections] = useState<ConnectionWithPartner[]>([]);

  // Phase 3c: Upload progress tracking
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Phase 3e: Network status and offline support
  const networkStatus = useNetworkStatus();
  const [queuedOperationsCount, setQueuedOperationsCount] = useState<number>(0);

  // Phase 5: Real-time sync
  const [presences, setPresences] = useState<Record<string, PresenceState>>({});
  const [realtimeConnected, setRealtimeConnected] = useState<boolean>(false);

  // Notification onboarding
  const [showNotificationOnboarding, setShowNotificationOnboarding] = useState(false);
  const [hasCheckedNotificationOnboarding, setHasCheckedNotificationOnboarding] = useState(false);

  // FIX #1: Track unread counts per connection for badges
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  /**
   * Phase 3e: Setup auto-sync when coming back online
   */
  useEffect(() => {
    const handleQueuedOperation = async (operation: QueuedOperation): Promise<boolean> => {
      try {
        switch (operation.type) {
          case 'create-memory':
            const response = await apiClient.createMemory(operation.payload);
            return response.success;
          
          case 'update-memory':
            const updateResponse = await apiClient.updateMemory(
              operation.payload.memoryId,
              operation.payload.updates
            );
            return updateResponse.success;
          
          case 'delete-memory':
            const deleteResponse = await apiClient.deleteMemory(operation.payload.memoryId);
            return deleteResponse.success;
          
          case 'update-profile':
            const profileResponse = await apiClient.updateProfile(operation.payload);
            return profileResponse.success;
          
          default:
            console.warn('Unknown operation type:', operation.type);
            return false;
        }
      } catch (error) {
        console.error('Failed to execute queued operation:', error);
        return false;
      }
    };

    // Setup auto-sync
    const cleanup = setupAutoSync(handleQueuedOperation);

    // Listen for sync complete events
    const handleSyncComplete = (event: CustomEvent) => {
      const { processed, failed } = event.detail;
      if (processed > 0) {
        toast.success(`${processed} queued operation${processed > 1 ? 's' : ''} synced!`);
        // Reload data after sync
        loadConnectionsFromAPI();
      }
    };

    window.addEventListener('adoras:sync-complete', handleSyncComplete as EventListener);

    return () => {
      cleanup();
      window.removeEventListener('adoras:sync-complete', handleSyncComplete as EventListener);
    };
  }, [userType]);

  /**
   * Phase 5: Setup real-time sync for ALL connections (multi-channel support)
   */
  useEffect(() => {
    let unsubscribePresence: (() => void) | null = null;
    let unsubscribeMemoryUpdates: (() => void) | null = null;
    let isCleanedUp = false; // Track if this subscription has been cleaned up

    const setupRealtime = async () => {
      // Only connect if user is authenticated
      if (!user) {
        return;
      }

      // CRITICAL FIX: Only subscribe to ACTIVE connection (prevents badge bleeding)
      const activeConnectionId = userType === 'keeper' ? activeStorytellerId : activeLegacyKeeperId;
      
      if (!activeConnectionId) {
        console.log('ℹ️ No active connection to subscribe to');
        return;
      }

      // Subscribe ONLY to the active connection
      const allConnectionIds = [activeConnectionId];

      console.log(`🔌 Setting up realtime sync for ACTIVE connection only: ${activeConnectionId}`);

      try {
        // Subscribe to ALL connections simultaneously
        await realtimeSync.subscribeToConnections({
          connectionIds: allConnectionIds,
          userId: user.id,
          userName: user.name,
          activeConnectionId,
        });

        setRealtimeConnected(true);

        // Subscribe to presence updates (now receives connectionId)
        unsubscribePresence = realtimeSync.onPresenceChange((connectionId, presenceState) => {
          if (isCleanedUp) return; // Ignore stale callbacks
          console.log(`👥 Presence updated for ${connectionId}:`, presenceState);
          // For now, only track presence for active connection
          if (connectionId === activeConnectionId) {
            setPresences(presenceState);
          }
        });

        // Subscribe to memory updates from other clients
        unsubscribeMemoryUpdates = realtimeSync.onMemoryUpdate(async (update) => {
          try {
            if (isCleanedUp) {
              console.log(`⚠️ IGNORING stale realtime update for ${update.connectionId} (subscription cleaned up)`);
              return; // Ignore stale callbacks
            }

            // CRITICAL FIX: Get CURRENT active connection FIRST before logging
            // Don't use undefined connectionId - it was causing ReferenceError!
            const currentActiveConnectionId = userType === 'keeper' ? activeStorytellerId : activeLegacyKeeperId;
            const isActiveConnection = update.connectionId === currentActiveConnectionId;

            console.log('📡 Received memory update:', update, { 
              currentActiveConnectionId,
              updateConnectionId: update.connectionId,
              isForCurrentConnection: isActiveConnection
            });

            // Ignore updates from ourselves (current user)
            if (update.userId === user.id) {
              console.log('   ℹ️ Ignoring update from self');
              return;
            }
            
            console.log(`   🎯 Update is for ${isActiveConnection ? 'ACTIVE' : 'BACKGROUND'} connection (active: ${currentActiveConnectionId}, update: ${update.connectionId})`);

          // Handle different update types
          if (update.action === 'create' && update.memory) {
            // Convert and add new memory
            const newMemory = convertApiMemoryToUIMemory(update.memory);
            
            console.log(`   ➕ Adding new memory: ${newMemory.id} (${newMemory.type})`);
            
            // CRITICAL: Update per-connection cache FIRST (for Dashboard validation)
            if (userType === 'keeper') {
              setMemoriesByStoryteller((prev) => {
                // Prevent duplicates in per-connection cache too
                const existing = prev[update.connectionId] || [];
                if (existing.some(m => m.id === newMemory.id)) {
                  console.log(`   ⚠️ Memory ${newMemory.id} already exists in connection cache, skipping`);
                  return prev;
                }
                return {
                  ...prev,
                  [update.connectionId]: [...existing, newMemory],
                };
              });
            } else {
              setMemoriesByLegacyKeeper((prev) => {
                // Prevent duplicates in per-connection cache too
                const existing = prev[update.connectionId] || [];
                if (existing.some(m => m.id === newMemory.id)) {
                  console.log(`   ⚠️ Memory ${newMemory.id} already exists in connection cache, skipping`);
                  return prev;
                }
                return {
                  ...prev,
                  [update.connectionId]: [...existing, newMemory],
                };
              });
            }

            // THEN update global memories array if this is the ACTIVE connection
            if (isActiveConnection) {
              setMemories((prev) => {
                // Check if memory already exists (prevent duplicates)
                if (prev.some(m => m.id === newMemory.id)) {
                  console.log(`   ⚠️ Memory ${newMemory.id} already exists in global array, skipping`);
                  return prev;
                }
                return [...prev, newMemory];
              });
            } else {
              console.log(`   ℹ️ Skipping global memories update for background connection`);
            }

            // Update sidebar last message preview for this connection (real-time)
            // Only update for text/voice messages (not photos, videos, etc.)
            if (newMemory.type === 'text' || newMemory.type === 'voice') {
              console.log(`   📱 Updating sidebar last message for connection: ${update.connectionId}`);
              updateSidebarLastMessage(update.connectionId);
            }

            // Don't show toast notification here - let Dashboard handle it
            // This prevents duplicate notifications
          } else if (update.action === 'update' && update.memory) {
            // Update existing memory
            const updatedMemory = convertApiMemoryToUIMemory(update.memory);
            
            // CRITICAL: Update per-connection cache FIRST (for Dashboard validation)
            if (userType === 'keeper') {
              setMemoriesByStoryteller((prev) => ({
                ...prev,
                [update.connectionId]: (prev[update.connectionId] || []).map((m) => (m.id === update.memoryId ? updatedMemory : m)),
              }));
            } else {
              setMemoriesByLegacyKeeper((prev) => ({
                ...prev,
                [update.connectionId]: (prev[update.connectionId] || []).map((m) => (m.id === update.memoryId ? updatedMemory : m)),
              }));
            }
            
            // THEN update global memories array if this is the ACTIVE connection
            if (isActiveConnection) {
              setMemories((prev) =>
                prev.map((m) => (m.id === update.memoryId ? updatedMemory : m))
              );
            }
          } else if (update.action === 'delete') {
            console.log(`   🗑️ Deleting memory: ${update.memoryId}`);
            
            // CRITICAL: Update per-connection cache FIRST (for Dashboard validation)
            if (userType === 'keeper') {
              setMemoriesByStoryteller((prev) => ({
                ...prev,
                [update.connectionId]: (prev[update.connectionId] || []).filter((m) => m.id !== update.memoryId),
              }));
            } else {
              setMemoriesByLegacyKeeper((prev) => ({
                ...prev,
                [update.connectionId]: (prev[update.connectionId] || []).filter((m) => m.id !== update.memoryId),
              }));
            }
            
            // THEN update global memories array if this is the ACTIVE connection
            if (isActiveConnection) {
              setMemories((prev) => {
                const filtered = prev.filter((m) => m.id !== update.memoryId);
                console.log(`   ✅ Removed from global array (${prev.length} → ${filtered.length})`);
                return filtered;
              });
            } else {
              console.log(`   ℹ️ Skipping global memories update for background connection`);
            }
            
            console.log(`   ✅ Memory ${update.memoryId} deleted from all caches`);
          }
          } catch (error) {
            console.error('❌ Error processing memory update:', error);
            console.error('Update data:', update);
          }
        });

      } catch (error) {
        console.error('❌ Failed to setup real-time sync:', error);
        console.log('ℹ️ App will continue to work without real-time features');
        setRealtimeConnected(false);
        // Don't show error to user - real-time is optional
      }
    };

    setupRealtime();

    // Cleanup on unmount or connection change
    return () => {
      console.log('🧹 Cleaning up realtime sync...');
      isCleanedUp = true; // Mark as cleaned up to prevent stale callbacks
      
      if (unsubscribePresence) {
        unsubscribePresence();
      }
      if (unsubscribeMemoryUpdates) {
        unsubscribeMemoryUpdates();
      }
      realtimeSync.disconnectAll();
      setRealtimeConnected(false);
      setPresences({});
    };
    // CRITICAL: Don't include storytellers/legacyKeepers in deps!
    // They change on every message (lastMessage updates), causing constant disconnects
    // Only reconnect when user, userType, or active connection IDs change
  }, [userType, activeStorytellerId, activeLegacyKeeperId, user]);

  /**
   * Update active connection in realtime sync when switching chats
   */
  useEffect(() => {
    const activeConnectionId = userType === 'keeper' ? activeStorytellerId : activeLegacyKeeperId;
    
    if (activeConnectionId && realtimeConnected) {
      console.log(`🎯 Updating active connection in realtime: ${activeConnectionId}`);
      realtimeSync.setActiveConnection(activeConnectionId);
    }
  }, [activeStorytellerId, activeLegacyKeeperId, userType, realtimeConnected]);

  /**
   * Auto-subscribe web users and show notification dialog for PWA users
   * 
   * STRATEGY:
   * - Web users: Auto-subscribe EVERY TIME until subscribed (for existing accounts)
   * - PWA users: Show nice onboarding dialog explaining benefits (once)
   * - All users: Tracked in backend storage from account creation
   * 
   * REASONING:
   * - Web push is limited anyway (only works when browser open)
   * - PWA users get better UX with explanation
   * - Backend tracks everyone for future message delivery
   * - Existing accounts need auto-subscribe too!
   */
  useEffect(() => {
    const handleBackendFirstSubscription = async () => {
      // Only run on dashboard with connection
      if (currentScreen !== 'dashboard' || !user || !isConnected) {
        return;
      }

      // Only run once per session
      if (hasCheckedNotificationOnboarding) {
        return;
      }

      console.log('📱 Backend-first subscription: Enabling notifications on backend...', {
        userId: user.id,
      });

      try {
        // STEP 1: Enable on backend (ALWAYS succeeds, bypasses browser permission)
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-deded1eb/notifications/enable`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({
              userId: user.id,
            }),
          }
        );

        const data = await response.json();

        if (data.success) {
          console.log('✅ Backend subscription enabled:', {
            backendEnabled: data.backendEnabled,
            preferences: data.preferences,
          });
          
          // STEP 2: Auto-subscribe to browser push (ALL USERS - web and PWA)
          console.log('📱 Auto-subscribing to browser push notifications...');
          
          try {
            const pushSuccess = await subscribeToPushNotifications(user.id);
            if (pushSuccess) {
              console.log('✅ Browser push subscription created');
              
              const isStandalone = isPWAMode();
              if (!isStandalone) {
                // Only show toast for web users
                toast.success('🔔 Notifications enabled! You\'ll receive updates when your partner shares memories.');
              } else {
                console.log('🎉 PWA user fully subscribed - push notifications will work!');
              }
            } else {
              console.log('ℹ️ Browser push unavailable (blocked or unsupported)');
              console.log('   → Notifications will still be stored in backend');
              console.log('   → Enable push in device/browser settings for real-time delivery');
            }
          } catch (error) {
            console.log('ℹ️ Browser push unavailable, but backend subscription active');
            console.log('   → Notifications stored in backend ✅');
            console.log('   → In-app badges will work ✅');
            console.log('   → Enable browser/device permission for push delivery');
          }
        } else {
          console.error('❌ Backend subscription failed:', data);
        }
      } catch (error) {
        console.error('❌ Backend subscription error:', error);
      }

      setHasCheckedNotificationOnboarding(true);
    };

    handleBackendFirstSubscription();
  }, [currentScreen, user, isConnected, hasCheckedNotificationOnboarding]);

  /**
   * Update storytellers/legacyKeepers with last message when memories change
   */
  useEffect(() => {
    if (!connections || connections.length === 0) return;
    
    // Update storytellers for keepers
    if (userType === 'keeper' && storytellers.length > 0) {
      setStorytellers(prevStorytellers => 
        prevStorytellers.map(storyteller => {
          const lastMessageInfo = getLastMessageForConnection(storyteller.id);
          return {
            ...storyteller,
            lastMessage: lastMessageInfo?.message,
            lastMessageTime: lastMessageInfo?.time,
          };
        })
      );
    }
    
    // Update legacy keepers for tellers
    if (userType === 'teller' && legacyKeepers.length > 0) {
      setLegacyKeepers(prevKeepers => 
        prevKeepers.map(keeper => {
          const lastMessageInfo = getLastMessageForConnection(keeper.id);
          return {
            ...keeper,
            lastMessage: lastMessageInfo?.message,
            lastMessageTime: lastMessageInfo?.time,
          };
        })
      );
    }
  }, [memoriesByStoryteller, memoriesByLegacyKeeper, userType]);

  /**
   * FIX #2: Calculate unread counts whenever memories change
   * This fixes Badge Bug #2 - Check read status, not just timestamps
   */
  useEffect(() => {
    const calculateAllUnreadCounts = () => {
      const sourceMap = userType === 'keeper' ? memoriesByStoryteller : memoriesByLegacyKeeper;
      const newCounts: Record<string, number> = {};
      
      Object.entries(sourceMap).forEach(([connectionId, memories]) => {
        newCounts[connectionId] = memories?.filter(m => 
          !m.readBy?.includes(user?.id || '') && 
          m.sender !== (userType === 'keeper' ? 'keeper' : 'teller')
        ).length || 0;
      });
      
      setUnreadCounts(newCounts);
      console.log('📊 Unread counts updated:', newCounts);
      
      // FIX #2: Also update sidebar with new unread counts
      if (userType === 'keeper' && storytellers.length > 0) {
        setStorytellers(prev => 
          prev.map(storyteller => ({
            ...storyteller,
            unreadCount: newCounts[storyteller.id] || 0,
          }))
        );
      } else if (userType === 'teller' && legacyKeepers.length > 0) {
        setLegacyKeepers(prev =>
          prev.map(keeper => ({
            ...keeper,
            unreadCount: newCounts[keeper.id] || 0,
          }))
        );
      }
    };
    
    calculateAllUnreadCounts();
  }, [memoriesByStoryteller, memoriesByLegacyKeeper, userType, user?.id, storytellers.length, legacyKeepers.length]);

  /**
   * Phase 3e: Clear expired cache and prefetch media on mount
   */
  useEffect(() => {
    const initializeCache = async () => {
      // Clear expired cache entries
      const removed = await clearExpiredCache();
      if (removed > 0) {
        console.log(`🗑️ Cleared ${removed} expired cache entries`);
      }

      // Prefetch media for current memories when online
      if (networkStatus.isOnline && memories.length > 0) {
        const mediaUrls: string[] = [];
        
        memories.forEach((memory) => {
          if (memory.type === 'photo' && memory.photoUrl) {
            mediaUrls.push(memory.photoUrl);
          } else if (memory.type === 'video' && memory.videoUrl) {
            mediaUrls.push(memory.videoUrl);
          } else if (memory.type === 'voice' && memory.audioUrl) {
            mediaUrls.push(memory.audioUrl);
          }
        });

        // DISABLED: Aggressive prefetching caused 779% Supabase egress overage
        // Media now lazy-loads on-demand when viewed (saves ~50% bandwidth)
        // if (mediaUrls.length > 0 && !networkStatus.isSlowConnection) {
        //   console.log(`📦 Prefetching ${mediaUrls.length} media items...`);
        //   prefetchMedia(mediaUrls);
        // }
        console.log(`ℹ️ Media prefetch disabled to reduce bandwidth. ${mediaUrls.length} items will lazy-load on demand.`);
      }
    };

    if (currentScreen === 'dashboard' && memories.length > 0) {
      initializeCache();
    }
  }, [currentScreen, memories, networkStatus.isOnline]);

  /**
   * Phase 3e: Update queued operations count
   */
  useEffect(() => {
    const updateQueueCount = async () => {
      const stats = await getQueueStats();
      setQueuedOperationsCount(stats.totalCount);
    };

    updateQueueCount();
    
    // Update count every 30 seconds
    const interval = setInterval(updateQueueCount, 30000);
    
    return () => clearInterval(interval);
  }, []);

  /**
   * Phase 3e: Show network status changes to user
   */
  useEffect(() => {
    if (!networkStatus.isOnline) {
      toast.warning('You are offline. Changes will be synced when you reconnect.', {
        duration: 5000,
        icon: '📴',
      });
    }
  }, [networkStatus.isOnline]);

  /**
   * Initialize push notifications and daily prompts when user is authenticated
   * DISABLED AUTO-SUBSCRIPTION - Users must manually enable in Settings
   */
  useEffect(() => {
    const setupNotifications = async () => {
      if (!user || !userProfile || currentScreen !== 'dashboard') {
        return;
      }

      try {
        // Only initialize daily prompt scheduler - NO AUTO-SUBSCRIPTION
        // Users must manually enable push notifications in Settings to avoid iOS issues
        
        // Get notification preferences
        const prefs = await getNotificationPreferences(user.id);
        
        // Initialize daily prompt scheduler if enabled
        if (prefs?.dailyPrompts !== false) {
          initializeDailyPromptScheduler(user.id, {
            enabled: true,
            time: '09:00', // 9 AM default
            timezone: prefs?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          });
        }
      } catch (error) {
        console.error('Error setting up notifications:', error);
      }
    };

    setupNotifications();
  }, [user, userProfile, currentScreen]);

  /**
   * Phase 1d-2: Convert API memory format to UI memory format
   * Transforms timestamp string to Date object and ensures tags array exists
   */
  const convertApiMemoryToUIMemory = (apiMemory: ApiMemory): Memory => {
    return {
      ...apiMemory,
      timestamp: new Date(apiMemory.timestamp),
      tags: apiMemory.tags || [],
    };
  };

  /**
   * Phase 3b: Check if a Supabase signed URL is expired or close to expiring
   * Signed URLs expire after 1 hour (3600 seconds)
   */
  const isUrlExpiredOrExpiringSoon = (url: string | undefined, thresholdMinutes = 5): boolean => {
    if (!url) return false;
    
    try {
      // Extract token parameter from URL
      const urlObj = new URL(url);
      const token = urlObj.searchParams.get('token');
      
      if (!token) return false;
      
      // Supabase signed URL tokens contain expiration timestamp
      // Format: {timestamp}-{hash}
      const tokenParts = token.split('-');
      if (tokenParts.length < 2) return false;
      
      const expirationTimestamp = parseInt(tokenParts[0], 10);
      if (isNaN(expirationTimestamp)) return false;
      
      const now = Math.floor(Date.now() / 1000); // Current time in seconds
      const timeUntilExpiry = expirationTimestamp - now;
      const thresholdSeconds = thresholdMinutes * 60;
      
      // Return true if expired or expiring within threshold
      return timeUntilExpiry <= thresholdSeconds;
    } catch (error) {
      console.error('Error checking URL expiration:', error);
      return false;
    }
  };

  /**
   * Phase 3b: Refresh expired or expiring URLs for a memory
   */
  const refreshMemoryUrlIfNeeded = async (memory: Memory): Promise<Memory> => {
    // Check if memory has media that might need refresh
    const hasExpiredUrl = 
      (memory.type === 'photo' && isUrlExpiredOrExpiringSoon(memory.photoUrl)) ||
      (memory.type === 'video' && isUrlExpiredOrExpiringSoon(memory.videoUrl)) ||
      (memory.type === 'voice' && isUrlExpiredOrExpiringSoon(memory.audioUrl)) ||
      (memory.type === 'document' && isUrlExpiredOrExpiringSoon(memory.documentUrl));
    
    if (!hasExpiredUrl) {
      return memory; // No refresh needed
    }
    
    try {
      console.log(`🔄 Refreshing expired URL for memory ${memory.id}...`);
      
      const response = await apiClient.refreshMediaUrl(memory.id);
      
      if (response.success && response.memory) {
        console.log(`✅ URL refreshed for memory ${memory.id}`);
        return convertApiMemoryToUIMemory(response.memory);
      } else {
        console.warn(`⚠️ Failed to refresh URL for memory ${memory.id}:`, response.error);
        return memory; // Return original if refresh fails
      }
    } catch (error) {
      console.error(`❌ Error refreshing URL for memory ${memory.id}:`, error);
      return memory; // Return original on error
    }
  };

  /**
   * Phase 3b: Batch refresh expired URLs for multiple memories
   */
  const refreshExpiredMemoryUrls = async (memoriesToCheck: Memory[]): Promise<Memory[]> => {
    const refreshPromises = memoriesToCheck.map(memory => refreshMemoryUrlIfNeeded(memory));
    const refreshedMemories = await Promise.all(refreshPromises);
    return refreshedMemories;
  };

  /**
   * Phase 1d-3: Load user's connections from API
   */
  const loadConnectionsFromAPI = async () => {
    console.log('📡 Loading connections from API...');
    console.log('   Current userType:', userType);
    console.log('   Current user:', user);
    setIsLoadingConnections(true);
    setConnectionsError(null);

    try {
      const response = await apiClient.getConnections();
      
      if (response.success && response.connections) {
        console.log(`✅ Loaded ${response.connections.length} connections`);
        setConnections(response.connections);
        
        // Use the authenticated user's type if userType state isn't set yet
        const effectiveUserType = userType || user?.type;
        console.log('   Effective user type for transformation:', effectiveUserType);
        
        // Transform connections into UI format
        if (effectiveUserType === 'keeper') {
          console.log('   🔄 Transforming to storytellers...');
          await transformConnectionsToStorytellers(response.connections);
        } else if (effectiveUserType === 'teller') {
          console.log('   🔄 Transforming to legacy keepers...');
          await transformConnectionsToLegacyKeepers(response.connections);
        } else {
          console.error('❌ Invalid user type:', effectiveUserType);
        }
      } else {
        console.warn('⚠️ No connections found - showing empty state');
        setStorytellers([]);
        setLegacyKeepers([]);
        setPartnerProfile(null);
        setIsConnected(false);
      }
    } catch (error) {
      console.error('❌ Failed to load connections:', error);
      setConnectionsError('Failed to load connections. Please refresh.');
    } finally {
      setIsLoadingConnections(false);
    }
  };

  /**
   * Get last message preview for a connection
   * Memoized to prevent recreating on every render
   */
  const getLastMessageForConnection = React.useCallback((connectionId: string): { message: string; time: Date } | null => {
    const connectionMemories = memoriesByStoryteller[connectionId] || memoriesByLegacyKeeper[connectionId] || [];
    if (connectionMemories.length === 0) return null;
    
    // Filter to only text and voice messages (not photos, videos, documents, or prompts)
    const messages = connectionMemories.filter(m => 
      (m.type === 'text' || m.type === 'voice') && 
      !m.promptQuestion // Exclude prompt questions
    );
    
    if (messages.length === 0) return null;
    
    // Sort messages by timestamp to ensure we get the actual latest message
    // This is critical because messages might be added out of order via realtime updates
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
  }, [memoriesByStoryteller, memoriesByLegacyKeeper]);

  /**
   * Update sidebar lastMessage preview for a specific connection
   * Called when new messages arrive via real-time sync or periodic refresh
   * 
   * CRITICAL: This function MUST be stable (not recreate on every render)
   * Otherwise the periodic refresh interval will restart constantly
   */
  const updateSidebarLastMessage = React.useCallback((connectionId: string) => {
    // Get latest message info using current memory state
    const lastMessageInfo = getLastMessageForConnection(connectionId);
    
    if (userType === 'keeper') {
      setStorytellers(prev => 
        prev.map(storyteller => 
          storyteller.id === connectionId
            ? {
                ...storyteller,
                lastMessage: lastMessageInfo?.message,
                lastMessageTime: lastMessageInfo?.time,
              }
            : storyteller
        )
      );
    } else if (userType === 'teller') {
      setLegacyKeepers(prev =>
        prev.map(keeper =>
          keeper.id === connectionId
            ? {
                ...keeper,
                lastMessage: lastMessageInfo?.message,
                lastMessageTime: lastMessageInfo?.time,
              }
            : keeper
        )
      );
    }
  }, [userType, getLastMessageForConnection]);

  /**
   * Phase 1d-4: Transform API connections to Storyteller format (for Keepers)
   */
  const transformConnectionsToStorytellers = async (apiConnections: ConnectionWithPartner[]) => {
    console.log('🔄 Transforming connections to storytellers...', apiConnections);
    const storytellerList: Storyteller[] = apiConnections.map((conn) => {
      console.log(`   - Connection ${conn.connection.id}: status='${conn.connection.status}', partner='${conn.partner?.name}'`);
      const lastMessageInfo = getLastMessageForConnection(conn.connection.id);
      const unreadCount = unreadCounts[conn.connection.id] || 0; // FIX #3: Use unread counts
      return {
        id: conn.connection.id,
        name: conn.partner?.name || 'Unknown',
        relationship: conn.partner?.relationship || 'Family',
        bio: conn.partner?.bio || '',
        photo: conn.partner?.photo,
        isConnected: conn.connection.status === 'active',
        lastMessage: lastMessageInfo?.message,
        lastMessageTime: lastMessageInfo?.time,
        unreadCount, // FIX #3: Add unread count for badge
      };
    });

    setStorytellers(storytellerList);
    
    // Try to restore the last active connection from localStorage
    let targetConnection: Storyteller | undefined;
    if (user?.id) {
      const lastActiveId = localStorage.getItem(`adoras_last_active_connection_${user.id}`);
      if (lastActiveId) {
        targetConnection = storytellerList.find((s) => s.id === lastActiveId && s.isConnected);
        if (targetConnection) {
          console.log(`   ♻️ Restoring last active connection: ${targetConnection.name} (${lastActiveId})`);
        } else {
          console.log(`   ⚠️ Last active connection ${lastActiveId} not found or not active, falling back to first`);
        }
      }
    }
    
    // If no restored connection, use first active connection as default
    if (!targetConnection) {
      targetConnection = storytellerList.find((s) => s.isConnected);
      console.log(`   First active storyteller:`, targetConnection);
    }
    
    if (targetConnection) {
      console.log(`   🎯 Setting activeStorytellerId to: ${targetConnection.id}`);
      setActiveStorytellerId(targetConnection.id);
      setPartnerProfile({
        id: targetConnection.id,
        name: targetConnection.name,
        relationship: targetConnection.relationship,
        bio: targetConnection.bio,
        photo: targetConnection.photo,
      });
      setIsConnected(true);
      console.log(`   ✅ Connected to storyteller: ${targetConnection.name} (ID: ${targetConnection.id})`);
      
      // Load memories for the active connection FIRST (priority)
      // Pass true to explicitly mark this as the active connection
      console.log(`   📦 Loading memories for active connection: ${targetConnection.id}...`);
      await loadMemoriesForConnection(targetConnection.id, true);
      
      // Then load memories for all other connections in background (for notification badges)
      const otherConnections = storytellerList.filter(s => s.id !== targetConnection!.id);
      if (otherConnections.length > 0) {
        console.log(`   📦 Loading memories for ${otherConnections.length} other connections in background...`);
        Promise.all(otherConnections.map(s => loadMemoriesForConnection(s.id, false))).catch(err => {
          console.warn('⚠️ Some background memory loads failed:', err);
        });
      }
    } else if (storytellerList.length > 0) {
      const firstPending = storytellerList[0];
      console.log(`   🎯 Setting activeStorytellerId to pending: ${firstPending.id}`);
      setActiveStorytellerId(firstPending.id);
      setPartnerProfile({
        id: firstPending.id,
        name: firstPending.name,
        relationship: firstPending.relationship,
        bio: firstPending.bio,
        photo: firstPending.photo,
      });
      setIsConnected(false);
      console.log(`   ⏳ Pending connection to: ${firstPending.name} (ID: ${firstPending.id})`);
      setMemories([]);
    } else {
      console.log(`   ❌ No storytellers found - clearing active connection`);
      setActiveStorytellerId('');
      setPartnerProfile(null);
      setIsConnected(false);
      setMemories([]);
    }
  };

  /**
   * Phase 1d-4: Transform API connections to Legacy Keeper format (for Tellers)
   */
  const transformConnectionsToLegacyKeepers = async (apiConnections: ConnectionWithPartner[]) => {
    console.log('🔄 Transforming connections to legacy keepers...', apiConnections);
    const keeperList: LegacyKeeper[] = apiConnections.map((conn) => {
      console.log(`   - Connection ${conn.connection.id}: status='${conn.connection.status}', partner='${conn.partner?.name}'`);
      const lastMessageInfo = getLastMessageForConnection(conn.connection.id);
      const unreadCount = unreadCounts[conn.connection.id] || 0; // FIX #3: Use unread counts
      return {
        id: conn.connection.id,
        name: conn.partner?.name || 'Unknown',
        relationship: conn.partner?.relationship || 'Family',
        bio: conn.partner?.bio || '',
        photo: conn.partner?.photo,
        isConnected: conn.connection.status === 'active',
        lastMessage: lastMessageInfo?.message,
        lastMessageTime: lastMessageInfo?.time,
        unreadCount, // FIX #3: Add unread count for badge
      };
    });

    setLegacyKeepers(keeperList);
    
    // Try to restore the last active connection from localStorage
    let targetConnection: LegacyKeeper | undefined;
    if (user?.id) {
      const lastActiveId = localStorage.getItem(`adoras_last_active_connection_${user.id}`);
      if (lastActiveId) {
        targetConnection = keeperList.find((k) => k.id === lastActiveId && k.isConnected);
        if (targetConnection) {
          console.log(`   ♻️ Restoring last active connection: ${targetConnection.name} (${lastActiveId})`);
        } else {
          console.log(`   ⚠️ Last active connection ${lastActiveId} not found or not active, falling back to first`);
        }
      }
    }
    
    // If no restored connection, use first active connection as default
    if (!targetConnection) {
      targetConnection = keeperList.find((k) => k.isConnected);
    }
    
    if (targetConnection) {
      console.log(`   🎯 Setting activeLegacyKeeperId to: ${targetConnection.id}`);
      setActiveLegacyKeeperId(targetConnection.id);
      setPartnerProfile({
        id: targetConnection.id,
        name: targetConnection.name,
        relationship: targetConnection.relationship,
        bio: targetConnection.bio,
        photo: targetConnection.photo,
      });
      setIsConnected(true);
      console.log(`   ✅ Connected to legacy keeper: ${targetConnection.name} (ID: ${targetConnection.id})`);
      
      // Load memories for the active connection FIRST (priority)
      // Pass true to explicitly mark this as the active connection
      console.log(`   📦 Loading memories for active connection: ${targetConnection.id}...`);
      await loadMemoriesForConnection(targetConnection.id, true);
      
      // Then load memories for all other connections in background (for notification badges)
      const otherConnections = keeperList.filter(k => k.id !== targetConnection!.id);
      if (otherConnections.length > 0) {
        console.log(`   📦 Loading memories for ${otherConnections.length} other connections in background...`);
        Promise.all(otherConnections.map(k => loadMemoriesForConnection(k.id, false))).catch(err => {
          console.warn('⚠️ Some background memory loads failed:', err);
        });
      }
    } else if (keeperList.length > 0) {
      const firstPending = keeperList[0];
      console.log(`   🎯 Setting activeLegacyKeeperId to pending: ${firstPending.id}`);
      setActiveLegacyKeeperId(firstPending.id);
      setPartnerProfile({
        id: firstPending.id,
        name: firstPending.name,
        relationship: firstPending.relationship,
        bio: firstPending.bio,
        photo: firstPending.photo,
      });
      setIsConnected(false);
      console.log(`   ⏳ Pending connection to: ${firstPending.name} (ID: ${firstPending.id})`);
      setMemories([]);
    } else {
      console.log(`   ❌ No legacy keepers found - clearing active connection`);
      setActiveLegacyKeeperId('');
      setPartnerProfile(null);
      setIsConnected(false);
      setMemories([]);
    }
  };

  /**
   * Phase 1d-5: Load memories for a specific connection
   * @param connectionId - The connection to load memories for
   * @param isActiveConnection - Optional flag to explicitly mark if this is the active connection.
   *                            If true, always updates global memories array regardless of state.
   */
  const loadMemoriesForConnection = async (connectionId: string, isActiveConnection?: boolean) => {
    console.log(`📡 Loading memories for connection: ${connectionId}`, { isActiveConnection });
    console.log(`   Current userType: ${userType}`);
    console.log(`   Current activeStorytellerId: ${activeStorytellerId}`);
    console.log(`   Current activeLegacyKeeperId: ${activeLegacyKeeperId}`);
    
    try {
      console.log(`   🌐 Calling apiClient.getMemories(${connectionId})...`);
      const response = await apiClient.getMemories(connectionId);
      console.log(`   📦 API Response:`, {
        success: response.success,
        memoriesCount: response.memories?.length ?? 0,
        error: response.error,
        hasMemories: !!response.memories
      });
      
      if (response.success && response.memories) {
        console.log(`✅ Loaded ${response.memories.length} memories`);
        
        // Convert API memories to UI format
        let uiMemories = response.memories.map(convertApiMemoryToUIMemory);
        
        // Phase 3b: Auto-refresh expired URLs
        console.log('🔄 Checking for expired URLs...');
        uiMemories = await refreshExpiredMemoryUrls(uiMemories);
        
        // Determine if we should update global memories
        let shouldUpdateGlobal = false;
        
        if (isActiveConnection !== undefined) {
          // If explicitly specified, use that
          shouldUpdateGlobal = isActiveConnection;
          console.log(`   📌 Using explicit isActiveConnection=${isActiveConnection}`);
        } else {
          // Otherwise, check current state
          const activeConnectionId = userType === 'keeper' ? activeStorytellerId : activeLegacyKeeperId;
          shouldUpdateGlobal = (connectionId === activeConnectionId);
          console.log(`   📌 Comparing with state: ${connectionId} === ${activeConnectionId} = ${shouldUpdateGlobal}`);
        }
        
        // CRITICAL: Update per-connection cache FIRST before global memories
        // This ensures Dashboard's validation logic always has the correct expected data
        // Use MERGE strategy to preserve newer memories not yet in API response
        const mergeMemories = (existing: Memory[], incoming: Memory[]): Memory[] => {
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
        };
        
        if (userType === 'keeper') {
          setMemoriesByStoryteller((prev) => {
            // Mark state change timestamp for validation
            (window as any)._lastMemoryStateChange = Date.now();
            return {
              ...prev,
              [connectionId]: mergeMemories(prev[connectionId] || [], uiMemories),
            };
          });
        } else {
          setMemoriesByLegacyKeeper((prev) => {
            // Mark state change timestamp for validation
            (window as any)._lastMemoryStateChange = Date.now();
            return {
              ...prev,
              [connectionId]: mergeMemories(prev[connectionId] || [], uiMemories),
            };
          });
        }
        
        // THEN update the global memories array if this is the ACTIVE connection
        // This prevents background refreshes from mixing chats
        if (shouldUpdateGlobal) {
          console.log(`✅ Updating global memories for ACTIVE connection: ${connectionId}`);
          
          // MERGE strategy: Preserve newer memories that might not be in the API response yet
          setMemories((prevMemories) => {
            // Create a map of existing memories by ID for fast lookup
            const existingById = new Map(prevMemories.map(m => [m.id, m]));
            
            // Create a map of new memories by ID
            const newById = new Map(uiMemories.map(m => [m.id, m]));
            
            // Merge: Keep all existing memories, update with new data if available
            const merged = prevMemories.map(existing => 
              newById.get(existing.id) || existing
            );
            
            // Add any new memories that weren't in the existing array
            uiMemories.forEach(newMem => {
              if (!existingById.has(newMem.id)) {
                merged.push(newMem);
              }
            });
            
            // Sort by timestamp to maintain chronological order
            merged.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
            
            console.log(`📊 Merged memories: ${prevMemories.length} existing + ${uiMemories.length} from API = ${merged.length} total`);
            
            return merged;
          });
        } else {
          console.log(`ℹ️ Skipping global memories update for background connection: ${connectionId}`);
        }
      } else {
        console.warn(`⚠️ API call succeeded but no memories found for connection: ${connectionId}`);
        console.warn(`   Response details:`, { 
          success: response.success, 
          hasMemories: !!response.memories,
          error: response.error 
        });
        // Don't clear memories if it's just a loading error - keep existing data
        if (userType === 'keeper' && !memoriesByStoryteller[connectionId]) {
          setMemoriesByStoryteller((prev) => ({ ...prev, [connectionId]: [] }));
        } else if (userType === 'teller' && !memoriesByLegacyKeeper[connectionId]) {
          setMemoriesByLegacyKeeper((prev) => ({ ...prev, [connectionId]: [] }));
        }
      }
    } catch (error) {
      // Check if it's an auth error
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to load memories for connection ${connectionId}:`, error);
      console.error(`   Error type: ${typeof error}`);
      console.error(`   Error message: ${errorMessage}`);
      console.error(`   Full error object:`, error);
      
      if (errorMessage.includes('401') || errorMessage.includes('Invalid JWT') || errorMessage.includes('Unauthorized')) {
        console.warn('⚠️ Authentication error detected - user may need to sign in again');
        toast.error('Authentication error. Please sign in again.');
        // Don't clear existing memories - just skip this refresh
        return;
      }
      
      toast.error(`Failed to load memories: ${errorMessage}`);
      // Don't clear existing memories on error - keep what we have
    }
  };

  /**
   * Handle authentication state changes
   * - Redirect to dashboard if user logs in
   * - Redirect to welcome if user logs out
   */
  useEffect(() => {
    // User logged in - redirect to dashboard
    if (!isLoading && isAuthenticated && user && !hasInitializedAuth) {
      console.log('✅ User is authenticated, initializing dashboard');
      console.log('   User details:', {
        id: user.id,
        name: user.name,
        email: user.email,
        type: user.type
      });
      console.log('   Access token exists:', !!accessToken);
      
      // Set user type from authenticated user
      setUserType(user.type as UserType);
      
      // Set user profile from authenticated user
      const profile: UserProfile = {
        id: user.id,
        name: user.name,
        relationship: user.relationship || '',
        bio: user.bio || '',
        email: user.email,
        phoneNumber: user.phoneNumber,
        appLanguage: user.appLanguage,
        birthday: user.birthday ? new Date(user.birthday) : undefined,
        photo: user.photo,
      };
      
      setUserProfile(profile);
      
      // Load real connections from API (Phase 1d)
      // TESTING: Auto-ensure Shane and Allison are connected
      const initializeConnections = async () => {
        if (user.email === 'shanelong@gmail.com' || user.email === 'allison.tam@hotmail.com') {
          console.log('🧪 TEST USER: Ensuring Shane and Allison are connected...');
          toast.loading('Setting up test connection...', { id: 'test-setup' });
          try {
            const response = await apiClient.ensureTestUsersConnected();
            if (response.success) {
              console.log('✅ Test users connected successfully');
              toast.success('Test users connected!', { id: 'test-setup', duration: 2000 });
            } else {
              console.warn('⚠️ Failed to ensure test users connected:', response.error);
              toast.error(`Connection setup failed: ${response.error}`, { id: 'test-setup' });
            }
          } catch (error) {
            console.error('❌ Error ensuring test users connected:', error);
            toast.error('Failed to setup test connection', { id: 'test-setup' });
          }
        }
        
        // Load connections after ensuring test users are set up
        console.log('📡 Loading connections from API...');
        console.log('   Current accessToken:', accessToken ? `${accessToken.substring(0, 20)}...` : 'NONE');
        await loadConnectionsFromAPI();
        console.log('✅ Connections loading completed');
      };
      
      // Wait for connections to load before navigating to dashboard
      initializeConnections().then(async () => {
        // Mark as initialized to prevent re-running
        setHasInitializedAuth(true);
        
        // Navigate to dashboard AFTER data is set
        setCurrentScreen('dashboard');
        
        // Notification subscription handled by separate useEffect (backend-first strategy)
      });
    }
    
    // User logged out - redirect to welcome
    if (!isLoading && !isAuthenticated && hasInitializedAuth) {
      console.log('🚪 User logged out, redirecting to welcome');
      
      // Disconnect from realtime
      realtimeSync.disconnect();
      
      // Reset all state
      setUserType(null);
      setUserProfile(null);
      setPartnerProfile(null);
      setMemories([]);
      setStorytellers([]);
      setLegacyKeepers([]);
      setActiveStorytellerId('');
      setActiveLegacyKeeperId('');
      setMemoriesByStoryteller({});
      setMemoriesByLegacyKeeper({});
      setIsConnected(false);
      setHasInitializedAuth(false);
      setRealtimeConnected(false);
      setPresences({});
      
      // Navigate to welcome screen
      setCurrentScreen('welcome');
    }
  }, [isLoading, isAuthenticated, user, hasInitializedAuth]);

  /**
   * Periodic refresh: Reload memories for all connections every 2 minutes
   * This ensures notification badges stay updated even if realtime sync misses updates
   */
  useEffect(() => {
    if (currentScreen !== 'dashboard' || !user || !isAuthenticated) {
      return;
    }

    const refreshAllConnections = async () => {
      try {
        console.log('🔄 Periodic refresh: Reloading all connections...');
        
        // Get current active connection BEFORE starting refresh
        const currentActiveId = userType === 'keeper' ? activeStorytellerId : activeLegacyKeeperId;
        console.log(`   📍 Current active connection at refresh start: ${currentActiveId}`);
        
        const allConnectionIds = userType === 'keeper' 
          ? storytellers.map(s => s.id)
          : legacyKeepers.map(k => k.id);
        
        // Skip active connection - Realtime keeps it updated
        // Only refresh background connections to reduce API calls
        const backgroundConnections = allConnectionIds.filter(id => id !== currentActiveId);
        
        if (backgroundConnections.length > 0) {
          console.log(`   📦 Refreshing ${backgroundConnections.length} BACKGROUND connections (skipping active: ${currentActiveId})`);
          
          for (const id of backgroundConnections) {
            await loadMemoriesForConnection(id);
            
            // 🔥 CRITICAL FIX: Update sidebar last message after loading background connections
            // Inline logic to avoid stale closure issues
            const connectionMemories = (userType === 'keeper' ? memoriesByStoryteller[id] : memoriesByLegacyKeeper[id]) || [];
            const messages = connectionMemories.filter(m => 
              (m.type === 'text' || m.type === 'voice') && !m.promptQuestion
            );
            
            if (messages.length > 0) {
              const sortedMessages = [...messages].sort((a, b) => 
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
              );
              const lastMsg = sortedMessages[sortedMessages.length - 1];
              let preview = lastMsg.type === 'voice' 
                ? (lastMsg.transcript || '🎤 Voice message')
                : lastMsg.content;
              if (preview.length > 50) preview = preview.substring(0, 50) + '...';
              
              // Update sidebar
              if (userType === 'keeper') {
                setStorytellers(prev => prev.map(s => 
                  s.id === id ? { ...s, lastMessage: preview, lastMessageTime: lastMsg.timestamp } : s
                ));
              } else {
                setLegacyKeepers(prev => prev.map(k => 
                  k.id === id ? { ...k, lastMessage: preview, lastMessageTime: lastMsg.timestamp } : k
                ));
              }
            }
          }
          
          console.log('✅ Periodic refresh complete - sidebar updated for all background connections');
        } else {
          console.log('ℹ️ Only active connection - skipping periodic refresh (Realtime keeps it updated)');
        }
      } catch (error) {
        // If auth fails, log it but don't crash
        console.log('ℹ️ Periodic refresh skipped (authentication may have expired)');
        // The user will need to sign in again to restore functionality
      }
    };

    // Refresh every 2 minutes (increased from 60s to reduce server load and race conditions)
    const interval = setInterval(refreshAllConnections, 120000);
    
    return () => clearInterval(interval);
    // CRITICAL: Don't include storytellers/legacyKeepers/memoriesBy* in deps!
    // They change on EVERY message (lastMessage updates), which would restart the interval
    // Only restart periodic refresh when switching users/connections, NOT on every message
    // We inline the sidebar update logic to avoid stale closure issues
  }, [currentScreen, user, isAuthenticated, userType, activeStorytellerId, activeLegacyKeeperId, loadMemoriesForConnection]);

  const handleWelcomeNext = () => {
    setCurrentScreen('userType');
  };

  const handleWelcomeLogin = () => {
    setCurrentScreen('login');
  };

  const handleLoginSuccess = () => {
    // Don't navigate to dashboard here - let the useEffect handle it
    // after connections are loaded. Just ensure we're in a loading state.
    console.log('🔐 Login successful, waiting for connections to load...');
  };

  const handleUserTypeSelect = (type: UserType) => {
    setUserType(type);
    setCurrentScreen('signup');
  };

  const handleSignUpComplete = (credentials: SignUpCredentials) => {
    setSignupCredentials(credentials);
    if (userType === 'keeper') {
      setCurrentScreen('keeperOnboarding');
    } else {
      setCurrentScreen('tellerOnboarding');
    }
  };

  const handleOnboardingComplete = async (profile: UserProfile, invitationCode?: string) => {
    if (!signupCredentials) {
      console.error('No signup credentials found');
      alert('Error: Missing signup credentials. Please try again.');
      setCurrentScreen('signup');
      return;
    }

    setIsSigningUp(true);
    setSignupError(null);

    try {
      console.log('🔐 Creating account...');
      
      // Call signup API with credentials + profile data
      const result = await signup({
        email: signupCredentials.email,
        password: signupCredentials.password,
        type: userType!,
        name: profile.name,
        relationship: profile.relationship,
        bio: profile.bio,
        phoneNumber: profile.phoneNumber,
        appLanguage: profile.appLanguage as 'english' | 'spanish' | 'french' | 'chinese' | 'korean' | 'japanese' | undefined,
        birthday: profile.birthday?.toISOString(),
        photo: profile.photo,
      });

      if (result.success) {
        console.log('✅ Account created successfully!');
        // Merge profile with email from signup credentials
        const completeProfile = {
          ...profile,
          email: signupCredentials.email,
        };
        setUserProfile(completeProfile);

        // Extract code and storyteller info
        const codeToUse = invitationCode || ('invitationCode' in profile ? (profile as any).invitationCode : undefined);
        const storytellerInfo = (profile as any).storytellerInfo;
        
        // If keeper with invitation code, create the invitation in backend
        if (userType === 'keeper' && codeToUse && storytellerInfo) {
          console.log('📤 Creating invitation in backend with code:', codeToUse);
          
          try {
            const createResult = await apiClient.createInvitation({
              tellerPhoneNumber: profile.phoneNumber || '+1234567890', // Use a placeholder if no phone
              tellerName: storytellerInfo.name,
              tellerBirthday: storytellerInfo.birthday?.toISOString(),
              tellerRelationship: storytellerInfo.relationship,
              tellerBio: storytellerInfo.bio,
              tellerPhoto: storytellerInfo.photo,
              code: codeToUse, // Pass the generated code
            });

            if (createResult.success) {
              console.log('✅ Invitation created in backend!');
              
              // Show appropriate success message based on SMS status
              if (createResult.smsSent) {
                toast.success('Invitation sent via SMS!');
              } else {
                // SMS failed or wasn't configured - that's OK!
                console.log('ℹ️ SMS not sent:', createResult.smsError);
                toast.success(`Invitation code created: ${codeToUse}`, {
                  description: 'Share this code with your storyteller to connect',
                  duration: 5000,
                });
              }
            } else {
              console.error('❌ Failed to create invitation:', createResult.error);
              toast.warning('Account created but invitation setup incomplete.');
            }
          } catch (inviteError) {
            console.error('❌ Error creating invitation:', inviteError);
            toast.warning('Account created but invitation setup incomplete.');
          }
        }

        // If teller with invitation code, accept the invitation
        if (userType === 'teller' && codeToUse) {
          console.log('🔗 Accepting invitation with code:', codeToUse);
          
          try {
            const acceptResult = await apiClient.acceptInvitation({
              code: codeToUse,
            });

            if (acceptResult.success) {
              console.log('✅ Invitation accepted, connection created!');
              toast.success('Connected to your keeper successfully!');
            } else {
              console.error('❌ Failed to accept invitation:', acceptResult.error);
              // Don't block the flow, but show a warning
              toast.error('Account created but connection failed. Please contact your keeper.');
            }
          } catch (inviteError) {
            console.error('❌ Error accepting invitation:', inviteError);
            toast.error('Account created but connection failed. Please contact your keeper.');
          }
        }

        // Load real connections from API FIRST (Phase 1d)
        console.log('📡 Loading connections...');
        await loadConnectionsFromAPI();
        
        // Then navigate to dashboard
        // Dashboard will show the data if connections loaded, or "not connected" state
        console.log('🎯 Navigating to dashboard...');
        setCurrentScreen('dashboard');
      } else {
        console.error('❌ Signup failed:', result.error);
        
        // Check if user already exists
        if (result.error && (result.error.includes('already been registered') || result.error.includes('already registered'))) {
          console.log('ℹ️ User already exists, redirecting to login');
          setSignupError('This email is already registered. Redirecting to login...');
          toast.info('Account already exists! Please log in.', { duration: 3000 });
          
          // Redirect to login after a short delay
          setTimeout(() => {
            setCurrentScreen('login');
            setSignupError(null);
          }, 1500);
        } else {
          setSignupError(result.error || 'Failed to create account. Please try again.');
        }
        // Stay on onboarding screen to show error
      }
    } catch (error) {
      console.error('❌ Signup error:', error);
      setSignupError(error instanceof Error ? error.message : 'Network error. Please check your connection.');
    } finally {
      setIsSigningUp(false);
    }
  };

  const setupMockData = (profile: UserProfile) => {
    if (userType === 'keeper') {
      const storytellerFromOnboarding = (profile as any).storytellerInfo;
      
      const mockStorytellers: Storyteller[] = [
        storytellerFromOnboarding && storytellerFromOnboarding.name
          ? {
              id: 'primary',
              name: storytellerFromOnboarding.name,
              relationship: storytellerFromOnboarding.relationship || 'Family',
              bio: storytellerFromOnboarding.bio || '',
              photo: storytellerFromOnboarding.photo,
              isConnected: false,
            }
          : {
              id: 'dad',
              name: 'Dad',
              relationship: 'Father',
              bio: 'Your father who loves telling stories about his childhood',
              isConnected: true,
            },
        {
          id: 'grandma',
          name: 'Grandma',
          relationship: 'Grandmother',
          bio: 'Your grandmother with endless wisdom and family stories',
          isConnected: true,
        },
      ];
      
      setStorytellers(mockStorytellers);
      setActiveStorytellerId(storytellerFromOnboarding && storytellerFromOnboarding.name ? 'primary' : 'dad');
      
      const sampleVoiceMessage: Memory = {
        id: 'sample-voice-1',
        type: 'voice',
        content: '9"',
        sender: 'teller',
        timestamp: new Date(Date.now() - 3600000),
        category: 'Voice',
        tags: ['voice', 'translation'],
        originalText: '行，搞了你们搞个 high manager，有没有回复你呀？',
        transcript: "Alright, let's get a high-ranking manager involved. Has anyone responded to you yet?",
      };
      
      const dadMemory: Memory = {
        id: 'dad-message-1',
        type: 'text',
        content: 'Hey kiddo! Remember that time we went fishing?',
        sender: 'teller',
        timestamp: new Date(Date.now() - 7200000),
        category: 'Chat',
        tags: ['chat', 'memory'],
      };
      
      const primaryId = storytellerFromOnboarding && storytellerFromOnboarding.name ? 'primary' : 'dad';
      
      setMemoriesByStoryteller({
        primary: storytellerFromOnboarding && storytellerFromOnboarding.name ? [] : [sampleVoiceMessage],
        dad: [dadMemory],
        grandma: [],
      });
      
      setMemories(primaryId === 'primary' ? [] : [sampleVoiceMessage]);
      setPartnerProfile({
        name: storytellerFromOnboarding && storytellerFromOnboarding.name ? storytellerFromOnboarding.name : 'Dad',
        relationship: storytellerFromOnboarding && storytellerFromOnboarding.relationship ? storytellerFromOnboarding.relationship : 'Father',
        bio: storytellerFromOnboarding && storytellerFromOnboarding.bio ? storytellerFromOnboarding.bio : 'Your father who loves telling stories about his childhood',
        photo: storytellerFromOnboarding && storytellerFromOnboarding.photo ? storytellerFromOnboarding.photo : '/api/placeholder/100/100',
        birthday: storytellerFromOnboarding && storytellerFromOnboarding.birthday ? storytellerFromOnboarding.birthday : new Date(1962, 0, 1),
      });
    } else {
      const mockLegacyKeepers: LegacyKeeper[] = [
        {
          id: 'alex',
          name: 'Alex',
          relationship: 'Son',
          bio: 'College student studying computer science',
          photo: '/api/placeholder/100/100',
          isConnected: true,
        },
        {
          id: 'sarah',
          name: 'Sarah',
          relationship: 'Daughter',
          bio: 'High school senior, loves photography',
          photo: '/api/placeholder/100/100',
          isConnected: true,
        },
        {
          id: 'michael',
          name: 'Michael',
          relationship: 'Son',
          bio: 'Working as a software engineer in Seattle',
          photo: '/api/placeholder/100/100',
          isConnected: false,
        },
      ];
      
      setLegacyKeepers(mockLegacyKeepers);
      setActiveLegacyKeeperId('alex');
      
      setPartnerProfile({
        name: 'Alex',
        age: 23,
        relationship: 'Son',
        bio: 'College student studying computer science',
        photo: '/api/placeholder/100/100',
      });
      
      const alexVoiceMessage: Memory = {
        id: 'sample-voice-1',
        type: 'voice',
        content: '9"',
        sender: 'keeper',
        timestamp: new Date(Date.now() - 3600000),
        category: 'Voice',
        tags: ['voice', 'translation'],
        originalText: '行，搞了你们搞个 high manager，有没有回复你呀？',
        transcript: "Alright, let's get a high-ranking manager involved. Has anyone responded to you yet?",
      };
      
      const sarahTextMessage: Memory = {
        id: 'sarah-message-1',
        type: 'text',
        content: 'Mom! I just got accepted to NYU!',
        sender: 'keeper',
        timestamp: new Date(Date.now() - 7200000),
        category: 'Chat',
        tags: ['chat', 'milestone'],
      };
      
      setMemoriesByLegacyKeeper({
        alex: [alexVoiceMessage],
        sarah: [sarahTextMessage],
        michael: [],
      });
      
      setMemories([alexVoiceMessage]);
    }
    setIsConnected(true);
  };

  const handleAddMemory = async (memory: Omit<Memory, 'id' | 'timestamp'>) => {
    // Unique toast ID for this upload
    const toastId = `upload-${Date.now()}`;
    
    try {
      const connectionId = userType === 'keeper' 
        ? activeStorytellerId 
        : activeLegacyKeeperId;
      
      console.log('🎯 handleAddMemory called:', {
        memoryType: memory.type,
        connectionId,
        userType,
        activeStorytellerId,
        activeLegacyKeeperId,
        hasPartner: !!partnerProfile,
        isConnected,
        isLoadingConnections,
        storytellers: storytellers.map(s => ({ id: s.id, name: s.name, isConnected: s.isConnected })),
        legacyKeepers: legacyKeepers.map(k => ({ id: k.id, name: k.name, isConnected: k.isConnected }))
      });
      
      // Check if connections are still loading
      if (isLoadingConnections) {
        console.warn('⏳ Connections are still loading - please wait');
        toast.warning('Please wait while connections load...');
        return;
      }
      
      if (!connectionId) {
        console.error('❌ No active connection - cannot create memory');
        console.error('   - User type:', userType);
        console.error('   - Active storyteller ID:', activeStorytellerId);
        console.error('   - Active legacy keeper ID:', activeLegacyKeeperId);
        console.error('   - Storytellers:', storytellers);
        console.error('   - Legacy keepers:', legacyKeepers);
        toast.error('No active connection. Please ensure you have a connected partner first.');
        return;
      }
      
      console.log('📡 Creating memory via API...');
      
      // Show initial loading toast based on media type
      const mediaTypeLabel = memory.type === 'photo' ? 'photo' : 
                            memory.type === 'video' ? 'video' : 
                            memory.type === 'voice' ? 'voice note' : 
                            memory.type === 'document' ? 'document' : 'message';
      toast.loading(`Uploading ${mediaTypeLabel}...`, { id: toastId });
      
      // Phase 2d: Upload media files to Supabase Storage before creating memory
      let uploadedMediaUrl: string | undefined = memory.mediaUrl;
      
      // Helper function to convert data URL to Blob
      const dataURLtoBlob = (dataUrl: string): Blob => {
        const arr = dataUrl.split(',');
        const mime = arr[0].match(/:(.*?);/)![1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
      };
      
      // Upload photo if present
      if (memory.type === 'photo' && memory.photoUrl) {
        console.log('📤 Uploading photo to Supabase Storage...', {
          photoUrlType: memory.photoUrl.startsWith('data:') ? 'data URL' : 
                        memory.photoUrl.startsWith('blob:') ? 'blob URL' : 'unknown',
          photoUrlLength: memory.photoUrl.length
        });
        try {
          let photoFile: File | Blob;
          
          // Check if it's a data URL (from FileReader)
          if (memory.photoUrl.startsWith('data:')) {
            photoFile = dataURLtoBlob(memory.photoUrl);
          } 
          // Check if it's a blob URL (from URL.createObjectURL)
          else if (memory.photoUrl.startsWith('blob:')) {
            const response = await fetch(memory.photoUrl);
            photoFile = await response.blob();
          } else {
            console.warn('���️ Unknown photo URL format, skipping upload');
            photoFile = new Blob();
          }
          
          // Phase 3d: Compress image before upload
          console.log(`📦 Compressing photo (${formatFileSize(photoFile.size)})...`);
          const compressionResult = await compressImage(photoFile as File);
          
          if (!compressionResult.success) {
            console.error('❌ Image compression/validation failed:', compressionResult.error);
            toast.error(compressionResult.error || 'Image compression failed', { id: toastId });
            setUploadProgress(0);
            return;
          }
          
          const compressedPhoto = compressionResult.file as File;
          console.log(`✅ Photo optimized: ${formatFileSize(compressionResult.originalSize)} → ${formatFileSize(compressionResult.optimizedSize)} (${compressionResult.compressionRatio.toFixed(2)}x)`);
          
          const uploadResult = await uploadPhoto(
            user!.id,
            connectionId,
            compressedPhoto,
            accessToken!,
            (progress) => {
              // Phase 3c: Update toast with progress
              toast.loading(`Uploading photo... ${Math.round(progress)}%`, { id: toastId });
              setUploadProgress(progress);
            }
          );
          
          if (uploadResult.success && uploadResult.url) {
            uploadedMediaUrl = uploadResult.url;
            console.log('✅ Photo uploaded:', uploadResult.url);
            
            // Phase 4a: Auto-tag photo with AI
            try {
              console.log('🤖 AI analyzing photo...');
              toast.loading('AI analyzing photo...', { id: toastId });
              
              const aiResult = await autoTagPhoto(uploadResult.url);
              
              if (aiResult.aiGenerated && aiResult.tags.length > 0) {
                console.log(`✅ AI generated ${aiResult.tags.length} tags:`, aiResult.tags);
                
                // Merge AI tags with existing tags
                const existingTags = memory.tags || [];
                const mergedTags = Array.from(new Set([...existingTags, ...aiResult.tags]));
                memory.tags = mergedTags;
                
                // Update category if not set
                if (!memory.category || memory.category === 'General') {
                  memory.category = aiResult.category;
                }
                
                toast.success(`Photo analyzed! Added ${aiResult.tags.length} AI tags`, { id: toastId, duration: 2000 });
              } else {
                console.log('ℹ️ AI tagging skipped (not configured or failed)');
                // Continue without AI tags - don't block upload
              }
            } catch (aiError) {
              console.warn('⚠️ AI tagging failed, continuing without AI tags:', aiError);
              // Don't block upload if AI fails
            }
          } else {
            console.error('❌ Photo upload failed:', uploadResult.error);
            throw new Error(uploadResult.error || 'Photo upload failed');
          }
        } catch (error) {
          console.error('❌ Photo upload error:', error);
          setUploadProgress(0);
          toast.error('Failed to upload photo. Please try again.', { 
            id: toastId,
            action: {
              label: 'Retry',
              onClick: () => handleAddMemory(memory)
            }
          });
          return;
        }
      }
      
      // Upload video if present
      if (memory.type === 'video' && memory.videoUrl) {
        console.log('📤 Uploading video to Supabase Storage...');
        try {
          let videoFile: File | Blob;
          
          // Check if it's a blob URL (videos typically use blob URLs)
          if (memory.videoUrl.startsWith('blob:')) {
            const response = await fetch(memory.videoUrl);
            videoFile = await response.blob();
          }
          // Check if it's a data URL
          else if (memory.videoUrl.startsWith('data:')) {
            videoFile = dataURLtoBlob(memory.videoUrl);
          } else {
            console.warn('⚠️ Unknown video URL format, skipping upload');
            videoFile = new Blob();
          }
          
          // Phase 3d: Validate video file size
          console.log(`📦 Validating video (${formatFileSize(videoFile.size)})...`);
          const videoValidation = await validateVideo(videoFile as File);
          
          if (!videoValidation.success) {
            console.error('❌ Video validation failed:', videoValidation.error);
            toast.error(videoValidation.error || 'Video file size exceeds limit', { id: toastId });
            setUploadProgress(0);
            return;
          }
          
          console.log('✅ Video validated successfully');
          
          const uploadResult = await uploadVideo(
            user!.id,
            connectionId,
            videoFile as File,
            accessToken!,
            (progress) => {
              // Phase 3c: Update toast with progress
              toast.loading(`Uploading video... ${Math.round(progress)}%`, { id: toastId });
              setUploadProgress(progress);
            }
          );
          
          if (uploadResult.success && uploadResult.url) {
            uploadedMediaUrl = uploadResult.url;
            console.log('✅ Video uploaded:', uploadResult.url);
            
            // Upload video thumbnail if present
            if (memory.videoThumbnail && memory.videoThumbnail.startsWith('data:')) {
              try {
                console.log('📤 Uploading video thumbnail...');
                const thumbnailBlob = dataURLtoBlob(memory.videoThumbnail);
                const thumbnailFile = new File([thumbnailBlob], 'thumbnail.jpg', { type: 'image/jpeg' });
                
                const thumbnailUploadResult = await uploadPhoto(
                  user!.id,
                  connectionId,
                  thumbnailFile,
                  accessToken!,
                  () => {} // No progress callback for thumbnail
                );
                
                if (thumbnailUploadResult.success && thumbnailUploadResult.url) {
                  memory.videoThumbnail = thumbnailUploadResult.url;
                  console.log('✅ Video thumbnail uploaded:', thumbnailUploadResult.url);
                } else {
                  console.warn('⚠️ Thumbnail upload failed, continuing without it');
                  memory.videoThumbnail = undefined;
                }
              } catch (thumbError) {
                console.warn('⚠️ Error uploading thumbnail:', thumbError);
                memory.videoThumbnail = undefined;
              }
            }
          } else {
            console.error('❌ Video upload failed:', uploadResult.error);
            throw new Error(uploadResult.error || 'Video upload failed');
          }
        } catch (error) {
          console.error('❌ Video upload error:', error);
          setUploadProgress(0);
          toast.error('Failed to upload video. Please try again.', { 
            id: toastId,
            action: {
              label: 'Retry',
              onClick: () => handleAddMemory(memory)
            }
          });
          return;
        }
      }
      
      // Upload audio if present
      if (memory.type === 'voice' && (memory.audioUrl || memory.audioBlob)) {
        console.log('📤 Uploading audio to Supabase Storage...');
        try {
          let audioBlob: Blob;
          
          // Prefer audioUrl (base64) over audioBlob (blob URL)
          const audioSource = memory.audioUrl || memory.audioBlob;
          
          if (!audioSource) {
            console.warn('⚠️ No audio source found');
            audioBlob = new Blob();
          }
          // Check if it's a data URL (base64)
          else if (audioSource.startsWith('data:')) {
            audioBlob = dataURLtoBlob(audioSource);
          }
          // Check if it's a blob URL
          else if (audioSource.startsWith('blob:')) {
            const response = await fetch(audioSource);
            audioBlob = await response.blob();
          } else {
            console.warn('⚠️ Unknown audio URL format, skipping upload');
            audioBlob = new Blob();
          }
          
          // Phase 3d: Validate audio file size
          console.log(`📦 Validating audio (${formatFileSize(audioBlob.size)})...`);
          const audioValidation = await validateAudio(audioBlob);
          
          if (!audioValidation.success) {
            console.error('❌ Audio validation failed:', audioValidation.error);
            toast.error(audioValidation.error || 'Audio file size exceeds limit', { id: toastId });
            setUploadProgress(0);
            return;
          }
          
          console.log('✅ Audio validated successfully');
          
          const fileName = `voice-${Date.now()}.webm`;
          
          const uploadResult = await uploadAudio(
            user!.id,
            connectionId,
            audioBlob,
            accessToken!,
            fileName,
            (progress) => {
              // Phase 3c: Update toast with progress
              toast.loading(`Uploading voice note... ${Math.round(progress)}%`, { id: toastId });
              setUploadProgress(progress);
            }
          );
          
          if (uploadResult.success && uploadResult.url) {
            uploadedMediaUrl = uploadResult.url;
            console.log('✅ Audio uploaded:', uploadResult.url);
            
            // Phase 4b: Auto-transcribe voice note with AI
            try {
              console.log('🤖 AI transcribing voice note...');
              toast.loading('AI transcribing voice note...', { id: toastId });
              
              // Detect language from voice note if available
              const detectedLanguage = memory.voiceLanguage ? getLanguageCode(memory.voiceLanguage) : undefined;
              
              const aiResult = await autoTranscribeVoiceNote(uploadResult.url, detectedLanguage);
              
              if (aiResult.aiGenerated && aiResult.transcript) {
                console.log(`✅ AI generated transcript (${aiResult.transcript.length} chars):`, aiResult.transcript.substring(0, 100) + '...');
                
                // Update transcript
                memory.transcript = aiResult.transcript;
                
                // Update voice language if detected
                if (aiResult.language && aiResult.language !== 'unknown') {
                  memory.voiceLanguage = aiResult.language;
                }
                
                toast.success(`Voice note transcribed!`, { id: toastId, duration: 2000 });
              } else {
                console.log('ℹ️ AI transcription skipped (not configured or failed)');
                // Continue without transcript - don't block upload
              }
            } catch (aiError) {
              console.warn('⚠️ AI transcription failed, continuing without transcript:', aiError);
              // Don't block upload if AI fails
            }
          } else {
            console.error('❌ Audio upload failed:', uploadResult.error);
            throw new Error(uploadResult.error || 'Audio upload failed');
          }
        } catch (error) {
          console.error('❌ Audio upload error:', error);
          setUploadProgress(0);
          toast.error('Failed to upload voice note. Please try again.', { 
            id: toastId,
            action: {
              label: 'Retry',
              onClick: () => handleAddMemory(memory)
            }
          });
          return;
        }
      }
      
      // Upload document if present
      if (memory.type === 'document' && memory.documentUrl) {
        console.log('📤 Uploading document to Supabase Storage...');
        try {
          let documentFile: File | Blob;
          
          // Check if it's a data URL (base64)
          if (memory.documentUrl.startsWith('data:')) {
            documentFile = dataURLtoBlob(memory.documentUrl);
            
            // Create a proper File object with the original file name
            const fileName = memory.documentFileName || `document-${Date.now()}.pdf`;
            documentFile = new File([documentFile], fileName, { 
              type: documentFile.type 
            });
          } 
          // Check if it's a blob URL
          else if (memory.documentUrl.startsWith('blob:')) {
            const response = await fetch(memory.documentUrl);
            documentFile = await response.blob();
            
            // Create a proper File object with the original file name
            const fileName = memory.documentFileName || `document-${Date.now()}.pdf`;
            documentFile = new File([documentFile], fileName, { 
              type: documentFile.type 
            });
          } 
          // If it's already a URL (e.g., from Supabase), skip upload
          else if (memory.documentUrl.startsWith('http')) {
            console.log('✅ Document already uploaded:', memory.documentUrl);
            uploadedMediaUrl = memory.documentUrl;
            documentFile = null as any; // Skip upload
          } else {
            console.warn('⚠️ Unknown document URL format, skipping upload');
            documentFile = new Blob();
          }
          
          // Only upload if we have a document file to upload
          if (documentFile && documentFile.size > 0) {
            const uploadResult = await uploadDocument(
              user!.id,
              connectionId,
              documentFile as File,
              accessToken!,
              (progress) => {
                toast.loading(`Uploading document... ${Math.round(progress)}%`, { id: toastId });
                setUploadProgress(progress);
              }
            );
            
            if (uploadResult.success && uploadResult.url) {
              uploadedMediaUrl = uploadResult.url;
              console.log('✅ Document uploaded:', uploadResult.url);
              
              // Automatically extract text from document using documentScanner
              try {
                toast.loading('Extracting text from document...', { id: toastId });
                console.log('📄 Starting automatic document text extraction...');
                
                const { scanDocument } = await import('../utils/documentScanner');
                const scanResult = await scanDocument(documentFile as File);
                
                if (scanResult.text && scanResult.text.length > 0) {
                  // Add extracted text to memory
                  memory.documentScannedText = scanResult.text;
                  memory.documentScanLanguage = scanResult.language;
                  
                  console.log('✅ Document text extracted:', {
                    textLength: scanResult.text.length,
                    wordCount: scanResult.wordCount,
                    language: scanResult.language,
                    confidence: scanResult.confidence
                  });
                  
                  toast.success(`Document uploaded! ${scanResult.wordCount} words extracted.`, { id: toastId });
                } else {
                  console.log('ℹ️ No text extracted from document');
                  toast.success('Document uploaded successfully!', { id: toastId });
                }
              } catch (scanError) {
                console.warn('⚠️ Document text extraction failed:', scanError);
                // Don't block upload if extraction fails
                toast.success('Document uploaded successfully!', { id: toastId });
              }
            } else {
              console.error('❌ Document upload failed:', uploadResult.error);
              throw new Error(uploadResult.error || 'Document upload failed');
            }
          }
        } catch (error) {
          console.error('❌ Document upload error:', error);
          setUploadProgress(0);
          toast.error('Failed to upload document. Please try again.', { 
            id: toastId,
            action: {
              label: 'Retry',
              onClick: () => handleAddMemory(memory)
            }
          });
          return;
        }
      }
      
      // Call API to create memory with uploaded media URL
      // Build type-specific API request with correct field names
      const apiRequest: any = {
        connectionId,
        type: memory.type,
        content: memory.content,
        sender: memory.sender, // Required!
        category: memory.category,
        tags: memory.tags || [],
        estimatedDate: memory.estimatedDate,
        notes: memory.note, // Fix: note -> notes
        location: memory.location,
        promptQuestion: memory.promptQuestion,
        conversationContext: memory.conversationContext,
      };

      // Add type-specific media URLs and metadata
      if (memory.type === 'photo') {
        apiRequest.photoUrl = uploadedMediaUrl;
        apiRequest.photoDate = memory.photoDate?.toISOString();
        apiRequest.photoLocation = memory.photoLocation;
        apiRequest.photoGPSCoordinates = memory.photoGPSCoordinates;
        apiRequest.detectedPeople = memory.detectedPeople;
      }

      if (memory.type === 'video') {
        apiRequest.videoUrl = uploadedMediaUrl;
        apiRequest.videoThumbnail = memory.videoThumbnail;
        apiRequest.videoDate = memory.videoDate?.toISOString();
        apiRequest.videoLocation = memory.videoLocation;
        apiRequest.videoGPSCoordinates = memory.videoGPSCoordinates;
        apiRequest.videoPeople = memory.videoPeople;
      }

      if (memory.type === 'voice') {
        apiRequest.audioUrl = uploadedMediaUrl;
        apiRequest.transcript = memory.transcript;
        apiRequest.originalText = memory.originalText;
        apiRequest.voiceLanguage = memory.voiceLanguage;
        apiRequest.englishTranslation = memory.englishTranslation;
        apiRequest.voiceVisualReference = memory.voiceVisualReference;
      }

      if (memory.type === 'document') {
        apiRequest.documentUrl = uploadedMediaUrl;
        apiRequest.documentType = memory.documentType;
        apiRequest.documentFileName = memory.documentFileName;
        apiRequest.documentScannedText = memory.documentScannedText;
        apiRequest.documentScanLanguage = memory.documentScanLanguage;
      }

      console.log('📡 Creating memory with fields:', Object.keys(apiRequest));
      console.log('📡 API request details:', {
        type: apiRequest.type,
        hasPhotoUrl: !!apiRequest.photoUrl,
        hasVideoUrl: !!apiRequest.videoUrl,
        hasAudioUrl: !!apiRequest.audioUrl,
        category: apiRequest.category,
        tags: apiRequest.tags
      });
      
      const response = await apiClient.createMemory(apiRequest);
      
      if (response.success && response.memory) {
        console.log('✅ Memory created successfully:', {
          id: response.memory.id,
          type: response.memory.type,
          hasPhotoUrl: !!response.memory.photoUrl,
          hasVideoUrl: !!response.memory.videoUrl
        });
        
        // Convert API memory to UI format
        const newMemory = convertApiMemoryToUIMemory(response.memory);
        
        // CRITICAL: Update per-connection cache FIRST (for Dashboard validation)
        if (userType === 'keeper') {
          setMemoriesByStoryteller((prev) => ({
            ...prev,
            [connectionId]: [...(prev[connectionId] || []), newMemory],
          }));
        } else {
          setMemoriesByLegacyKeeper((prev) => ({
            ...prev,
            [connectionId]: [...(prev[connectionId] || []), newMemory],
          }));
        }
        
        // THEN update global state
        setMemories((prev) => [...prev, newMemory]);
        
        // Phase 5: Broadcast memory creation to other clients
        if (realtimeConnected && user) {
          await realtimeSync.broadcastMemoryUpdate({
            action: 'create',
            memoryId: newMemory.id,
            connectionId,
            memory: response.memory,
            userId: user.id,
          });
          console.log('📡 Memory update broadcasted to connected users');
        }

        // Send iMessage-style push notification to partner (NON-BLOCKING - fire and forget)
        if (partnerProfile && user) {
          // Fire-and-forget: Don't await this - let it happen in background
          (async () => {
            try {
              const { notifyNewMemory } = await import('../utils/notificationService');
              
              let previewText = memory.content || '';
              if (memory.type === 'photo') {
                previewText = memory.photoCaption || 'Sent a photo';
              } else if (memory.type === 'video') {
                previewText = 'Sent a video';
              } else if (memory.type === 'voice') {
                previewText = memory.englishTranslation || 'Sent a voice note';
              } else if (memory.type === 'document') {
                previewText = memory.documentFileName || 'Sent a document';
              }

              // Get partner's userId from the connection
              const activeConnectionId = userType === 'keeper' ? activeStorytellerId : activeLegacyKeeperId;
              const connectionRecord = connections.find(c => c.connection?.id === activeConnectionId);

              if (connectionRecord && connectionRecord.partner) {
                const partnerUserId = connectionRecord.partner.id;

                // Check if partner is actively viewing this chat (via Realtime presence)
                const presenceState = realtimeSync.getPresenceState(activeConnectionId);
                const partnerIsActive = presenceState?.[partnerUserId]?.online === true;

                console.log('📱 Push notification check:', {
                  partnerUserId,
                  partnerIsActive,
                  willSendPush: !partnerIsActive,
                  reason: partnerIsActive ? 'Partner is actively viewing chat - skip push' : 'Partner is not active - send push'
                });

                // Only send push notification if partner is NOT actively viewing the chat
                // If they're active, they'll see the message instantly via Realtime
                if (!partnerIsActive) {
                  // Fire-and-forget: Don't block on notification
                  notifyNewMemory({
                    userId: partnerUserId,
                    senderName: user.name || 'Someone',
                    memoryType: memory.type as any,
                    memoryId: newMemory.id,
                    previewText,
                    mediaUrl: uploadedMediaUrl,
                  }).then(() => {
                    console.log('📱 Background push notification sent');
                  }).catch((err) => {
                    console.log('ℹ️ Push notification failed (non-critical):', err);
                  });
                } else {
                  console.log('✅ Partner is viewing chat - message delivered via Realtime (no push needed)');
                }
              }
            } catch (notifError) {
              // Silent fail - notifications are non-critical for message delivery
              console.log('ℹ️ Notification skipped:', notifError);
            }
          })();
        }
        
        // Show success toast
        toast.success(`Memory added successfully!`, { id: toastId });
      } else {
        console.error('❌ Failed to create memory:', response.error);
        // Show error toast
        toast.error(`Failed to add memory: ${response.error}`, { id: toastId });
      }
    } catch (error) {
      console.error('❌ Failed to create memory:', error);
      // Show error toast
      toast.error(`Failed to add memory: ${error instanceof Error ? error.message : 'Network error. Please check your connection.'}`, { id: toastId });
    }
  };
  
  const handleSwitchStoryteller = async (storytellerId: string) => {
    const storyteller = storytellers.find((s) => s.id === storytellerId);
    if (storyteller) {
      console.log(`🔄 Switching to storyteller: ${storyteller.name} (${storytellerId})`);
      
      setActiveStorytellerId(storytellerId);
      setPartnerProfile({
        id: storyteller.id,
        name: storyteller.name,
        relationship: storyteller.relationship,
        bio: storyteller.bio,
        photo: storyteller.photo,
      });
      setIsConnected(storyteller.isConnected);
      
      // Persist the last active connection to localStorage
      if (user?.id) {
        localStorage.setItem(`adoras_last_active_connection_${user.id}`, storytellerId);
        console.log(`💾 Persisted last active connection: ${storytellerId}`);
      }
      
      // Immediately load cached memories for instant UI update
      const cachedMemories = memoriesByStoryteller[storytellerId] || [];
      console.log(`📦 Loading ${cachedMemories.length} cached memories for ${storyteller.name}`);
      setMemories(cachedMemories);
      
      // Then refresh from API in the background (explicitly mark as active connection)
      await loadMemoriesForConnection(storytellerId, true);
    }
  };
  
  const handleSwitchLegacyKeeper = async (legacyKeeperId: string) => {
    const legacyKeeper = legacyKeepers.find((lk) => lk.id === legacyKeeperId);
    if (legacyKeeper) {
      console.log(`🔄 Switching to legacy keeper: ${legacyKeeper.name} (${legacyKeeperId})`);
      
      setActiveLegacyKeeperId(legacyKeeperId);
      setPartnerProfile({
        id: legacyKeeper.id,
        name: legacyKeeper.name,
        relationship: legacyKeeper.relationship,
        bio: legacyKeeper.bio,
        photo: legacyKeeper.photo,
      });
      setIsConnected(legacyKeeper.isConnected);
      
      // Persist the last active connection to localStorage
      if (user?.id) {
        localStorage.setItem(`adoras_last_active_connection_${user.id}`, legacyKeeperId);
        console.log(`💾 Persisted last active connection: ${legacyKeeperId}`);
      }
      
      // Immediately load cached memories for instant UI update
      const cachedMemories = memoriesByLegacyKeeper[legacyKeeperId] || [];
      console.log(`📦 Loading ${cachedMemories.length} cached memories for ${legacyKeeper.name}`);
      setMemories(cachedMemories);
      
      // Load memories from API (explicitly mark as active connection)
      await loadMemoriesForConnection(legacyKeeperId, true);
    }
  };

  const handleEditMemory = async (memoryId: string, updates: Partial<Memory>, localOnly = false) => {
    try {
      const connectionId = userType === 'keeper' 
        ? activeStorytellerId 
        : activeLegacyKeeperId;
      
      // If localOnly is true, skip API call and just update local state
      // This is used for read tracking where backend already updated via markMessagesAsRead
      if (localOnly) {
        console.log(`✏️ Updating memory locally: ${memoryId}`, updates);
        
        // Update local state directly
        setMemories((prev) => prev.map((memory) =>
          memory.id === memoryId ? { ...memory, ...updates } : memory
        ));
        
        // Update memories by connection
        if (userType === 'keeper' && connectionId) {
          setMemoriesByStoryteller((prev) => ({
            ...prev,
            [connectionId]: (prev[connectionId] || []).map((memory) =>
              memory.id === memoryId ? { ...memory, ...updates } : memory
            ),
          }));
        }
        
        if (userType === 'teller' && connectionId) {
          setMemoriesByLegacyKeeper((prev) => ({
            ...prev,
            [connectionId]: (prev[connectionId] || []).map((memory) =>
              memory.id === memoryId ? { ...memory, ...updates } : memory
            ),
          }));
        }
        
        return;
      }
      
      // Otherwise, call API to update memory
      console.log('📡 Updating memory via API...', memoryId);
      
      const response = await apiClient.updateMemory(memoryId, {
        note: updates.note,
        timestamp: updates.timestamp?.toISOString(),
        location: updates.location,
        tags: updates.tags,
      });
      
      if (response.success && response.memory) {
        console.log('✅ Memory updated successfully:', memoryId);
        
        // Convert API memory to UI format
        const updatedMemory = convertApiMemoryToUIMemory(response.memory);
        
        // Update local state
        setMemories((prev) => prev.map((memory) =>
          memory.id === memoryId ? updatedMemory : memory
        ));
        
        // Update memories by connection
        if (userType === 'keeper' && connectionId) {
          setMemoriesByStoryteller((prev) => ({
            ...prev,
            [connectionId]: (prev[connectionId] || []).map((memory) =>
              memory.id === memoryId ? updatedMemory : memory
            ),
          }));
        }
        
        if (userType === 'teller' && connectionId) {
          setMemoriesByLegacyKeeper((prev) => ({
            ...prev,
            [connectionId]: (prev[connectionId] || []).map((memory) =>
              memory.id === memoryId ? updatedMemory : memory
            ),
          }));
        }
        
        // Phase 5: Broadcast memory update to other clients
        if (realtimeConnected && user && connectionId) {
          await realtimeSync.broadcastMemoryUpdate({
            action: 'update',
            memoryId,
            connectionId,
            memory: response.memory,
            userId: user.id,
          });
          console.log('📡 Memory update broadcasted');
        }
      } else {
        console.error('❌ Failed to update memory:', response.error);
        // TODO: Show error toast to user
      }
    } catch (error) {
      console.error('❌ Failed to update memory:', error);
      // TODO: Show error toast to user
    }
  };

  const handleDeleteMemory = async (memoryId: string) => {
    try {
      console.log('📡 Deleting memory via API...', memoryId);
      
      // Call API to delete memory
      const response = await apiClient.deleteMemory(memoryId);
      
      if (response.success) {
        console.log('✅ Memory deleted successfully:', memoryId);
        
        // Show success toast
        toast.success('Memory deleted successfully');
        
        // Remove from local state
        setMemories((prev) => {
          const filtered = prev.filter((memory) => memory.id !== memoryId);
          console.log(`🗑️ Removed from memories: ${prev.length} -> ${filtered.length}`);
          return filtered;
        });
        
        // Remove from memories by connection
        const connectionId = userType === 'keeper' 
          ? activeStorytellerId 
          : activeLegacyKeeperId;
        
        if (userType === 'keeper' && connectionId) {
          setMemoriesByStoryteller((prev) => {
            const updated = {
              ...prev,
              [connectionId]: (prev[connectionId] || []).filter(
                (memory) => memory.id !== memoryId
              ),
            };
            console.log(`🗑️ Removed from storyteller memories for ${connectionId}`);
            return updated;
          });
        }
        
        if (userType === 'teller' && connectionId) {
          setMemoriesByLegacyKeeper((prev) => {
            const updated = {
              ...prev,
              [connectionId]: (prev[connectionId] || []).filter(
                (memory) => memory.id !== memoryId
              ),
            };
            console.log(`🗑️ Removed from legacy keeper memories for ${connectionId}`);
            return updated;
          });
        }
        
        // Phase 5: Broadcast memory deletion to other clients
        if (realtimeConnected && user && connectionId) {
          await realtimeSync.broadcastMemoryUpdate({
            action: 'delete',
            memoryId,
            connectionId,
            userId: user.id,
          });
          console.log('📡 Memory deletion broadcasted');
        }
      } else {
        console.error('❌ Failed to delete memory:', response.error);
        toast.error(`Failed to delete memory: ${response.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Failed to delete memory:', error);
      toast.error('Failed to delete memory. Please try again.');
    }
  };

  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    if (!userProfile) {
      console.error('❌ No user profile found');
      return;
    }

    try {
      console.log('📡 Updating profile via API...');
      
      // Call API to update profile
      const response = await apiClient.updateProfile({
        name: updates.name,
        relationship: updates.relationship,
        bio: updates.bio,
        phoneNumber: updates.phoneNumber,
        appLanguage: updates.appLanguage as 'english' | 'spanish' | 'french' | 'chinese' | 'korean' | 'japanese' | undefined,
        birthday: updates.birthday?.toISOString(),
        photo: updates.photo,
      });
      
      if (response.success && response.user) {
        console.log('✅ Profile updated successfully');
        
        // Update local state with server response
        setUserProfile({
          name: response.user.name,
          relationship: response.user.relationship || '',
          bio: response.user.bio || '',
          email: response.user.email,
          phoneNumber: response.user.phoneNumber,
          appLanguage: response.user.appLanguage,
          birthday: response.user.birthday ? new Date(response.user.birthday) : undefined,
          photo: response.user.photo,
        });
      } else {
        console.error('❌ Failed to update profile:', response.error);
        // TODO: Show error toast to user
      }
    } catch (error) {
      console.error('❌ Failed to update profile:', error);
      // TODO: Show error toast to user
    }
  };

  /**
   * Phase 2c Part 1: Create Invitation
   * Creates a new invitation and sends SMS to the partner
   */
  const handleCreateInvitation = async (
    partnerName: string,
    partnerRelationship: string,
    phoneNumber: string
  ) => {
    try {
      console.log('📡 Creating invitation via API...');
      
      // Call API to create invitation
      const response = await apiClient.createInvitation({
        tellerPhoneNumber: phoneNumber,
        tellerName: partnerName,
        tellerRelationship: partnerRelationship,
      });
      
      if (response.success && response.invitation) {
        console.log('✅ Invitation created:', response.invitation.id);
        console.log('📱 SMS sent to:', phoneNumber);
        
        // Reload connections to show pending invitation
        await loadConnectionsFromAPI();
        
        return { 
          success: true, 
          invitationId: response.invitation.id,
          message: 'Invitation sent successfully!' 
        };
      } else {
        console.error('❌ Failed to create invitation:', response.error);
        return { 
          success: false, 
          error: response.error || 'Failed to create invitation' 
        };
      }
    } catch (error) {
      console.error('❌ Failed to create invitation:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create invitation' 
      };
    }
  };

  /**
   * Phase 2c Part 2: Accept Invitation
   * Accepts an invitation using the invitation code
   */
  const handleAcceptInvitation = async (invitationCode: string) => {
    try {
      console.log('📡 Accepting invitation via API...', invitationCode);
      
      // Call API to accept invitation
      const response = await apiClient.acceptInvitation({
        code: invitationCode,
      });
      
      if (response.success) {
        console.log('✅ Invitation accepted successfully');
        
        // Reload connections to show new active connection
        await loadConnectionsFromAPI();
        
        return { 
          success: true,
          message: 'Connection established successfully!' 
        };
      } else {
        console.error('❌ Failed to accept invitation:', response.error);
        return { 
          success: false, 
          error: response.error || 'Failed to accept invitation' 
        };
      }
    } catch (error) {
      console.error('❌ Failed to accept invitation:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to accept invitation' 
      };
    }
  };

  /**
   * Connect with existing user via email
   * No invitation code needed - creates immediate connection
   */
  const handleConnectViaEmail = async (email: string) => {
    try {
      console.log('📧 Connecting via email...', email);
      
      // Call API to connect via email
      const response = await apiClient.connectViaEmail(email);
      
      if (response.success) {
        console.log('✅ Email connection established successfully');
        
        // Reload connections to show new active connection
        await loadConnectionsFromAPI();
        
        return { 
          success: true,
          message: response.message || 'Connection established successfully!' 
        };
      } else {
        console.error('❌ Failed to connect via email:', response.error);
        return { 
          success: false, 
          error: response.error || 'Failed to connect via email' 
        };
      }
    } catch (error) {
      console.error('❌ Failed to connect via email:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to connect via email' 
      };
    }
  };

  const renderCurrentScreen = () => {
    // Show loading screen while checking authentication
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'rgb(245, 249, 233)' }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground" style={{ fontFamily: 'Inter' }}>Loading...</p>
          </div>
        </div>
      );
    }

    // Prevent authenticated users from accessing signup/onboarding screens
    if (isAuthenticated && ['signup', 'userType', 'keeperOnboarding', 'tellerOnboarding'].includes(currentScreen)) {
      console.log('⚠️ Authenticated user tried to access signup flow, redirecting to dashboard');
      setCurrentScreen('dashboard');
      return null;
    }

    switch (currentScreen) {
      case 'welcome':
        return <WelcomeScreen onNext={handleWelcomeNext} onLogin={handleWelcomeLogin} />;
      case 'login':
        return (
          <LoginScreen
            onSuccess={handleLoginSuccess}
            onSignUpClick={() => setCurrentScreen('userType')}
            onBack={() => setCurrentScreen('welcome')}
          />
        );
      case 'signup':
        return (
          <SignUpInitialScreen
            onComplete={handleSignUpComplete}
            onLoginClick={() => setCurrentScreen('login')}
            onBack={() => setCurrentScreen('userType')}
            userType={userType!}
          />
        );
      case 'userType':
        return <UserTypeSelection onSelect={handleUserTypeSelect} onBack={() => setCurrentScreen('welcome')} />;
      case 'keeperOnboarding':
        return (
          <KeeperOnboarding
            onComplete={handleOnboardingComplete}
            onBack={() => setCurrentScreen('signup')}
            isLoading={isSigningUp}
            error={signupError}
          />
        );
      case 'tellerOnboarding':
        return (
          <TellerOnboarding
            onComplete={handleOnboardingComplete}
            onBack={() => setCurrentScreen('signup')}
            isLoading={isSigningUp}
            error={signupError}
          />
        );
      case 'dashboard':
        // Only render Dashboard if user data is ready
        // partnerProfile can be null (will show "not connected" state)
        if (!userType || !userProfile) {
          return (
            <div className="min-h-screen flex items-center justify-center bg-background">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground" style={{ fontFamily: 'Inter' }}>Loading your profile...</p>
              </div>
            </div>
          );
        }
        
        return (
          <Dashboard
            userType={userType}
            userProfile={userProfile}
            partnerProfile={partnerProfile}
            memories={memories}
            onAddMemory={handleAddMemory}
            isConnected={isConnected}
            storytellers={storytellers}
            activeStorytellerId={activeStorytellerId}
            onSwitchStoryteller={handleSwitchStoryteller}
            legacyKeepers={legacyKeepers}
            activeLegacyKeeperId={activeLegacyKeeperId}
            onSwitchLegacyKeeper={handleSwitchLegacyKeeper}
            displayLanguage={displayLanguage}
            onDisplayLanguageChange={setDisplayLanguage}
            onEditMemory={handleEditMemory}
            onDeleteMemory={handleDeleteMemory}
            onUpdateProfile={handleUpdateProfile}
            onCreateInvitation={handleCreateInvitation}
            onConnectViaEmail={handleConnectViaEmail}
            onAcceptInvitation={handleAcceptInvitation}
            presences={presences}
            realtimeConnected={realtimeConnected}
            memoriesByStoryteller={memoriesByStoryteller}
            memoriesByLegacyKeeper={memoriesByLegacyKeeper}
          />
        );
      default:
        return <WelcomeScreen onNext={handleWelcomeNext} onLogin={handleWelcomeLogin} />;
    }
  };

  return (
    <>
      {renderCurrentScreen()}
      
      {/* Notification Onboarding Dialog - Shows on first login */}
      {user && (
        <NotificationOnboardingDialog
          open={showNotificationOnboarding}
          onOpenChange={setShowNotificationOnboarding}
          userId={user.id}
          userName={partnerProfile?.name || 'your family member'}
        />
      )}
    </>
  );
}
