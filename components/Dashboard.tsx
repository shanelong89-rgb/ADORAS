// Dashboard v2.0 - Header always visible, no scroll detection
// CACHE BUST: v11-BADGE-TAB-AWARE-FIX - 2025-11-14
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { PromptsTab } from './PromptsTab';
import { ChatTab } from './ChatTab';
import { MediaLibraryTab } from './MediaLibraryTab';
import { AccountSettings } from './AccountSettings';
import { Notifications } from './Notifications';
import { PrivacySecurity } from './PrivacySecurity';
import { StorageData } from './StorageData';
import { HelpFeedback } from './HelpFeedback';
import { InvitationDialog } from './InvitationDialog';
import { InvitationManagement } from './InvitationManagement';
import { TwilioTestDialog } from './TwilioTestDialog';
import { KeeperConnections } from './KeeperConnections';
import { TellerConnections } from './TellerConnections';
import { PresenceIndicator, PresenceDot, ConnectionStatus } from './PresenceIndicator';
import { SafariInstallBanner } from './SafariInstallBanner';
import { UserProfile, Memory, UserType, Storyteller, LegacyKeeper, DisplayLanguage } from '../App';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { SmartAvatar } from './SmartAvatar';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Menu, Zap, MessageCircle, Image, User, Check, UserPlus, Bell, Shield, Database, HelpCircle, LogOut, List, Users } from 'lucide-react';
import { useAuth } from '../utils/api/AuthContext';
import { realtimeSync, type PresenceState } from '../utils/realtimeSync';
import { useTranslation } from '../utils/i18n';
import { NotificationMiniBadge } from './NotificationBadge';
import { apiClient } from '../utils/api/client';
import { showNativeNotificationBanner } from '../utils/notificationService';
import { InAppToastContainer, useInAppToasts } from './InAppToast';

