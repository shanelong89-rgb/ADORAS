/**
 * PWA Detection Utilities
 * Detects if app is running as PWA or web browser
 * Determines push notification capability
 */

/**
 * Check if app is running in PWA (standalone) mode
 * Works on iOS, Android, and Desktop
 */
export function isPWAMode(): boolean {
  // Check display-mode media query (works on all platforms)
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  
  // iOS standalone detection (legacy)
  if ((window.navigator as any).standalone === true) {
    return true;
  }
  
  // Android TWA (Trusted Web Activity) detection
  if (document.referrer.includes('android-app://')) {
    return true;
  }
  
  // Check if running in fullscreen mode (some PWAs use this)
  if (window.matchMedia('(display-mode: fullscreen)').matches) {
    return true;
  }
  
  return false;
}

/**
 * Check if device is iOS
 */
export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/**
 * Check if device is Android
 */
export function isAndroid(): boolean {
  return /Android/.test(navigator.userAgent);
}

/**
 * Check if browser is Safari
 */
export function isSafari(): boolean {
  return /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
}

/**
 * Check if device can receive push notifications
 * 
 * Rules:
 * - iOS Safari web: NO (only works in PWA mode)
 * - iOS PWA: YES
 * - Android web: YES (but only when browser is open)
 * - Android PWA: YES
 * - Desktop web: YES (but only when browser is open)
 * - Desktop PWA: YES
 */
export function canReceivePushNotifications(): boolean {
  const isPWA = isPWAMode();
  const iOS = isIOS();
  
  // iOS requires PWA mode for push notifications
  if (iOS && !isPWA) {
    return false;
  }
  
  // Check if browser supports push notifications
  const hasPushSupport = 'Notification' in window && 
                         'serviceWorker' in navigator && 
                         'PushManager' in window;
  
  return hasPushSupport;
}

/**
 * Get display mode (standalone, fullscreen, minimal-ui, browser)
 */
export function getDisplayMode(): 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser' {
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return 'standalone';
  }
  if (window.matchMedia('(display-mode: fullscreen)').matches) {
    return 'fullscreen';
  }
  if (window.matchMedia('(display-mode: minimal-ui)').matches) {
    return 'minimal-ui';
  }
  return 'browser';
}

/**
 * Check if push notifications are supported but limited
 * (i.e., only work when browser is open)
 */
export function isPushNotificationLimited(): boolean {
  const isPWA = isPWAMode();
  const canPush = canReceivePushNotifications();
  
  // If PWA, notifications are fully supported (not limited)
  if (isPWA) {
    return false;
  }
  
  // If can receive push but not in PWA mode, it's limited
  // (only works when browser is open)
  return canPush;
}

/**
 * Get user-friendly notification capability message
 */
export function getNotificationCapabilityMessage(): {
  canReceive: boolean;
  isLimited: boolean;
  message: string;
  actionLabel?: string;
} {
  const isPWA = isPWAMode();
  const canPush = canReceivePushNotifications();
  const iOS = isIOS();
  
  // iOS web - no push support
  if (iOS && !isPWA) {
    return {
      canReceive: false,
      isLimited: false,
      message: 'Push notifications are only available when Adoras is installed as an app on iOS.',
      actionLabel: 'Install App',
    };
  }
  
  // PWA - full support
  if (isPWA) {
    return {
      canReceive: true,
      isLimited: false,
      message: 'Push notifications work even when the app is closed.',
    };
  }
  
  // Web with push support (desktop/Android)
  if (canPush) {
    return {
      canReceive: true,
      isLimited: true,
      message: 'Push notifications work only when your browser is open.',
      actionLabel: 'Install App for Full Support',
    };
  }
  
  // No push support
  return {
    canReceive: false,
    isLimited: false,
    message: 'Push notifications are not supported in this browser.',
  };
}

/**
 * Check if app can be installed (PWA installable)
 */
export function canInstallPWA(): boolean {
  // If already in PWA mode, can't install again
  if (isPWAMode()) {
    return false;
  }
  
  // Check if beforeinstallprompt event is available
  // This is set by PWAInstallPrompt component
  return !!(window as any).deferredPrompt;
}

/**
 * Log diagnostic information about PWA status
 */
export function logPWADiagnostics(): void {
  console.log('📱 PWA Diagnostics:', {
    isPWA: isPWAMode(),
    displayMode: getDisplayMode(),
    isIOS: isIOS(),
    isAndroid: isAndroid(),
    isSafari: isSafari(),
    canReceivePush: canReceivePushNotifications(),
    isPushLimited: isPushNotificationLimited(),
    canInstall: canInstallPWA(),
    userAgent: navigator.userAgent,
    standalone: (window.navigator as any).standalone,
    displayModeStandalone: window.matchMedia('(display-mode: standalone)').matches,
  });
}
