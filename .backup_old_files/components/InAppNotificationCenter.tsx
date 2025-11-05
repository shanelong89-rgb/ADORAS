/**
 * In-App Notification Center
 * Primary notification system - works everywhere (iOS, Android, Desktop)
 * Push notifications are supplemental to this system
 */

import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from './ui/sheet';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { 
  Bell, 
  MessageSquare, 
  Image as ImageIcon, 
  FileText, 
  Heart,
  Check,
  CheckCheck,
  Trash2,
  X
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export interface InAppNotification {
  id: string;
  type: 'message' | 'memory' | 'prompt-response' | 'milestone';
  title: string;
  body: string;
  timestamp: Date;
  read: boolean;
  data?: {
    memoryId?: string;
    senderId?: string;
    senderName?: string;
    mediaType?: 'photo' | 'video' | 'voice' | 'document';
    thumbnailUrl?: string;
  };
}

interface InAppNotificationCenterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notifications: InAppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onNotificationClick: (notification: InAppNotification) => void;
}

export function InAppNotificationCenter({
  open,
  onOpenChange,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onClearAll,
  onNotificationClick,
}: InAppNotificationCenterProps) {
  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: InAppNotification['type']) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="w-5 h-5" />;
      case 'memory':
        return <ImageIcon className="w-5 h-5" />;
      case 'prompt-response':
        return <FileText className="w-5 h-5" />;
      case 'milestone':
        return <Heart className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getIconColor = (type: InAppNotification['type']) => {
    switch (type) {
      case 'message':
        return 'text-blue-600 bg-blue-50 dark:bg-blue-950';
      case 'memory':
        return 'text-purple-600 bg-purple-50 dark:bg-purple-950';
      case 'prompt-response':
        return 'text-green-600 bg-green-50 dark:bg-green-950';
      case 'milestone':
        return 'text-pink-600 bg-pink-50 dark:bg-pink-950';
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-950';
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SheetTitle>Notifications</SheetTitle>
              {unreadCount > 0 && (
                <Badge variant="default" className="bg-[#36453B]">
                  {unreadCount}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <SheetDescription>
            Stay updated with your family's memories
          </SheetDescription>
        </SheetHeader>

        {/* Action Buttons */}
        {notifications.length > 0 && (
          <div className="flex gap-2 p-4 border-b bg-muted/30">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={onMarkAllAsRead}
                className="flex-1"
              >
                <CheckCheck className="w-4 h-4 mr-2" />
                Mark all read
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onClearAll}
              className="flex-1"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear all
            </Button>
          </div>
        )}

        {/* Notifications List */}
        <ScrollArea className="flex-1 h-[calc(100vh-180px)]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-2">No notifications yet</h3>
              <p className="text-sm text-muted-foreground">
                You'll see updates here when your family shares memories
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                    !notification.read ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                  }`}
                  onClick={() => {
                    onNotificationClick(notification);
                    if (!notification.read) {
                      onMarkAsRead(notification.id);
                    }
                  }}
                >
                  <div className="flex gap-3">
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getIconColor(notification.type)}`}>
                      {getIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className={`text-sm ${!notification.read ? 'font-semibold' : 'font-medium'}`}>
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1" />
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {notification.body}
                      </p>

                      {/* Thumbnail if available */}
                      {notification.data?.thumbnailUrl && (
                        <div className="mb-2">
                          <img
                            src={notification.data.thumbnailUrl}
                            alt="Preview"
                            className="w-full h-24 object-cover rounded"
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                        </span>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(notification.id);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Custom hook to manage in-app notifications
 */
export function useInAppNotifications(userId: string) {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Load notifications from localStorage on mount
    const stored = localStorage.getItem(`notifications_${userId}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const withDates = parsed.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp),
        }));
        setNotifications(withDates);
        updateUnreadCount(withDates);
      } catch (error) {
        console.error('Error loading notifications:', error);
      }
    }
  }, [userId]);

  const updateUnreadCount = (notifs: InAppNotification[]) => {
    const count = notifs.filter(n => !n.read).length;
    setUnreadCount(count);
    
    // Update badge count in document title
    if (count > 0) {
      document.title = `(${count}) Adoras`;
    } else {
      document.title = 'Adoras';
    }
  };

  const saveNotifications = (notifs: InAppNotification[]) => {
    setNotifications(notifs);
    updateUnreadCount(notifs);
    localStorage.setItem(`notifications_${userId}`, JSON.stringify(notifs));
  };

  const addNotification = (notification: Omit<InAppNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: InAppNotification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      read: false,
    };

    const updated = [newNotification, ...notifications];
    
    // Keep only last 100 notifications
    if (updated.length > 100) {
      updated.splice(100);
    }
    
    saveNotifications(updated);

    // Show iOS native notification banner (like iMessage)
    showNativeNotification(newNotification);

    // Play notification sound
    playNotificationSound();
    
    // Vibrate if supported
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 100, 50]);
    }

    return newNotification;
  };

  const showNativeNotification = (notification: InAppNotification) => {
    // Check if native notifications are supported and permitted
    if (!('Notification' in window)) {
      return;
    }

    // Don't show if permission not granted
    if (Notification.permission !== 'granted') {
      return;
    }

    // Don't show if app is currently focused (user is already looking at it)
    if (document.hasFocus()) {
      return;
    }

    try {
      // Create notification with iMessage-style appearance
      const options: NotificationOptions = {
        body: notification.body,
        icon: '/apple-touch-icon.png', // App icon
        badge: '/apple-touch-icon-120.png', // Badge icon
        tag: notification.id, // Prevents duplicate notifications
        requireInteraction: false, // Auto-dismiss after a few seconds
        silent: false, // Play system notification sound
        vibrate: [50, 100, 50], // Vibration pattern
        data: {
          notificationId: notification.id,
          type: notification.type,
          ...notification.data,
        },
      };

      // Add image/thumbnail if available (for messages with media)
      if (notification.data?.thumbnailUrl) {
        options.image = notification.data.thumbnailUrl;
      }

      // Create the notification
      const nativeNotif = new Notification(notification.title, options);

      // Handle notification click - focus the app
      nativeNotif.onclick = (event) => {
        event.preventDefault();
        window.focus();
        
        // Mark as read
        markAsRead(notification.id);
        
        // Close the notification
        nativeNotif.close();
      };

      // Auto-close after 5 seconds (like iOS notifications)
      setTimeout(() => {
        nativeNotif.close();
      }, 5000);

    } catch (error) {
      console.log('Could not show native notification:', error);
    }
  };

  const markAsRead = (id: string) => {
    const updated = notifications.map(n =>
      n.id === id ? { ...n, read: true } : n
    );
    saveNotifications(updated);
  };

  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    saveNotifications(updated);
  };

  const deleteNotification = (id: string) => {
    const updated = notifications.filter(n => n.id !== id);
    saveNotifications(updated);
  };

  const clearAll = () => {
    saveNotifications([]);
  };

  const playNotificationSound = () => {
    // Create a subtle notification sound using Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  };

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  };
}
