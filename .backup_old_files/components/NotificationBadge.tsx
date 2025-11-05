/**
 * Notification Badge Component
 * Custom in-app badge indicator - works everywhere, no PWA/iOS limitations
 * Shows unread count on navigation items and buttons
 */

import React from 'react';
import { Bell } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface NotificationBadgeProps {
  count: number;
  onClick: () => void;
  variant?: 'icon' | 'button' | 'bell';
  size?: 'sm' | 'md' | 'lg';
  showZero?: boolean;
  pulse?: boolean;
}

export function NotificationBadge({
  count,
  onClick,
  variant = 'bell',
  size = 'md',
  showZero = false,
  pulse = true,
}: NotificationBadgeProps) {
  const hasNotifications = count > 0;
  const displayCount = count > 99 ? '99+' : count.toString();

  const sizeClasses = {
    sm: 'w-4 h-4 text-[10px]',
    md: 'w-5 h-5 text-xs',
    lg: 'w-6 h-6 text-sm',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={onClick}
        className="relative inline-flex items-center justify-center focus:outline-none"
        aria-label={`${count} unread notifications`}
      >
        <Bell className={iconSizes[size]} />
        {(hasNotifications || showZero) && (
          <span
            className={`
              absolute -top-1 -right-1 
              ${sizeClasses[size]}
              bg-red-500 text-white 
              rounded-full flex items-center justify-center
              font-semibold
              ${pulse && hasNotifications ? 'animate-pulse' : ''}
            `}
          >
            {displayCount}
          </span>
        )}
      </button>
    );
  }

  if (variant === 'button') {
    return (
      <Button
        variant="outline"
        size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'default'}
        onClick={onClick}
        className="relative"
      >
        <Bell className={`${iconSizes[size]} mr-2`} />
        Notifications
        {(hasNotifications || showZero) && (
          <Badge
            variant="default"
            className={`
              ml-2 
              ${sizeClasses[size]}
              min-w-[${sizeClasses[size]}]
              bg-red-500 hover:bg-red-600
              ${pulse && hasNotifications ? 'animate-pulse' : ''}
            `}
          >
            {displayCount}
          </Badge>
        )}
      </Button>
    );
  }

  // variant === 'bell' (default)
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className="relative"
      aria-label={`${count} unread notifications`}
    >
      <Bell className={iconSizes[size]} />
      {(hasNotifications || showZero) && (
        <span
          className={`
            absolute top-0 right-0
            ${sizeClasses[size]}
            bg-red-500 text-white 
            rounded-full flex items-center justify-center
            font-semibold text-[10px]
            border-2 border-background
            ${pulse && hasNotifications ? 'animate-pulse' : ''}
          `}
        >
          {displayCount}
        </span>
      )}
    </Button>
  );
}

/**
 * Mini Badge - For use in navigation items or tabs
 */
interface MiniBadgeProps {
  count: number;
  pulse?: boolean;
}

export function NotificationMiniBadge({ count, pulse = true }: MiniBadgeProps) {
  if (count === 0) return null;

  const displayCount = count > 9 ? '9+' : count.toString();

  return (
    <span
      className={`
        inline-flex items-center justify-center
        w-5 h-5 text-[10px] font-semibold
        bg-red-500 text-white rounded-full
        ${pulse ? 'animate-pulse' : ''}
      `}
    >
      {displayCount}
    </span>
  );
}

/**
 * Dot Indicator - Subtle indicator for smaller UI elements
 */
interface DotIndicatorProps {
  show: boolean;
  pulse?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function NotificationDot({ show, pulse = true, size = 'md' }: DotIndicatorProps) {
  if (!show) return null;

  const sizeClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
  };

  return (
    <span
      className={`
        inline-block rounded-full bg-red-500
        ${sizeClasses[size]}
        ${pulse ? 'animate-pulse' : ''}
      `}
      aria-label="Unread notification indicator"
    />
  );
}

/**
 * Tab Badge - For use in tab navigation
 */
interface TabBadgeProps {
  count: number;
  label: string;
}

export function TabNotificationBadge({ count, label }: TabBadgeProps) {
  return (
    <div className="flex items-center gap-2">
      <span>{label}</span>
      {count > 0 && (
        <Badge
          variant="default"
          className="bg-red-500 hover:bg-red-600 min-w-[20px] h-5 px-1.5 animate-pulse"
        >
          {count > 9 ? '9+' : count}
        </Badge>
      )}
    </div>
  );
}
