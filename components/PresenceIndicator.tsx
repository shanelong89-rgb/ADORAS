/**
 * Presence Indicator Component - Phase 5
 * Shows real-time presence status of connected users
 */

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface PresenceUser {
  userId: string;
  userName: string;
  userPhoto?: string;
  online: boolean;
  lastSeen?: string;
}

interface PresenceIndicatorProps {
  users: PresenceUser[];
  currentUserId: string;
  showStatus?: boolean;
  size?: 'sm' | 'md' | 'lg';
  maxDisplay?: number;
}

export function PresenceIndicator({
  users,
  currentUserId,
  showStatus = true,
  size = 'md',
  maxDisplay = 3,
}: PresenceIndicatorProps) {
  // Filter out current user and get online users
  const otherUsers = users.filter(u => u.userId !== currentUserId);
  const onlineUsers = otherUsers.filter(u => u.online);
  const displayUsers = onlineUsers.slice(0, maxDisplay);
  const remainingCount = onlineUsers.length - maxDisplay;

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const dotSizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
  };

  if (onlineUsers.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {/* Online users avatars */}
      <div className="flex -space-x-2">
        <AnimatePresence mode="popLayout">
          {displayUsers.map((user) => (
            <motion.div
              key={user.userId}
              initial={{ opacity: 0, scale: 0.8, x: -10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="relative">
                      <Avatar className={`${sizeClasses[size]} ring-2 ring-background`}>
                        <AvatarImage src={user.userPhoto} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {user.userName[0]}
                        </AvatarFallback>
                      </Avatar>
                      {/* Online indicator */}
                      <div
                        className={`absolute -bottom-0.5 -right-0.5 ${dotSizeClasses[size]} bg-green-500 rounded-full border-2 border-background`}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-sm">{user.userName} is online</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Show remaining count */}
        {remainingCount > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`${sizeClasses[size]} rounded-full bg-muted border-2 border-background flex items-center justify-center`}
          >
            <span className="text-xs font-medium text-muted-foreground">
              +{remainingCount}
            </span>
          </motion.div>
        )}
      </div>

      {/* Status text */}
      {showStatus && (
        <motion.div
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-1.5"
        >
          <Wifi className="w-3 h-3 text-green-500" />
          <span className="text-xs text-muted-foreground">
            {onlineUsers.length === 1
              ? `${onlineUsers[0].userName} is online`
              : `${onlineUsers.length} people online`}
          </span>
        </motion.div>
      )}
    </div>
  );
}

/**
 * Simple presence dot indicator
 */
interface PresenceDotProps {
  online: boolean;
  size?: 'sm' | 'md' | 'lg';
  showPulse?: boolean;
}

export function PresenceDot({ online, size = 'md', showPulse = true }: PresenceDotProps) {
  const dotSizes = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
  };

  return (
    <div className="relative inline-flex">
      <div
        className={`${dotSizes[size]} rounded-full ${
          online ? 'bg-green-500' : 'bg-gray-400'
        }`}
      />
      {online && showPulse && (
        <div
          className={`absolute inset-0 ${dotSizes[size]} rounded-full bg-green-500 animate-ping opacity-75`}
        />
      )}
    </div>
  );
}

/**
 * Typing indicator
 */
interface TypingIndicatorProps {
  userName: string;
  userPhoto?: string;
}

export function TypingIndicator({ userName, userPhoto }: TypingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg"
    >
      <Avatar className="w-6 h-6">
        <AvatarImage src={userPhoto} />
        <AvatarFallback className="bg-primary/10 text-primary text-xs">
          {userName[0]}
        </AvatarFallback>
      </Avatar>
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">{userName} is typing</span>
        <div className="flex gap-0.5">
          <motion.div
            className="w-1 h-1 bg-muted-foreground rounded-full"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0 }}
          />
          <motion.div
            className="w-1 h-1 bg-muted-foreground rounded-full"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
          />
          <motion.div
            className="w-1 h-1 bg-muted-foreground rounded-full"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
          />
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Connection status badge
 */
interface ConnectionStatusProps {
  isConnected: boolean;
  reconnectAttempts?: number;
}

export function ConnectionStatus({ isConnected, reconnectAttempts = 0 }: ConnectionStatusProps) {
  if (isConnected) {
    return (
      <Badge variant="outline" className="gap-1.5 border-green-500/20 bg-green-500/10 text-green-700 dark:text-green-400">
        <Wifi className="w-3 h-3" />
        <span className="text-xs">Connected</span>
      </Badge>
    );
  }

  if (reconnectAttempts > 0) {
    return (
      <Badge variant="outline" className="gap-1.5 border-yellow-500/20 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">
        <WifiOff className="w-3 h-3 animate-pulse" />
        <span className="text-xs">Reconnecting... ({reconnectAttempts})</span>
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1.5 border-gray-500/20 bg-gray-500/10 text-gray-700 dark:text-gray-400">
      <WifiOff className="w-3 h-3" />
      <span className="text-xs">Offline</span>
    </Badge>
  );
}