interface DashboardProps {
  userId?: string; // Stable user ID from AuthContext (doesn't change during profile updates)
  userType: UserType;
  userProfile: UserProfile;
  partnerProfile: UserProfile | null; // Allow null for "not connected" state
  memories: Memory[];
  onAddMemory: (memory: Omit<Memory, 'id' | 'timestamp'>) => void;
  isConnected: boolean;
  storytellers?: Storyteller[];
  activeStorytellerId?: string;
  onSwitchStoryteller?: (storytellerId: string) => void;
  legacyKeepers?: LegacyKeeper[];
  activeLegacyKeeperId?: string;
  onSwitchLegacyKeeper?: (legacyKeeperId: string) => void;
  displayLanguage: DisplayLanguage;
  onDisplayLanguageChange: (language: DisplayLanguage) => void;
  onEditMemory?: (memoryId: string, updates: Partial<Memory>, localOnly?: boolean) => void;
  onDeleteMemory?: (memoryId: string) => void;
  onUpdateProfile: (updates: Partial<UserProfile>) => void;
  onCreateInvitation?: (partnerName: string, partnerRelationship: string, phoneNumber: string) => Promise<{ success: boolean; invitationId?: string; message?: string; error?: string }>;
  onConnectViaEmail?: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  onAcceptInvitation?: (invitationCode: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  memoriesByStoryteller?: Record<string, Memory[]>;
  memoriesByLegacyKeeper?: Record<string, Memory[]>;
  presences?: Record<string, PresenceState>;
  realtimeConnected?: boolean;
  unreadCounts?: Record<string, number>; // Real-time incremental badge counts from AppContent
  onActiveTabChange?: (tab: string) => void; // Notify parent when active tab changes
}

export function Dashboard({ 
  userId,
  userType, 
  userProfile, 
  partnerProfile, 
  memories, 
  onAddMemory,
  isConnected,
  storytellers = [],
  activeStorytellerId,
  onSwitchStoryteller,
  legacyKeepers = [],
  activeLegacyKeeperId,
  onSwitchLegacyKeeper,
  displayLanguage,
  onDisplayLanguageChange,
  onEditMemory,
  onDeleteMemory,
  onUpdateProfile,
  onCreateInvitation,
  onConnectViaEmail,
  onAcceptInvitation,
  memoriesByStoryteller = {},
  memoriesByLegacyKeeper = {},
  unreadCounts = {},
  onActiveTabChange
}: DashboardProps) {
  const { signout } = useAuth();
  const { t } = useTranslation(userProfile.appLanguage || 'english');
  const { toasts, showToast, closeToast } = useInAppToasts();
  const [activeTab, setActiveTab] = useState('prompts');
  const [shouldScrollChatToBottom, setShouldScrollChatToBottom] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // 🔥 Force sidebar to re-render when badge counts change
  // Track a version number that changes whenever memoriesByStoryteller/Keeper updates
  const [badgeVersion, setBadgeVersion] = useState(0);
  
  // Update badge version whenever memories change (to force sidebar re-render)
  React.useEffect(() => {
    setBadgeVersion(v => v + 1);
  }, [memoriesByStoryteller, memoriesByLegacyKeeper]);

  const [showPrivacySecurity, setShowPrivacySecurity] = useState(false);
  const [showStorageData, setShowStorageData] = useState(false);
  const [showHelpFeedback, setShowHelpFeedback] = useState(false);
  const [showInvitationDialog, setShowInvitationDialog] = useState(false);
  const [showInvitationManagement, setShowInvitationManagement] = useState(false);
  const [showTwilioTest, setShowTwilioTest] = useState(false);
  const [showKeeperConnections, setShowKeeperConnections] = useState(false);
  const [showTellerConnections, setShowTellerConnections] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [lastChatReadTimestamp, setLastChatReadTimestamp] = useState<number>(() => {
    // Load from localStorage - use stable userId from AuthContext
    const stored = userId ? localStorage.getItem(`lastChatRead_${userId}`) : null;
    return stored ? parseInt(stored) : Date.now();
  });

  // 🔧 CONNECTION SWITCH: Loading state and error handling
  const [isSwitchingConnection, setIsSwitchingConnection] = useState(false);
  const [connectionSwitchError, setConnectionSwitchError] = useState<string | null>(null);

  // SIMPLIFIED: Filter memories strictly by active connection + sort by timestamp DESC
  const validatedMemories = React.useMemo(() => {
    const activeConnectionId = userType === 'keeper' ? activeStorytellerId : activeLegacyKeeperId;
    
    // CRITICAL: Always filter by active connection first
    if (!activeConnectionId) {
      console.log('⚠️ No active connection, returning empty memories');
      return [];
    }

    // Get per-connection memories (authoritative source)
    const connectionMemories = userType === 'keeper' 
      ? (memoriesByStoryteller[activeConnectionId] || [])
      : (memoriesByLegacyKeeper[activeConnectionId] || []);

    // CRITICAL FIX: Merge BOTH sources (per-connection + global), dedupe by ID
    // This ensures we show ALL memories, not just the latest realtime ones
    const allMemoriesMap = new Map<string, Memory>();
    
    // First, add global memories filtered by connection (with sender fallback)
    memories.forEach(m => {
      // Match by conversationContext OR sender type (fallback for old data)
      const isForConnection = m.conversationContext === activeConnectionId || 
                             m.sender === (userType === 'keeper' ? 'teller' : 'keeper');
      if (isForConnection) {
        allMemoriesMap.set(m.id, m);
      }
    });
    
    // Then, add/override with per-connection memories (more authoritative)
    connectionMemories.forEach(m => {
      allMemoriesMap.set(m.id, m);
    });
    
    // Convert back to array and sort by timestamp ASC (oldest first)
    const combined = Array.from(allMemoriesMap.values())
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    return combined;
  }, [memories, userType, activeStorytellerId, activeLegacyKeeperId, memoriesByStoryteller, memoriesByLegacyKeeper]);

  // Refs for tab content containers to handle scrolling
  const promptsContainerRef = useRef<HTMLDivElement>(null);
  const mediaContainerRef = useRef<HTMLDivElement>(null);

  // Calculate unread message count per connection for sidebar badges
  // 🔥 FIX: Use real-time incremental counts from AppContent instead of calculating from readBy
  const getUnreadCountForConnection = React.useCallback((connectionId: string) => {
    // Strict validation
    if (!connectionId) {
      return 0;
    }

    // Don't show badge when actively viewing chat tab for this specific connection
    const activeConnectionId = userType === 'keeper' ? activeStorytellerId : activeLegacyKeeperId;
    if (connectionId === activeConnectionId && activeTab === 'chat') {
      return 0;
    }

    // Use real-time incremental counts from AppContent (updated via broadcasts)
    // This is the SOURCE OF TRUTH for sidebar badges
    return unreadCounts[connectionId] || 0;
  }, [
    userType, 
    activeStorytellerId, 
    activeLegacyKeeperId, 
    activeTab,
    unreadCounts // Real-time incremental counts from AppContent
  ]);

  // Calculate unread message count for ACTIVE connection only (for Chat tab badge)
  // This shows "you have unread messages in the chat tab of your current connection"
  const unreadMessageCount = React.useMemo(() => {
    // Get the currently active connection
    const activeConnectionId = userType === 'keeper' ? activeStorytellerId : activeLegacyKeeperId;
    
    // If no active connection, return 0
    if (!activeConnectionId) {
      return 0;
    }
    
    // Return unread count for ONLY the active connection
    return getUnreadCountForConnection(activeConnectionId);
  }, [userType, activeStorytellerId, activeLegacyKeeperId, getUnreadCountForConnection, lastChatReadTimestamp]);

  // Load pending connection requests count
  const loadPendingRequestsCount = React.useCallback(async () => {
    try {
      const response = await apiClient.getConnectionRequests();
      if (response.success && response.receivedRequests) {
        const pending = response.receivedRequests.filter((r: any) => r.status === 'pending');
        setPendingRequestsCount(pending.length);
      }
    } catch (error) {
      // Silently handle connection request errors - this is a non-critical feature
      // User can still manually check in Settings > Connections
      console.log('ℹ️ Connection requests check skipped (server may be slow or unavailable)');
    }
  }, []);

  useEffect(() => {
    loadPendingRequestsCount();
    // Refresh every 5 minutes (reduced from 30s to minimize API calls)
    // Most users don't receive connection requests frequently
    const interval = setInterval(loadPendingRequestsCount, 300000);
    return () => clearInterval(interval);
  }, [loadPendingRequestsCount]);

  // Update document title with unread count
  useEffect(() => {
    if (unreadMessageCount > 0 && activeTab !== 'chat') {
      document.title = `(${unreadMessageCount}) Adoras`;
    } else {
      document.title = 'Adoras';
    }
  }, [unreadMessageCount, activeTab]);

  // Track last mark-as-read time to prevent duplicates
  const lastMarkAsReadTime = React.useRef<Record<string, number>>({});
  const markAsReadCooldown = 1000; // 1 second cooldown to prevent duplicate calls

  // 🔥 CRITICAL FIX: Use refs to prevent infinite re-render loop
  // When memories update, we don't want markConnectionAsRead to be recreated
  const memoriesByStorytellerRef = React.useRef(memoriesByStoryteller);
  const memoriesByLegacyKeeperRef = React.useRef(memoriesByLegacyKeeper);
  const onEditMemoryRef = React.useRef(onEditMemory);
  
  // Keep refs in sync
  React.useEffect(() => {
    memoriesByStorytellerRef.current = memoriesByStoryteller;
    memoriesByLegacyKeeperRef.current = memoriesByLegacyKeeper;
    onEditMemoryRef.current = onEditMemory;
  }, [memoriesByStoryteller, memoriesByLegacyKeeper, onEditMemory]);

  // Helper function to mark messages as read
  const markConnectionAsRead = React.useCallback(async (connectionId: string) => {
    // 🔥 CRITICAL: Prevent duplicate mark-as-read calls within 1 second
    // This prevents 5x redundant API calls when switching connections
    const now = Date.now();
    const lastCall = lastMarkAsReadTime.current[connectionId] || 0;
    
    if (now - lastCall < markAsReadCooldown) {
      console.log(`⏭️ Skipping mark-as-read (cooldown: ${Math.floor((now - lastCall) / 1000)}s) for ${connectionId}`);
      return { success: true, skipped: true };
    }
    
    lastMarkAsReadTime.current[connectionId] = now;
    
    try {
      const result = await apiClient.markMessagesAsRead(connectionId);
      
      if (result.success && result.updatedCount && result.updatedCount > 0) {
        console.log(`✅ Marked ${result.updatedCount} messages as read - updating local state immediately`);
        
        // Get the memories for this connection using refs to avoid re-render loop
        const connectionMemories = userType === 'keeper' 
          ? (memoriesByStorytellerRef.current[connectionId] || [])
          : (memoriesByLegacyKeeperRef.current[connectionId] || []);
        
        // Find all unread messages from partner and update them locally
        const unreadMessageIds = connectionMemories
          .filter(memory => {
            const isFromPartner = memory.sender !== userType;
            const isMessage = memory.type === 'text' || memory.type === 'voice';
            // ✅ Use stable userId from AuthContext
            const isUnread = !memory.readBy || !memory.readBy.includes(userId);
            return isFromPartner && isMessage && isUnread;
          })
          .map(m => m.id);
        
        console.log(`📝 Updating ${unreadMessageIds.length} messages locally with readBy array`);
        
        // 🔥 CRITICAL FIX: Batch all readBy updates into one state update
        // Calling onEditMemory in a forEach causes React batching issues with stale state
        // Instead, collect all updates and call once with an array
        const editMemoryFn = onEditMemoryRef.current;
        if (editMemoryFn && unreadMessageIds.length > 0 && userId) {
          // Update each memory by adding current user to its readBy array
          unreadMessageIds.forEach(memoryId => {
            const memory = connectionMemories.find(m => m.id === memoryId);
            if (memory) {
              // ✅ Use stable userId from AuthContext
              console.log(`✏️ Updating memory locally: ${memoryId}`, { readBy: [...(memory.readBy || []), userId] });
              const updatedReadBy = [...(memory.readBy || []), userId];
              editMemoryFn(memoryId, { readBy: updatedReadBy }, true); // localOnly = true
            }
          });
        }
        
        // Trigger badge re-calculation by updating timestamp
        const now = Date.now();
        // ✅ Use stable userId from AuthContext
        if (userId) {
          localStorage.setItem(`lastChatRead_${userId}_${connectionId}`, now.toString());
        }
        setLastChatReadTimestamp(now);
        
        console.log(`✅ Local state updated - badges should clear immediately`);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error marking messages as read:', error);
      return { success: false, error: String(error) };
    }
  }, [userId, userType]); // ✅ Use refs to prevent re-render loop when memories change

  // Mark messages as read shortly after viewing chat tab
  // Reduced delay + persist mark-as-read even if user switches away
  useEffect(() => {
    if (activeTab === 'chat') {
      const timer = setTimeout(async () => {
        const activeConnectionId = userType === 'keeper' ? activeStorytellerId : activeLegacyKeeperId;
        if (activeConnectionId) {
          console.log(`📖 Marking all messages as read for connection: ${activeConnectionId}`);
          await markConnectionAsRead(activeConnectionId);
        }
      }, 500); // Reduced to 500ms - fast enough to feel instant, long enough to show badge
      
      // DON'T cancel the timer when switching away - let it complete
      // This ensures messages are marked as read even if user quickly switches tabs
      return () => {
        // Timer will complete even after unmount - this is intentional
      };
    }
  }, [activeTab, userType, activeStorytellerId, activeLegacyKeeperId, markConnectionAsRead]);

  // Mark messages as read when switching connections + show loading state
  const prevConnectionIdRef = useRef<string | undefined>();
  useEffect(() => {
    const currentConnectionId = userType === 'keeper' ? activeStorytellerId : activeLegacyKeeperId;
    
    // Only trigger when connection actually changes
    if (currentConnectionId && currentConnectionId !== prevConnectionIdRef.current && prevConnectionIdRef.current !== undefined) {
      console.log(`🔄 Connection switched to ${currentConnectionId}`);
      
      // Show loading state during switch
      setIsSwitchingConnection(true);
      setConnectionSwitchError(null);
      
      // 🔥 CRITICAL FIX: Only mark as read if user is on CHAT tab
      // If they're on Prompts/Media/Profile tabs, DON'T mark messages as read
      // This prevents the bug where switching connections clears unread badges
      // even though the user hasn't actually viewed the chat messages
      const timer = setTimeout(async () => {
        if (activeTab === 'chat') {
          console.log(`📖 Marking messages as read (Chat tab active): ${currentConnectionId}`);
          try {
            await markConnectionAsRead(currentConnectionId);
            console.log(`✅ Connection switch completed for: ${currentConnectionId}`);
          } catch (error) {
            console.error(`❌ Connection switch failed:`, error);
            setConnectionSwitchError(String(error));
          }
        } else {
          console.log(`ℹ️ Skipping mark-as-read (on ${activeTab} tab, not chat)`);
        }
        setIsSwitchingConnection(false);
      }, 1000); // 1 second delay to allow memories to load and populate state
      
      return () => clearTimeout(timer);
    }
    
    prevConnectionIdRef.current = currentConnectionId;
  }, [activeTab, userType, activeStorytellerId, activeLegacyKeeperId, markConnectionAsRead]);

  // Track previous memory IDs to detect truly NEW messages (not just re-renders)
  const prevMemoryIdsRef = useRef<Set<string>>(new Set());
  const lastNotificationTimeRef = useRef<number>(Date.now());
  
  useEffect(() => {
    // Get current memory IDs
    const currentMemoryIds = new Set(validatedMemories.map(m => m.id));
    
    // Find NEW memories that weren't in the previous set
    const newMemories = validatedMemories.filter(m => 
      !prevMemoryIdsRef.current.has(m.id) &&
      // Only consider messages from the last 10 seconds as "new"
      // This prevents old messages from triggering notifications during initial load/refresh
      m.timestamp.getTime() > (Date.now() - 10000)
    );
    
    // Update the ref for next comparison
    prevMemoryIdsRef.current = currentMemoryIds;
    
    // Process each truly new memory
    newMemories.forEach(newMemory => {
      console.log(`🆕 Detected truly NEW memory:`, {
        id: newMemory.id,
        type: newMemory.type,
        sender: newMemory.sender,
        timestamp: newMemory.timestamp.toISOString(),
        age: Date.now() - newMemory.timestamp.getTime(),
      });
      
      // Skip if this is not from partner
      if (!partnerProfile || newMemory.sender === userType) {
        console.log('   ℹ️ Skipping notification - message from self');
        return;
      }
      
      // Skip if not a relevant message type
      if (newMemory.type !== 'text' && newMemory.type !== 'voice') {
        console.log('   ℹ️ Skipping notification - not a text/voice message');
        return;
      }
      
      // Throttle notifications to prevent spam (max 1 per second)
      const now = Date.now();
      if (now - lastNotificationTimeRef.current < 1000) {
        console.log('   ⏱️ Throttling notification - too soon after last notification');
        return;
      }
      lastNotificationTimeRef.current = now;
      
      // Check if this is a prompt from keeper to teller
      const isPrompt = newMemory.promptQuestion && 
                      newMemory.category === 'Prompts' && 
                      newMemory.tags?.includes('prompt');
      
      // Auto-set activePrompt for tellers when they receive a prompt from keeper
      if (isPrompt && userType === 'teller') {
        setActivePrompt(newMemory.promptQuestion || '');
        console.log('   ✅ Set active prompt for teller:', newMemory.promptQuestion);
      }
      
      // Prepare notification content
      {
        const messagePreview = isPrompt
          ? `💡 ${newMemory.promptQuestion?.substring(0, 80)}${(newMemory.promptQuestion?.length || 0) > 80 ? '...' : ''}`
          : newMemory.type === 'voice'
          ? '🎤 Voice message'
          : newMemory.content.substring(0, 100);
        
        const notificationTitle = isPrompt 
          ? `${partnerProfile.name} sent you a prompt`
          : partnerProfile.name;
        
        const notificationType: 'message' | 'prompt' = isPrompt ? 'prompt' : 'message';
        
        console.log(`   🔔 Showing notification: ${notificationTitle} - ${messagePreview}`);
        console.log(`   🎯 Current activeTab: "${activeTab}" (on chat: ${activeTab === 'chat'})`);
        console.log(`   📱 App focused: ${!document.hidden}`);
        
        // CRITICAL FIX: When app is focused, ALWAYS show in-app toast (regardless of tab)
        // When app is NOT focused, show native notification (if supported)
        if (!document.hidden) {
          // App is focused - show in-app toast notification
          console.log('   📱 App is focused - showing in-app toast notification');
          showToast({
            type: notificationType,
            title: notificationTitle,
            body: messagePreview,
            avatar: partnerProfile.photo || '/apple-touch-icon.png',
            duration: 6000, // Show for 6 seconds (longer than default)
            onClick: async () => {
              // Navigate to chat tab when notification is clicked
              setActiveTab('chat');
              // Trigger scroll to bottom to see the new message
              setShouldScrollChatToBottom(true);
              // If it's a prompt, ensure it's set as active prompt
              if (isPrompt && newMemory.promptQuestion) {
                setActivePrompt(newMemory.promptQuestion);
              }
              
              // Mark as read when clicking in-app toast
              const activeConnectionId = userType === 'keeper' ? activeStorytellerId : activeLegacyKeeperId;
              if (activeConnectionId) {
                await markConnectionAsRead(activeConnectionId);
              }
            },
          });

          // Play subtle notification sound
          try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.15);
          } catch (error) {
            console.log('Could not play notification sound:', error);
          }

          // Vibrate if supported
          if ('vibrate' in navigator) {
            navigator.vibrate([50, 100, 50]);
          }
        } else {
          // App is NOT focused (backgrounded) - show native notification if supported
          console.log('   📱 App is backgrounded - showing native notification');
          showNativeNotificationBanner(
            notificationTitle,
            messagePreview,
            {
              icon: partnerProfile.photo || '/apple-touch-icon.png',
              tag: `message_${newMemory.id}`,
              data: {
                memoryId: newMemory.id,
                sender: newMemory.sender,
                type: isPrompt ? 'prompt' : 'message',
              },
              onClick: async () => {
                // Navigate to chat tab when notification is clicked
                setActiveTab('chat');
                // Trigger scroll to bottom to show new message
                setShouldScrollChatToBottom(true);
                // If it's a prompt, set it as the active prompt
                if (isPrompt && newMemory.promptQuestion) {
                  setActivePrompt(newMemory.promptQuestion);
                }
                
                // Mark messages as read immediately when clicking notification
                const activeConnectionId = userType === 'keeper' ? activeStorytellerId : activeLegacyKeeperId;
                if (activeConnectionId) {
                  await markConnectionAsRead(activeConnectionId);
                }
              },
            }
          );
        }
      }
    });
  }, [validatedMemories, partnerProfile, activeTab, userType, showToast]);

