/**
 * Notification Onboarding Dialog - First Login
 * Shows a popup to enable push notifications after first login
 * Detects iOS/Android and provides platform-specific instructions
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Bell, BellOff, Smartphone, Info, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  isNotificationSupported,
  requestNotificationPermission,
  subscribeToPushNotifications,
  getNotificationPermission,
} from '../utils/notificationService';

interface NotificationOnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}

export function NotificationOnboardingDialog({
  open,
  onOpenChange,
  userId,
  userName,
}: NotificationOnboardingDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<'intro' | 'ios-install' | 'enable' | 'success' | 'skip'>('intro');
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Detect platform
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const android = /Android/.test(navigator.userAgent);
    setIsIOS(iOS);
    setIsAndroid(android);
    
    // Check if running as standalone PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                      (window.navigator as any).standalone === true ||
                      document.referrer.includes('android-app://');
    setIsStandalone(standalone);
    
    // Get current notification permission
    setNotificationPermission(getNotificationPermission());
    
    // Determine initial step based on platform and state
    if (iOS && !standalone) {
      setCurrentStep('ios-install');
    } else {
      setCurrentStep('intro');
    }
  }, []);

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    
    try {
      // iOS-specific check
      if (isIOS && !isStandalone) {
        setCurrentStep('ios-install');
        setIsLoading(false);
        return;
      }

      // Request permission
      const granted = await requestNotificationPermission();
      
      if (!granted) {
        if (isIOS) {
          toast.error('⚙️ Open iOS Settings → Adoras → Notifications to enable', {
            duration: 8000,
          });
        } else {
          toast.error('Please enable notifications in your browser settings', {
            duration: 5000,
          });
        }
        setCurrentStep('skip');
        setIsLoading(false);
        return;
      }

      // Subscribe to push notifications
      const subscribed = await subscribeToPushNotifications(userId);
      
      if (subscribed) {
        setCurrentStep('success');
        
        // Show iOS-specific tips
        if (isIOS) {
          setTimeout(() => {
            toast.info('💡 Enable "Badge App Icon" in iOS Settings for notification counts', {
              duration: 6000,
            });
          }, 2000);
        }
      } else {
        toast.error('Failed to enable notifications. You can try again later in Settings.');
        setCurrentStep('skip');
      }
    } catch (error) {
      console.error('Failed to enable notifications:', error);
      toast.error('Failed to enable notifications');
      setCurrentStep('skip');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    setCurrentStep('skip');
    
    // Close after showing skip message
    setTimeout(() => {
      onOpenChange(false);
      toast.info('You can enable notifications anytime from Menu → Notification Settings', {
        duration: 5000,
      });
    }, 1500);
  };

  const handleDone = () => {
    onOpenChange(false);
  };

  // Get platform-specific icon/emoji
  const getPlatformIcon = () => {
    if (isIOS) return '📱';
    if (isAndroid) return '🤖';
    return '💻';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        {/* INTRO STEP */}
        {currentStep === 'intro' && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-[#36453B] rounded-full">
                  <Bell className="w-6 h-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-xl">Stay Connected</DialogTitle>
                  <DialogDescription className="text-sm">
                    Get notified when memories are shared
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Benefits */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">New Memories</p>
                    <p className="text-sm text-muted-foreground">
                      Get notified when {userName} shares photos, stories, or voice notes
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Daily Prompts</p>
                    <p className="text-sm text-muted-foreground">
                      Gentle reminders to share your memories
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Never Miss a Moment</p>
                    <p className="text-sm text-muted-foreground">
                      Stay in touch even when you're not in the app
                    </p>
                  </div>
                </div>
              </div>

              {/* Platform-specific note */}
              {isIOS && isStandalone && (
                <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-sm text-blue-800 dark:text-blue-200">
                    After enabling, go to <strong>iOS Settings → Adoras</strong> to configure notification preferences and badges.
                  </AlertDescription>
                </Alert>
              )}

              {!isNotificationSupported() && (
                <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-sm text-yellow-800 dark:text-yellow-200">
                    Your browser doesn't support push notifications. Try using Chrome, Safari, or Edge.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={handleSkip}
                className="w-full sm:w-auto"
              >
                Maybe Later
              </Button>
              <Button
                onClick={handleEnableNotifications}
                disabled={isLoading || !isNotificationSupported()}
                className="w-full sm:w-auto bg-[#36453B] hover:bg-[#36453B]/90"
              >
                {isLoading ? (
                  <>
                    <span className="mr-2">⏳</span>
                    Enabling...
                  </>
                ) : (
                  <>
                    <Bell className="w-4 h-4 mr-2" />
                    Enable Notifications
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* iOS INSTALLATION REQUIRED STEP */}
        {currentStep === 'ios-install' && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-blue-600 rounded-full">
                  <Smartphone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-xl">Install Adoras First</DialogTitle>
                  <DialogDescription>
                    iOS requires the app to be installed
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-900 dark:text-blue-100 mb-2">
                  Why is this needed?
                </AlertTitle>
                <AlertDescription className="text-sm text-blue-800 dark:text-blue-200">
                  Apple requires apps to be installed to your home screen before they can send notifications.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <p className="font-medium">Follow these steps:</p>
                
                <div className="space-y-3 ml-2">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#36453B] text-white flex items-center justify-center text-sm">
                      1
                    </div>
                    <p className="text-sm pt-0.5">
                      Tap the <strong>Share</strong> button <span className="inline-block px-2 py-0.5 bg-blue-100 dark:bg-blue-900 rounded text-xs ml-1">⬆️</span> at the bottom of Safari
                    </p>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#36453B] text-white flex items-center justify-center text-sm">
                      2
                    </div>
                    <p className="text-sm pt-0.5">
                      Scroll down and tap <strong>"Add to Home Screen"</strong>
                    </p>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#36453B] text-white flex items-center justify-center text-sm">
                      3
                    </div>
                    <p className="text-sm pt-0.5">
                      Tap <strong>"Add"</strong> in the top right corner
                    </p>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#36453B] text-white flex items-center justify-center text-sm">
                      4
                    </div>
                    <p className="text-sm pt-0.5">
                      <strong>Open Adoras from your home screen</strong> (not from Safari)
                    </p>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#36453B] text-white flex items-center justify-center text-sm">
                      5
                    </div>
                    <p className="text-sm pt-0.5">
                      Come back to this screen to enable notifications
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleSkip}
                className="w-full"
              >
                I'll Do This Later
              </Button>
            </DialogFooter>
          </>
        )}

        {/* SUCCESS STEP */}
        {currentStep === 'success' && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-green-600 rounded-full">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-xl">All Set! {getPlatformIcon()}</DialogTitle>
                  <DialogDescription>
                    Notifications are enabled
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                You'll now receive notifications when memories are shared and get daily prompts to keep the conversation going.
              </p>

              {isIOS && (
                <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
                  <Info className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-900 dark:text-green-100 mb-2">
                    iOS Tips
                  </AlertTitle>
                  <AlertDescription className="text-sm text-green-800 dark:text-green-200 space-y-1">
                    <p>• Go to <strong>Settings → Adoras → Notifications</strong></p>
                    <p>• Enable <strong>"Badge App Icon"</strong> to see notification counts</p>
                    <p>• Customize sounds and alerts to your preference</p>
                  </AlertDescription>
                </Alert>
              )}

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Customize anytime</p>
                <p className="text-sm text-muted-foreground">
                  Go to Menu → Notification Settings to adjust what notifications you receive and set quiet hours.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={handleDone}
                className="w-full bg-[#36453B] hover:bg-[#36453B]/90"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Got It!
              </Button>
            </DialogFooter>
          </>
        )}

        {/* SKIP STEP */}
        {currentStep === 'skip' && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-gray-400 rounded-full">
                  <BellOff className="w-6 h-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-xl">No Problem</DialogTitle>
                  <DialogDescription>
                    You can enable this later
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                You can enable notifications anytime from:
              </p>

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium">
                  Menu → Notification Settings
                </p>
              </div>

              <p className="text-sm text-muted-foreground">
                You'll still be able to use all features of Adoras, but you won't get alerts when memories are shared.
              </p>
            </div>

            <DialogFooter>
              <Button
                onClick={handleDone}
                variant="outline"
                className="w-full"
              >
                Close
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
