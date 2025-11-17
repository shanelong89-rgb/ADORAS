// PWA Installation and Service Worker Registration Utility

export interface PWAInstallPrompt {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface PWAStatus {
  isInstallable: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  canInstall: boolean;
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
}

class PWAInstaller {
  private deferredPrompt: PWAInstallPrompt | null = null;
  private installListeners: Array<(canInstall: boolean) => void> = [];
  private updateListeners: Array<(registration: ServiceWorkerRegistration) => void> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }

  private initialize() {
    // Detect environment
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone;
    
    console.log('🔍 PWA Environment:', { 
      isIOS, 
      isStandalone, 
      userAgent: navigator.userAgent,
      swSupported: 'serviceWorker' in navigator 
    });

    // Listen for install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('📱 PWA install prompt available');
      e.preventDefault();
      this.deferredPrompt = e as any;
      this.notifyInstallListeners(true);
    });

    // Listen for app installed
    window.addEventListener('appinstalled', () => {
      console.log('✅ PWA installed successfully');
      this.deferredPrompt = null;
      this.notifyInstallListeners(false);
    });

    // Register service worker with iOS-specific timing
    if (isIOS && isStandalone) {
      // iOS standalone mode: Delay registration to ensure page is fully loaded
      console.log('📱 iOS Standalone detected - delaying SW registration');
      if (document.readyState === 'complete') {
        setTimeout(() => this.registerServiceWorker(), 500);
      } else {
        window.addEventListener('load', () => {
          setTimeout(() => this.registerServiceWorker(), 500);
        });
      }
    } else {
      // Other platforms: Register immediately
      if (document.readyState === 'complete') {
        this.registerServiceWorker();
      } else {
        window.addEventListener('load', () => this.registerServiceWorker());
      }
    }
  }

  // Register the service worker
  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) {
      console.log('⚠️ Service workers not supported in this browser');
      return null;
    }

    try {
      console.log('📝 [SW] Starting service worker registration from pwaInstaller...');
      
      // Try to register the service worker directly without HEAD check
      // iOS sometimes blocks HEAD requests or has CORS issues with them
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('✅ [SW] Service worker registered successfully!');
      console.log('📝 [SW] Scope:', registration.scope);
      console.log('📝 [SW] Installing:', registration.installing);
      console.log('📝 [SW] Waiting:', registration.waiting);
      console.log('📝 [SW] Active:', registration.active);

      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        console.log('🆕 New service worker found, installing...');

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('🎉 New content available, please refresh');
            this.notifyUpdateListeners(registration);
          }
        });
      });

      // Check for updates immediately and periodically
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      // FORCE IMMEDIATE UPDATE CHECK (for iOS cache issues)
      // Reduced logging - only log errors
      setTimeout(() => {
        registration.update().catch((err) => {
          console.warn('⚠️ [SW] Update check failed:', err);
        });
      }, 1000);
      
      // Check again after 10 seconds (iOS sometimes needs multiple checks)
      if (isIOS) {
        setTimeout(() => {
          registration.update();
        }, 10000);
      }
      
      // Regular periodic checks (less frequently on iOS to save battery)
      const updateInterval = isIOS ? 6 * 60 * 60 * 1000 : 60 * 60 * 1000; // 6 hours on iOS, 1 hour elsewhere
      setInterval(() => {
        console.log('🔄 [SW] Checking for updates...');
        registration.update();
      }, updateInterval);

      // For iOS, verify registration after a delay
      if (isIOS) {
        setTimeout(async () => {
          const verifyReg = await navigator.serviceWorker.getRegistration();
          if (!verifyReg) {
            console.error('❌ [SW] iOS: Verification failed - no registration found!');
          }
          // Reduced logging - only log errors
        }, 2000);
      }

      // Wait for the service worker to become active
      if (!registration.active && (registration.installing || registration.waiting)) {
        console.log('📝 [SW] Waiting for service worker to become active...');
        await new Promise<void>((resolve) => {
          const worker = registration.installing || registration.waiting;
          if (worker) {
            worker.addEventListener('statechange', () => {
              console.log('📝 [SW] State changed to:', worker.state);
              if (worker.state === 'activated') {
                console.log('✅ [SW] Service worker activated!');
                resolve();
              }
            });
          } else {
            resolve();
          }
        });
      } else if (registration.active) {
        console.log('✅ [SW] Service worker already active!');
      }

      return registration;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
        || (window.navigator as any).standalone;
      
      // Check if it's a 404 error (expected in preview)
      if (errorMessage.includes('404') || errorMessage.includes('bad HTTP response')) {
        console.log('ℹ️ [SW] Service worker not available in preview environment');
        console.log('ℹ️ [SW] This is expected - push notifications will work in production');
      } else {
        console.error('❌ [SW] Service worker registration failed:', error);
        console.error('❌ [SW] Error details:', {
          name: error instanceof Error ? error.name : 'Unknown',
          message: errorMessage,
          platform: isIOS ? 'iOS' : 'Other',
          mode: isStandalone ? 'Standalone' : 'Browser'
        });
        
        // iOS-specific retry logic
        if (isIOS && isStandalone) {
          console.log('🔄 iOS: Retrying registration in 3 seconds...');
          setTimeout(() => {
            this.registerServiceWorker();
          }, 3000);
        }
      }
      return null;
    }
  }

  // Unregister service worker (for development/testing)
  async unregisterServiceWorker(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const success = await registration.unregister();
        console.log('🗑️ Service worker unregistered:', success);
        return success;
      }
      return false;
    } catch (error) {
      console.error('❌ Failed to unregister service worker:', error);
      return false;
    }
  }

  // Show the install prompt
  async showInstallPrompt(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!this.deferredPrompt) {
      console.warn('⚠️ Install prompt not available');
      return 'unavailable';
    }

    try {
      console.log('📱 Showing install prompt...');
      await this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      console.log(`👤 User ${outcome} the install prompt`);
      
      if (outcome === 'accepted') {
        this.deferredPrompt = null;
      }
      
      return outcome;
    } catch (error) {
      console.error('❌ Error showing install prompt:', error);
      return 'unavailable';
    }
  }

  // Get PWA status
  getStatus(): PWAStatus {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone
      || document.referrer.includes('android-app://');

    const isInstalled = isStandalone;
    const isInstallable = this.deferredPrompt !== null;
    const canInstall = !isInstalled && isInstallable;

    // Detect platform
    let platform: PWAStatus['platform'] = 'unknown';
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/iphone|ipad|ipod/.test(userAgent)) {
      platform = 'ios';
    } else if (/android/.test(userAgent)) {
      platform = 'android';
    } else if (isInstallable || isInstalled) {
      platform = 'desktop';
    }

    return {
      isInstallable,
      isInstalled,
      isStandalone,
      canInstall,
      platform,
    };
  }

  // Check if running as installed PWA
  isRunningAsPWA(): boolean {
    return this.getStatus().isStandalone;
  }

  // Subscribe to install availability changes
  onInstallAvailable(callback: (canInstall: boolean) => void) {
    this.installListeners.push(callback);
    // Immediately call with current status
    callback(this.deferredPrompt !== null);
    
    // Return unsubscribe function
    return () => {
      this.installListeners = this.installListeners.filter(cb => cb !== callback);
    };
  }

  // Subscribe to service worker updates
  onUpdateAvailable(callback: (registration: ServiceWorkerRegistration) => void) {
    this.updateListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.updateListeners = this.updateListeners.filter(cb => cb !== callback);
    };
  }

  // Notify install listeners
  private notifyInstallListeners(canInstall: boolean) {
    this.installListeners.forEach(callback => callback(canInstall));
  }

  // Notify update listeners
  private notifyUpdateListeners(registration: ServiceWorkerRegistration) {
    this.updateListeners.forEach(callback => callback(registration));
  }

  // Force update the service worker
  async forceUpdate(): Promise<void> {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
        
        // Tell the service worker to skip waiting
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        
        // Reload the page to use the new service worker
        window.location.reload();
      }
    } catch (error) {
      console.error('❌ Failed to force update:', error);
    }
  }

  // Clear all caches
  async clearCaches(): Promise<void> {
    if (!('caches' in window)) return;

    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      console.log('🗑️ All caches cleared');
    } catch (error) {
      console.error('❌ Failed to clear caches:', error);
    }
  }

  // Get iOS install instructions
  getIOSInstructions(): string[] {
    return [
      'Tap the Share button (square with arrow)',
      'Scroll down and tap "Add to Home Screen"',
      'Tap "Add" to install Adoras',
    ];
  }
}

// Export singleton instance
export const pwaInstaller = new PWAInstaller();