  // Initial scroll to top on mount (for Prompts tab after onboarding)
  useEffect(() => {
    // Scroll to top immediately on mount to ensure Prompts tab starts at top
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  // Handle tab changes and auto-scroll
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    
    // Notify parent component of tab change (for badge logic)
    onActiveTabChange?.(newTab);
    
    // Note: Messages will be marked as read only when user is actively viewing them in ChatTab
    // Don't mark as read immediately when switching tabs - let user see the notification first
    
    // Auto-scroll behavior on tab change
    // Prompts and Media tabs: scroll to top
    // Chat tab: scroll to bottom to see latest messages
    if (newTab === 'chat') {
      // Trigger scroll to bottom when switching to chat
      setShouldScrollChatToBottom(true);
    } else if (newTab === 'prompts') {
      // Scroll to absolute top to ensure Today's Prompt is fully visible
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        // Also scroll the document element to ensure we're at the very top
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }, 150);
    } else if (newTab === 'media') {
      // Scroll to absolute top to ensure search box is visible
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        // Also scroll the document element to ensure we're at the very top
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }, 150);
    }
  };

  const handleNavigateToChat = (prompt: string) => {
    setActivePrompt(prompt);
    setActiveTab('chat');
  };

  return (
    <>
      {/* Extended background container that goes behind notch */}
      <div className="fixed inset-0 -top-20 -z-10" style={{ backgroundColor: 'rgb(245, 249, 233)' }}></div>
      
      <div 
        className="w-full animate-fade-in flex flex-col overflow-hidden" 
        style={{ 
          backgroundColor: 'rgb(245, 249, 233)',
          maxWidth: '100vw',
          margin: '0 auto',
          position: 'relative',
          minHeight: '100vh',
          height: '100vh'
        }}
      >
        {/* Safari Install Banner - Shows on iOS Safari when not installed */}
        <SafariInstallBanner />
        
        {/* Header + Tabs Container - FIXED at top, always visible */}
        <div 
          className="fixed top-0 left-0 right-0 z-50 flex-shrink-0"
          style={{ 
            maxWidth: '100vw',
            backgroundColor: 'rgb(245, 249, 233)'
          }}
        >
          {/* Modern Header */}
          <div className="bg-card/80 backdrop-blur-md sm:border-b sm:border-border/20" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <div className="flex items-center justify-between px-5 sm:px-8 md:px-10 lg:px-12 xl:px-16 py-4 sm:py-5 max-w-4xl mx-auto">
            <div className="flex items-center space-x-3 sm:space-x-5 min-w-0 flex-1">
              <div className="relative flex-shrink-0">
                <SmartAvatar
                  src={partnerProfile?.photo}
                  zoom={partnerProfile?.avatarZoom || 1}
                  rotation={partnerProfile?.avatarRotation || 0}
                  className="w-12 h-12 sm:w-16 sm:h-16 ring-2 sm:ring-3 ring-primary/15 shadow-md"
                  fallback={partnerProfile?.name?.[0] || '?'}
                  fallbackClassName="bg-primary/10 text-primary text-base sm:text-lg font-medium"
                />
                {isConnected && (
                  <div className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 w-4 h-4 sm:w-5 sm:h-5 bg-[#6EDB3F] rounded-full border-2 sm:border-3 border-white shadow-sm"></div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl font-medium truncate" style={{ fontFamily: 'Archivo', letterSpacing: '-0.05em', marginTop: '-2px' }}>
                  {partnerProfile?.name || 'Not Connected'}
                </h1>
                <div className="flex items-center space-x-2 sm:space-x-3 mt-0.5 sm:mt-1">
                  <Badge 
                    variant={isConnected ? "default" : "secondary"} 
                    className={`text-[10px] sm:text-xs font-medium ${isConnected ? 'bg-primary/15 text-primary border-primary/20' : 'bg-muted text-muted-foreground'}`}
                    style={{ fontFamily: 'Inter' }}
                  >
                    {isConnected ? t('connected') : t('notConnected')}
                  </Badge>
                  <span className="text-[10px] sm:text-xs text-muted-foreground max-w-[60px] sm:max-w-[80px] leading-tight truncate" style={{ fontFamily: 'Inter', letterSpacing: '-0.04em' }}>
                    {(() => {
                      // Show count for ACTIVE connection only (not global memories array)
                      const activeConnectionId = activeStorytellerId || activeLegacyKeeperId;
                      if (activeConnectionId) {
                        const activeMemories = memoriesByStoryteller[activeConnectionId] || memoriesByLegacyKeeper[activeConnectionId] || [];
                        return `${activeMemories.length} ${t('memories')}`;
                      }
                      return `${memories.length} ${t('memories')}`;
                    })()}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
              <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full w-10 h-10 sm:w-12 sm:h-12 hover:bg-primary/5">
                    <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
                  </Button>
                </SheetTrigger>
                <SheetContent className="bg-[#36453B] flex flex-col border-l-0 pt-0">
                  {/* Compressed Header */}
                  <SheetHeader className="flex-shrink-0 px-4 sm:px-6 pb-3 sm:pb-4" style={{ marginTop: 'max(1rem, calc(env(safe-area-inset-top) + 0.5rem))' }}>
                    <SheetTitle className="text-white text-base sm:text-lg" style={{ fontFamily: 'Archivo', letterSpacing: '-0.05em' }}>Menu</SheetTitle>
                    <SheetDescription className="text-[#ECF0E2] text-xs sm:text-sm">
                      Settings & connected users
                    </SheetDescription>
                  </SheetHeader>
                  
                  {/* Scrollable menu content */}
                  <div className="flex-1 px-4 sm:px-6 space-y-3 sm:space-y-4 overflow-y-auto">
                    {/* User Account Section */}
                    <div className="pb-3 sm:pb-4 border-b" style={{ borderColor: 'rgba(54, 69, 59, 0.3)' }}>
                      <button
                        onClick={() => {
                          setShowAccountSettings(true);
                          setIsMenuOpen(false);
                        }}
                        className="w-full flex items-center space-x-3 sm:space-x-4 p-2.5 sm:p-3 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <SmartAvatar
                          src={userProfile.photo}
                          zoom={userProfile.avatarZoom || 1}
                          rotation={userProfile.avatarRotation || 0}
                          className="w-14 h-14 sm:w-16 sm:h-16 ring-2 ring-white/20"
                          fallback={userProfile.name[0]}
                          fallbackClassName="bg-[#F1F1F1] text-[#36453B] text-lg sm:text-xl"
                        />
                        <div className="flex-1 text-left min-w-0">
                          <p className="font-medium text-white text-base sm:text-lg truncate" style={{ fontFamily: 'Archivo' }}>
                            {userProfile.name}
                          </p>
                          <p className="text-sm sm:text-base text-[#ECF0E2] truncate" style={{ fontFamily: 'Inter' }}>
                            {userProfile.relationship}
                          </p>
                          <p className="text-xs sm:text-sm text-[#ECF0E2]/70 flex items-center gap-1 mt-1" style={{ fontFamily: 'Inter' }}>
                            <User className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            View Settings
                          </p>
                        </div>
                      </button>
                    </div>

                    {userType === 'keeper' && storytellers.length > 0 && (
                      <div className="space-y-1.5 sm:space-y-2">
                        <h3 className="text-xs sm:text-sm font-medium text-[#ECF0E2] px-1" style={{ fontFamily: 'Inter' }}>
                          Switch Storyteller
                        </h3>
                        <div className="space-y-1 sm:space-y-1.5">
                          {storytellers.map((storyteller) => (
                            <button
                              key={`${storyteller.id}-${badgeVersion}-${getUnreadCountForConnection(storyteller.id)}`}
                              onClick={() => {
                                onSwitchStoryteller?.(storyteller.id);
                                setIsMenuOpen(false);
                                
                                // 🎯 UX FIX: Switch to Prompts tab when changing connections
                                // This ensures Chat tab loads with ALL memories already loaded
                                // Prevents scroll-to-bottom race condition (3 cached → 525 API)
                                setActiveTab('prompts');
                                onActiveTabChange?.('prompts');
                                
                                // Mark messages as read for this connection when switching to them
                                const now = Date.now();
                                // ✅ Use stable userId from AuthContext
                                if (userId) {
                                  localStorage.setItem(`lastChatRead_${userId}_${storyteller.id}`, now.toString());
                                  localStorage.setItem(`lastChatRead_${userId}`, now.toString());
                                }
                                // Update the main chat read timestamp too
                                setLastChatReadTimestamp(now);
                              }}
                              className={`w-full flex items-center space-x-2 sm:space-x-2.5 p-2 sm:p-2.5 rounded-lg transition-colors ${
                                activeStorytellerId === storyteller.id
                                  ? 'bg-primary/10 border border-primary/20'
                                  : 'hover:bg-white/10'
                              }`}
                            >
                              <div className="relative">
                                <SmartAvatar
                                  src={storyteller.photo}
                                  zoom={storyteller.avatarZoom || 1}
                                  rotation={storyteller.avatarRotation || 0}
                                  className="w-9 h-9 sm:w-10 sm:h-10"
                                  fallback={storyteller.name[0]}
                                  fallbackClassName="bg-[#F1F1F1] text-[#36453B] text-sm"
                                />
                                {storyteller.isConnected && (
                                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-[#6EDB3F] rounded-full border-2 border-[#36453B]"></div>
                                )}
                                {/* Unread message badge */}
                                {getUnreadCountForConnection(storyteller.id) > 0 && (
                                  <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-semibold border-2 border-[#36453B] animate-pulse">
                                    {getUnreadCountForConnection(storyteller.id) > 9 ? '9+' : getUnreadCountForConnection(storyteller.id)}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 text-left min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center space-x-1.5 min-w-0 flex-1">
                                    <p className="font-medium text-white text-sm sm:text-base truncate" style={{ fontFamily: 'Archivo' }}>{storyteller.name}</p>
                                    {activeStorytellerId === storyteller.id && (
                                      <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" style={{ color: 'rgb(193, 193, 165)' }} />
                                    )}
                                  </div>
                                  {getUnreadCountForConnection(storyteller.id) > 0 && (
                                    <span className="text-[10px] sm:text-xs font-medium text-white bg-red-500/20 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0" style={{ fontFamily: 'Inter' }}>
                                      {getUnreadCountForConnection(storyteller.id)} new
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs sm:text-sm text-[#ECF0E2] truncate" style={{ fontFamily: 'Inter' }}>
                                  {storyteller.lastMessage || storyteller.relationship}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {userType === 'teller' && legacyKeepers.length > 0 && (
                      <div className="space-y-1.5 sm:space-y-2 pb-2 sm:pb-3 border-b" style={{ borderColor: 'rgba(54, 69, 59, 0.3)' }}>
                        <h3 className="text-xs sm:text-sm font-medium text-[#ECF0E2] px-1" style={{ fontFamily: 'Inter' }}>
                          Connected Legacy Keepers
                        </h3>
                        <div className="space-y-1 sm:space-y-1.5">
                          {legacyKeepers.map((legacyKeeper) => (
                            <button
                              key={`${legacyKeeper.id}-${badgeVersion}-${getUnreadCountForConnection(legacyKeeper.id)}`}
                              onClick={() => {
                                onSwitchLegacyKeeper?.(legacyKeeper.id);
                                setIsMenuOpen(false);
                                
                                // 🎯 UX FIX: Switch to Prompts tab when changing connections
                                // This ensures Chat tab loads with ALL memories already loaded
                                // Prevents scroll-to-bottom race condition (3 cached → 525 API)
                                setActiveTab('prompts');
                                onActiveTabChange?.('prompts');
                                
                                // Mark messages as read for this connection when switching to them
                                const now = Date.now();
                                // ✅ Use stable userId from AuthContext
                                if (userId) {
                                  localStorage.setItem(`lastChatRead_${userId}_${legacyKeeper.id}`, now.toString());
                                  localStorage.setItem(`lastChatRead_${userId}`, now.toString());
                                }
                                // Update the main chat read timestamp too
                                setLastChatReadTimestamp(now);
                              }}
                              className={`w-full flex items-center space-x-2 sm:space-x-2.5 p-2 sm:p-2.5 rounded-lg transition-colors ${
                                activeLegacyKeeperId === legacyKeeper.id
                                  ? 'bg-primary/10 border border-primary/20'
                                  : 'hover:bg-white/10'
                              }`}
                            >
                              <div className="relative">
                                <SmartAvatar
                                  src={legacyKeeper.photo}
                                  zoom={legacyKeeper.avatarZoom || 1}
                                  rotation={legacyKeeper.avatarRotation || 0}
                                  className="w-9 h-9 sm:w-10 sm:h-10"
                                  fallback={legacyKeeper.name[0]}
                                  fallbackClassName="bg-[#F1F1F1] text-[#36453B] text-sm"
                                />
                                {legacyKeeper.isConnected && (
                                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-[#6EDB3F] rounded-full border-2 border-[#36453B]"></div>
                                )}
                                {/* Unread message badge */}
                                {getUnreadCountForConnection(legacyKeeper.id) > 0 && (
                                  <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-semibold border-2 border-[#36453B] animate-pulse">
                                    {getUnreadCountForConnection(legacyKeeper.id) > 9 ? '9+' : getUnreadCountForConnection(legacyKeeper.id)}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 text-left min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center space-x-1.5 min-w-0 flex-1">
                                    <p className="font-medium text-white text-sm sm:text-base truncate" style={{ fontFamily: 'Archivo' }}>{legacyKeeper.name}</p>
                                    {activeLegacyKeeperId === legacyKeeper.id && (
                                      <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" style={{ color: 'rgb(193, 193, 165)' }} />
                                    )}
                                  </div>
                                  {getUnreadCountForConnection(legacyKeeper.id) > 0 && (
                                    <span className="text-[10px] sm:text-xs font-medium text-white bg-red-500/20 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0" style={{ fontFamily: 'Inter' }}>
                                      {getUnreadCountForConnection(legacyKeeper.id)} new
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs sm:text-sm text-[#ECF0E2] truncate" style={{ fontFamily: 'Inter' }}>
                                  {legacyKeeper.lastMessage || legacyKeeper.relationship}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Additional Menu Items - Compressed */}
                    <div className="space-y-0.5 sm:space-y-1">
                      {/* Keepers: Create Invitation + Manage Invitations + Connections */}
                      {userType === 'keeper' && (
                        <>
                          <Button 
                            variant="ghost" 
                            className="w-full justify-start text-white hover:bg-white/10 hover:text-[#F1F1F1] h-9 sm:h-10 text-sm"
                            onClick={() => {
                              setIsMenuOpen(false);
                              setShowInvitationDialog(true);
                            }}
                          >
                            <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
                            {t('createInvitation')}
                          </Button>
                          
                          <Button 
                            variant="ghost" 
                            className="w-full justify-start text-white hover:bg-white/10 hover:text-[#F1F1F1] h-9 sm:h-10 text-sm"
                            onClick={() => {
                              setShowInvitationManagement(true);
                              setIsMenuOpen(false);
                            }}
                          >
                            <List className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
                            Manage Invitations
                          </Button>

                          <Button 
                            variant="ghost" 
                            className="w-full justify-start text-white hover:bg-white/10 hover:text-[#F1F1F1] h-9 sm:h-10 text-sm"
                            onClick={() => {
                              setShowTwilioTest(true);
                              setIsMenuOpen(false);
                            }}
                          >
                            <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
                            Test SMS
                          </Button>

                          <Button 
                            variant="ghost" 
                            className="w-full justify-start text-white hover:bg-white/10 hover:text-[#F1F1F1] h-9 sm:h-10 text-sm relative"
                            onClick={() => {
                              setShowKeeperConnections(true);
                              setIsMenuOpen(false);
                            }}
                          >
                            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
                            Connections
                            {pendingRequestsCount > 0 && (
                              <span className="ml-auto inline-flex items-center justify-center w-5 h-5 text-[10px] font-semibold bg-red-500 text-white rounded-full">
                                {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                              </span>
                            )}
                          </Button>
                        </>
                      )}

                      {/* Tellers: Unified Connections Page (Requests + Active) */}
                      {userType === 'teller' && (
                        <Button 
                          variant="ghost" 
                          className="w-full justify-start text-white hover:bg-white/10 hover:text-[#F1F1F1] h-9 sm:h-10 text-sm relative"
                          onClick={() => {
                            setShowTellerConnections(true);
                            setIsMenuOpen(false);
                          }}
                        >
                          <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
                          Connections
                          {pendingRequestsCount > 0 && (
                            <span className="ml-auto inline-flex items-center justify-center w-5 h-5 text-[10px] font-semibold bg-red-500 text-white rounded-full">
                              {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                            </span>
                          )}
                        </Button>
                      )}
                      
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start text-white hover:bg-white/10 hover:text-[#F1F1F1] h-9 sm:h-10 text-sm"
                        onClick={() => {
                          setShowNotifications(true);
                          setIsMenuOpen(false);
                        }}
                      >
                        <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
                        {t('notifications')}
                      </Button>
                      
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start text-white hover:bg-white/10 hover:text-[#F1F1F1] h-9 sm:h-10 text-sm"
                        onClick={() => {
                          setShowPrivacySecurity(true);
                          setIsMenuOpen(false);
                        }}
                      >
                        <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
                        {t('privacy')}
                      </Button>
                      
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start text-white hover:bg-white/10 hover:text-[#F1F1F1] h-9 sm:h-10 text-sm"
                        onClick={() => {
                          setShowStorageData(true);
                          setIsMenuOpen(false);
                        }}
                      >
                        <Database className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
                        {t('storageData')}
                      </Button>
                      
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start text-white hover:bg-white/10 hover:text-[#F1F1F1] h-9 sm:h-10 text-sm"
                        onClick={() => {
                          setShowHelpFeedback(true);
                          setIsMenuOpen(false);
                        }}
                      >
                        <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
                        {t('help')}
                      </Button>
                      
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start text-white hover:bg-white/10 hover:text-[#F1F1F1] h-9 sm:h-10 text-sm"
                        onClick={() => {
                          signout();
                          setIsMenuOpen(false);
                        }}
                      >
                        <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
                        {t('logout')}
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
          </div>

          {/* Tab Navigation Bar - Below header, part of sticky container */}
          <div className="bg-card/80 backdrop-blur-md border-b border-border/20">
            <div className="grid grid-cols-3 gap-1.5 p-2 sm:p-2.5 max-w-4xl mx-auto px-5 sm:px-8 md:px-10 lg:px-12 xl:px-16">
              <button
                onClick={() => handleTabChange('prompts')}
                className={`flex items-center justify-center gap-2 rounded-lg transition-all duration-200 py-2.5 sm:py-3 text-sm font-semibold ${
                  activeTab === 'prompts' ? 'shadow-sm' : 'hover:bg-muted/50'
                }`}
                style={{ 
                  fontFamily: 'Inter',
                  ...(activeTab === 'prompts' ? { backgroundColor: 'rgb(54, 69, 59)', color: 'rgb(255, 255, 255)' } : {})
                }}
              >
                <Zap className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                <span className="hidden sm:inline">{t('prompts')}</span>
              </button>
              <button
                onClick={() => handleTabChange('chat')}
                className={`flex items-center justify-center gap-2 rounded-lg transition-all duration-200 py-2.5 sm:py-3 text-sm font-semibold relative ${
                  activeTab === 'chat' ? 'shadow-sm' : 'hover:bg-muted/50'
                }`}
                style={{ 
                  fontFamily: 'Inter',
                  ...(activeTab === 'chat' ? { backgroundColor: 'rgb(54, 69, 59)', color: 'rgb(255, 255, 255)' } : {})
                }}
              >
                <MessageCircle className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                <span className="hidden sm:inline">{t('chat')}</span>
                {unreadMessageCount > 0 && activeTab !== 'chat' && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold bg-red-500 text-white rounded-full border-2 border-background animate-pulse">
                    {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => handleTabChange('media')}
                className={`flex items-center justify-center gap-2 rounded-lg transition-all duration-200 py-2.5 sm:py-3 text-sm font-semibold ${
                  activeTab === 'media' ? 'shadow-sm' : 'hover:bg-muted/50'
                }`}
                style={{ 
                  fontFamily: 'Inter',
                  ...(activeTab === 'media' ? { backgroundColor: 'rgb(54, 69, 59)', color: 'rgb(255, 255, 255)' } : {})
                }}
              >
                <Image className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                <span className="hidden sm:inline">{t('mediaLibrary')}</span>
              </button>
            </div>
          </div>
        </div>
        {/* End Header + Tabs Container */}

        {/* Tab Content - Add top padding to account for fixed header */}
        {isSwitchingConnection ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">Switching connection...</p>
            </div>
          </div>
        ) : connectionSwitchError ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="max-w-md bg-destructive/10 border border-destructive rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="h-4 w-4 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="font-semibold text-destructive">Connection Error</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{connectionSwitchError}</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.location.reload()}
              >
                Reload App
              </Button>
            </div>
          </div>
        ) : (
          <div 
            className="flex-1 flex flex-col overflow-hidden dashboard-content"
            style={{ 
              minHeight: 0
            }}
          >
            {activeTab === 'prompts' && (
              <div className="flex-1 overflow-y-auto overscroll-contain pt-safe-top" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
              <div className="px-4 sm:px-6 pb-8 pt-0">
              <PromptsTab 
                userType={userType}
                partnerName={partnerProfile?.name}
                onAddMemory={onAddMemory}
                memories={validatedMemories}
                onNavigateToChat={handleNavigateToChat}
              />
              </div>
            </div>
          )}
          
          {activeTab === 'chat' && (
            <div className="m-0 p-0 flex-1 flex flex-col" style={{ minHeight: 0 }}>
              <ChatTab 
                userType={userType}
                userProfile={userProfile}
                partnerProfile={partnerProfile}
                memories={validatedMemories}
                onAddMemory={onAddMemory}
                activePrompt={activePrompt}
                onClearPrompt={() => setActivePrompt(null)}
                onEditMemory={onEditMemory}
                onDeleteMemory={onDeleteMemory}
                shouldScrollToBottom={shouldScrollChatToBottom}
                onScrollToBottomComplete={() => setShouldScrollChatToBottom(false)}
              />
            </div>
          )}
          
          {activeTab === 'media' && (
            <div className="flex-1 flex flex-col overflow-hidden px-4 sm:px-6">
              <MediaLibraryTab 
                memories={validatedMemories}
                userType={userType}
                userAge={userProfile.age || 20}
                partnerBirthday={partnerProfile?.birthday}
                onEditMemory={onEditMemory}
                onDeleteMemory={onDeleteMemory}
              />
            </div>
          )}
          </div>
        )}


        {/* Account Settings Dialog */}
        <AccountSettings
          isOpen={showAccountSettings}
          onClose={() => setShowAccountSettings(false)}
          userProfile={userProfile}
          onUpdateProfile={onUpdateProfile}
        />

        {/* Notifications Dialog */}
        <Notifications
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
          userId={userId} // ✅ Use stable userId from AuthContext
        />

        {/* Privacy Security Dialog */}
        <PrivacySecurity
          isOpen={showPrivacySecurity}
          onClose={() => setShowPrivacySecurity(false)}
          userProfile={userProfile}
          onUpdateProfile={onUpdateProfile}
          onLogout={signout}
        />

        {/* Storage Data Dialog */}
        <StorageData
          isOpen={showStorageData}
          onClose={() => setShowStorageData(false)}
          userId={userId} // ✅ Use stable userId from AuthContext
        />

        {/* Help Feedback Dialog */}
        <HelpFeedback
          isOpen={showHelpFeedback}
          onClose={() => setShowHelpFeedback(false)}
          userId={userId} // For diagnostics
        />

        {/* Invitation Dialog */}
        <InvitationDialog
          isOpen={showInvitationDialog}
          onClose={() => setShowInvitationDialog(false)}
          userType={userType}
          onCreateInvitation={onCreateInvitation}
          onConnectViaEmail={onConnectViaEmail}
          onAcceptInvitation={onAcceptInvitation}
        />

        {/* Invitation Management Dialog (Keepers only) */}
        {userType === 'keeper' && (
          <InvitationManagement
            isOpen={showInvitationManagement}
            onClose={() => setShowInvitationManagement(false)}
            onCreateNew={() => setShowInvitationDialog(true)}
          />
        )}

        {/* Twilio SMS Test Dialog (Keepers only) */}
        {userType === 'keeper' && (
          <TwilioTestDialog
            isOpen={showTwilioTest}
            onClose={() => setShowTwilioTest(false)}
          />
        )}

        {/* Keeper Connections (Unified Requests + Active) */}
        {userType === 'keeper' && (
          <KeeperConnections
            isOpen={showKeeperConnections}
            onClose={() => {
              setShowKeeperConnections(false);
              loadPendingRequestsCount();
            }}
            onConnectionsChanged={() => {
              // Reload the page to refresh connections
              window.location.reload();
            }}
            pendingCount={pendingRequestsCount}
          />
        )}

        {/* Teller Connections (Unified Requests + Active) */}
        <TellerConnections
          isOpen={showTellerConnections}
          onClose={() => {
            setShowTellerConnections(false);
            loadPendingRequestsCount();
          }}
          onConnectionsChanged={() => {
            // Reload the page to refresh connections
            window.location.reload();
          }}
          pendingCount={pendingRequestsCount}
        />

        {/* In-App Toast Notifications - Shows notifications even when on chat tab */}
        <InAppToastContainer
          notifications={toasts}
          onClose={closeToast}
          position="top-center"
        />
      </div>
    </>
  );
}
