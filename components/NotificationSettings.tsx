/**
 * Notification Settings Component - Phase 4d with iOS Fix
 * Allows users to configure push notification preferences
 * iOS FIX: Requests permission immediately on button click (no async delays)
 */

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Badge } from "./ui/badge";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "./ui/alert";
import {
  Bell,
  BellOff,
  TestTube,
  Check,
  X,
  Clock,
  Sparkles,
  AlertCircle,
  Smartphone,
  Info,
  HelpCircle,
  Wrench,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { IOSSettingsGuide } from "./IOSSettingsGuide";
import { NotificationDiagnostic } from "./NotificationDiagnostic";
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  isPushSubscribed,
  getNotificationPreferences,
  updateNotificationPreferences,
  sendTestNotification,
  type NotificationPreferences,
} from "../utils/notificationService";
import {
  isPWAMode,
  isIOS as detectIOS,
  canReceivePushNotifications,
  getNotificationCapabilityMessage,
} from "../utils/pwaDetection";

interface NotificationSettingsProps {
  userId: string;
}

export function NotificationSettings({
  userId,
}: NotificationSettingsProps) {
  console.log('🔔 [NOTIF_SETTINGS] Component rendering with userId:', userId, 'type:', typeof userId);
  
  // Safety check for userId
  if (!userId || typeof userId !== 'string') {
    console.error('❌ [NOTIF_SETTINGS] Invalid userId:', userId);
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="w-5 h-5" />
            Configuration Error
          </CardTitle>
          <CardDescription>
            Unable to load notification settings. Please try logging out and back in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">
              <strong>Error:</strong> User ID is missing or invalid.
            </p>
            <p className="text-xs text-red-700 dark:text-red-300 mt-2">
              Debug info: userId = {String(userId)} (type: {typeof userId})
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [canUsePush, setCanUsePush] = useState(false);
  const [capability, setCapability] = useState<ReturnType<typeof getNotificationCapabilityMessage> | null>(null);
  const [showSettingsGuide, setShowSettingsGuide] =
    useState(false);
  const [guideReason, setGuideReason] = useState<
    "blocked" | "first-time" | "instructions"
  >("instructions");
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [isPreviewEnvironment, setIsPreviewEnvironment] =
    useState(false);
  const [subscriptionFailed, setSubscriptionFailed] = useState(false);
  const [swRegistered, setSwRegistered] = useState<boolean | null>(null);
  const [swActive, setSwActive] = useState<boolean | null>(null);
  const [preferences, setPreferences] =
    useState<NotificationPreferences>({
      userId,
      newMemories: true,
      dailyPrompts: true,
      responses: true,
      milestones: true,
      partnerActivity: true,
      timezone:
        Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

  useEffect(() => {
    try {
      console.log('🔔 [INIT] Initializing notification settings for userId:', userId);
      
      // Use PWA detection utilities
      const iOS = detectIOS();
      const standalone = isPWAMode();
      const canPush = canReceivePushNotifications();
      const pushCapability = getNotificationCapabilityMessage();
      
      setIsIOS(iOS);
      setIsStandalone(standalone);
      setCanUsePush(canPush);
      setCapability(pushCapability);

      // Detect Figma Make preview environment
      const previewEnv =
        window.location.hostname.includes("figma.site") ||
        window.location.hostname.includes("figmaiframepreview");
      setIsPreviewEnvironment(previewEnv);

      console.log("📱 Platform detection:", {
        iOS,
        standalone,
        previewEnv,
        canPush,
        pushCapability,
      });

      // Check notification support
      setIsSupported(isNotificationSupported());
      setPermission(getNotificationPermission());

      // Load preferences and subscription status immediately
      loadSettings().catch(err => {
        console.error('Failed to load settings on mount:', err);
      });

      // Also check again after 2 seconds (service worker might need time)
      const timeoutId = setTimeout(() => {
        console.log(
          "🔄 Rechecking subscription status after delay...",
        );
        loadSettings().catch(err => {
          console.error('Failed to reload settings:', err);
        });
      }, 2000);

      // Set up periodic checks every 10 seconds to keep state in sync
      const intervalId = setInterval(() => {
        console.log("🔄 Periodic subscription status check...");
        loadSettings().catch(err => {
          console.error('Failed to check settings periodically:', err);
        });
      }, 10000);

      return () => {
        clearTimeout(timeoutId);
        clearInterval(intervalId);
      };
    } catch (error) {
      console.error('❌ [INIT] Critical error in useEffect:', error);
      // Don't crash the component - just log
    }
  }, [userId]);

  const loadSettings = async () => {
    try {
      console.log('📡 [LOAD_SETTINGS] Starting to load settings for userId:', userId);
      
      // Check service worker registration status
      if ("serviceWorker" in navigator) {
        try {
          const registration =
            await navigator.serviceWorker.getRegistration();
          setSwRegistered(!!registration);
          setSwActive(!!registration?.active);
        } catch (swError) {
          console.warn('Service worker check failed:', swError);
          setSwRegistered(false);
          setSwActive(false);
        }
      } else {
        setSwRegistered(false);
        setSwActive(false);
      }

      // Check subscription status
      try {
        const subscribed = await isPushSubscribed();
        setIsSubscribed(subscribed);
        console.log('📡 [LOAD_SETTINGS] Subscription status:', subscribed);
      } catch (subError) {
        console.warn('Subscription check failed:', subError);
        setIsSubscribed(false);
      }

      // Load preferences (don't fail if this doesn't work)
      try {
        const prefs = await getNotificationPreferences(userId);
        if (prefs) {
          setPreferences(prefs);
          console.log('📡 [LOAD_SETTINGS] Loaded preferences');
        }
      } catch (prefError) {
        console.warn('Failed to load preferences, using defaults:', prefError);
        // Keep using default preferences - don't fail
      }
      
      console.log('📡 [LOAD_SETTINGS] Settings loaded successfully');
    } catch (error) {
      console.error(
        "❌ [LOAD_SETTINGS] Critical error loading notification settings:",
        error,
      );
      // Don't throw - just log and continue
    }
  };

  const handleEnableNotifications = async () => {
    console.log("🔔 handleEnableNotifications called", {
      isIOS,
      isStandalone,
      permission,
      userId,
    });

    // Prevent double-clicks
    if (isLoading) {
      console.log(
        "⚠️ Already processing notification enable request",
      );
      return;
    }

    // iOS-specific check BEFORE any state updates
    if (isIOS && !isStandalone) {
      console.log("⚠️ iOS not in standalone mode");
      toast.error(
        "📱 Please add Adoras to your home screen first to enable notifications",
        {
          duration: 6000,
        },
      );
      return;
    }

    try {
      setIsLoading(true); // Set loading state immediately
      setSubscriptionFailed(false); // Clear previous failure

      // iOS CRITICAL FIX: Request permission IMMEDIATELY
      // iOS requires Notification.requestPermission() to be called
      // directly in the user gesture event (button click)
      // NO ASYNC OPERATIONS BEFORE THIS CALL - they break the gesture chain!
      console.log(
        "🔔 Requesting notification permission NOW...",
      );

      let granted = false;

      if (isIOS) {
        // iOS-specific: Call permission request immediately
        console.log(
          "📱 iOS: Calling Notification.requestPermission() IMMEDIATELY...",
        );
        console.log(
          "📱 Current permission state:",
          Notification.permission,
        );

        try {
          // CRITICAL: This MUST be the VERY FIRST async operation
          // No setState, no await, no checks, no delays before this call!
          const perm = await Notification.requestPermission();
          granted = perm === "granted";

          console.log("📱 iOS permission result:", perm);

          // NOW we can update state
          setPermission(perm);
        } catch (permError) {
          console.error(
            "📱 iOS permission request error:",
            permError,
          );
          granted = false;
        }
      } else {
        // Other platforms can use the standard flow
        granted = await requestNotificationPermission();
      }

      if (!granted) {
        console.log("❌ Permission not granted");

        if (isIOS) {
          // Check if denied vs dismissed
          const newPermission = getNotificationPermission();
          console.log(
            "📱 iOS permission state after request:",
            newPermission,
          );

          if (newPermission === "denied") {
            setGuideReason("blocked");
            setShowSettingsGuide(true);
            toast.error("⚙️ Notifications blocked", {
              duration: 12000,
              description:
                'Tap "Show Guide" to learn how to enable notifications in iOS Settings',
              action: {
                label: "Show Guide",
                onClick: () => {
                  setGuideReason("blocked");
                  setShowSettingsGuide(true);
                },
              },
            });
          } else {
            toast.warning(
              'You dismissed the notification prompt. Tap "Enable Notifications" again to try.',
              {
                duration: 6000,
              },
            );
          }
        } else {
          toast.error(
            "Notification permission denied. Please enable in browser settings.",
          );
        }
        setIsLoading(false);
        return;
      }

      console.log("✅ Permission granted, updating state...");
      setPermission("granted");

      // Subscribe to push notifications
      console.log("📡 Subscribing to push notifications...");
      const subscribed =
        await subscribeToPushNotifications(userId);

      console.log(
        "📡 [ENABLE_FLOW] Subscription result:",
        subscribed,
        "(type:",
        typeof subscribed,
        ")",
      );

      if (subscribed === true) {
        console.log(
          "✅ [ENABLE_FLOW] Successfully subscribed!",
        );
        setIsSubscribed(true);
        setSubscriptionFailed(false); // Clear failure state

        // Reload settings to confirm subscription status (non-blocking)
        loadSettings().catch((err) => {
          console.warn(
            "Failed to reload settings after subscription:",
            err,
          );
          // Don't fail the flow if settings reload fails
        });

        toast.success("✅ Notifications enabled successfully!");

        // Show iOS badge update tip
        if (isIOS) {
          setTimeout(() => {
            toast.info(
              '💡 Tip: Enable "Badge App Icon" in iOS Settings → Adoras → Notifications for notification counts',
              {
                duration: 6000,
              },
            );
          }, 2000);
        }
      } else {
        // CRITICAL FIX: Don't show false success messages!

        console.error(
          "❌ [ENABLE_FLOW] Push subscription FAILED",
        );
        console.error("❌ Details:", {
          subscribed,
          permission,
          isIOS,
          isStandalone,
        });
        setIsSubscribed(false);
        setSubscriptionFailed(true); // Track failure

        toast.error("❌ Push notification setup failed", {
          duration: 10000,
          description:
            "See the diagnostic tool below to troubleshoot the issue",
        });
      }
    } catch (error) {
      console.error(
        "❌ Failed to enable notifications:",
        error,
      );
      console.error("❌ Error details:", {
        name: error instanceof Error ? error.name : "Unknown",
        message:
          error instanceof Error
            ? error.message
            : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      if (isIOS) {
        toast.error(
          "Error enabling notifications. Check the console for details.",
          {
            duration: 6000,
          },
        );
      } else {
        toast.error(
          "Failed to enable notifications. Check the console for details.",
        );
      }
    } finally {
      console.log("📡 Clearing loading state...");
      setIsLoading(false);
      console.log("📡 Enable notifications flow complete");
    }
  };

  const handleDisableNotifications = async () => {
    setIsLoading(true);
    try {
      const success =
        await unsubscribeFromPushNotifications(userId);

      if (success) {
        setIsSubscribed(false);
        toast.success("Notifications disabled");
      } else {
        toast.error("Failed to disable notifications");
      }
    } catch (error) {
      console.error("Failed to disable notifications:", error);
      toast.error("Failed to disable notifications");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePreference = async (
    key: keyof NotificationPreferences,
    value: any,
  ) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);

    try {
      await updateNotificationPreferences(newPreferences);
      toast.success("Preference updated");
    } catch (error) {
      console.error("Failed to update preference:", error);
      toast.error("Failed to update preference");
    }
  };

  const handleTestNotification = async () => {
    try {
      const success = await sendTestNotification(userId);

      if (success) {
        toast.success(
          "Test notification sent! Check your notifications.",
        );
      } else {
        toast.error("Failed to send test notification");
      }
    } catch (error) {
      console.error("Failed to send test notification:", error);
      toast.error("Failed to send test notification");
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="w-5 h-5" />
            Notifications Not Supported
          </CardTitle>
          <CardDescription>
            Push notifications are not supported in this
            browser.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* iOS Settings Guide Dialog */}
      <IOSSettingsGuide
        open={showSettingsGuide}
        onOpenChange={setShowSettingsGuide}
        reason={guideReason}
      />

      {/* Preview Environment Notice */}
      {isPreviewEnvironment && (
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-900 dark:text-blue-100">
            Preview Environment
          </AlertTitle>
          <AlertDescription className="text-blue-800 dark:text-blue-200 space-y-2">
            <p className="text-sm">
              You're viewing Adoras in the Figma Make preview
              environment. Push notifications are not available
              in preview mode, but{" "}
              <strong>
                will work when deployed to production
              </strong>
              .
            </p>
            <div className="text-xs space-y-1 mt-2 bg-blue-100 dark:bg-blue-900/30 p-2 rounded">
              <p>
                <strong>✓</strong> In-app notifications are
                working (when someone sends you a message)
              </p>
              <p>
                <strong>✓</strong> Chat badges and unread
                counters are working
              </p>
              <p>
                <strong>⏳</strong> Push notifications will work
                after deployment
              </p>
            </div>
            <p className="text-xs mt-2 text-blue-700 dark:text-blue-300">
              💡 When deployed, you'll receive native
              iOS/Android notification banners just like
              iMessage!
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* iOS Notification Banner Feature Card */}
      {isIOS && isStandalone && permission === "granted" && (
        <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <Sparkles className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-900 dark:text-green-100">
            iMessage-Style Notifications
          </AlertTitle>
          <AlertDescription className="text-green-800 dark:text-green-200 space-y-2">
            <p className="text-sm">
              🎉 You'll receive native iOS notification banners
              when messages arrive - just like iMessage!
            </p>
            <div className="text-xs space-y-1 mt-2 bg-green-100 dark:bg-green-900/30 p-2 rounded">
              <p>
                <strong>✓</strong> Banner notifications appear
                at the top of your screen
              </p>
              <p>
                <strong>✓</strong> Shows sender name and message
                preview
              </p>
              <p>
                <strong>✓</strong> Tap to open Adoras and view
                the message
              </p>
              <p>
                <strong>✓</strong> Works even when app is in
                background
              </p>
            </div>
            <p className="text-xs mt-2 text-green-700 dark:text-green-300">
              💡 Tip: In{" "}
              <strong>Settings → Adoras → Notifications</strong>
              , you can customize banner style, sounds, and
              badge settings.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* PWA Capability Status Alert */}
      {capability && (
        <>
          {!capability.canReceive && (
            <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-yellow-900 dark:text-yellow-100">
                Push Notifications Not Available
              </AlertTitle>
              <AlertDescription className="text-yellow-800 dark:text-yellow-200 space-y-2">
                <p className="text-sm">{capability.message}</p>
                {capability.actionLabel && (
                  <Button
                    onClick={() => {
                      toast.info('Look for the Install/Add to Home Screen option in your browser menu', {
                        duration: 6000,
                      });
                    }}
                    variant="outline"
                    size="sm"
                    className="w-full border-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/20"
                  >
                    <Smartphone className="w-4 h-4 mr-2" />
                    {capability.actionLabel}
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

          {capability.isLimited && capability.canReceive && (
            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-900 dark:text-blue-100">
                Limited Notification Support
              </AlertTitle>
              <AlertDescription className="text-blue-800 dark:text-blue-200 space-y-2">
                <p className="text-sm">{capability.message}</p>
                <p className="text-xs mt-2">
                  💡 <strong>Tip:</strong> Install Adoras as an app to receive notifications even when your browser is closed.
                </p>
                {capability.actionLabel && (
                  <Button
                    onClick={() => {
                      toast.info('Look for the Install/Add to Home Screen option in your browser menu', {
                        duration: 6000,
                      });
                    }}
                    variant="outline"
                    size="sm"
                    className="w-full border-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/20"
                  >
                    <Smartphone className="w-4 h-4 mr-2" />
                    {capability.actionLabel}
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

          {!capability.isLimited && capability.canReceive && isStandalone && (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-900 dark:text-green-100">
                Full Push Notification Support
              </AlertTitle>
              <AlertDescription className="text-green-800 dark:text-green-200">
                <p className="text-sm">{capability.message}</p>
              </AlertDescription>
            </Alert>
          )}
        </>
      )}

      {/* iOS-Specific Installation Alert (legacy - now handled by capability alert above) */}
      {isIOS && !isStandalone && !capability && (
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <Smartphone className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-900 dark:text-blue-100">
            iOS Setup Required
          </AlertTitle>
          <AlertDescription className="text-blue-800 dark:text-blue-200 space-y-2">
            <p className="text-sm">
              To receive notifications on iOS, you must first
              install Adoras as an app:
            </p>
            <ol className="text-sm space-y-1 ml-4 list-decimal">
              <li>
                Tap the Share button{" "}
                <span className="inline-block px-2 py-0.5 bg-blue-100 dark:bg-blue-900 rounded text-xs">
                  ⬆️
                </span>
              </li>
              <li>Scroll and tap "Add to Home Screen"</li>
              <li>Open Adoras from your home screen</li>
              <li>Return here to enable notifications</li>
            </ol>
          </AlertDescription>
        </Alert>
      )}

      {/* iOS Settings Instructions (when notifications denied) */}
      {isIOS && isStandalone && permission === "denied" && (
        <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-900 dark:text-orange-100">
            Enable in iOS Settings
          </AlertTitle>
          <AlertDescription className="text-orange-800 dark:text-orange-200 space-y-3">
            <p className="text-sm">
              Notifications are currently blocked. You need to
              enable them in iPhone Settings.
            </p>
            <Button
              onClick={() => {
                setGuideReason("blocked");
                setShowSettingsGuide(true);
              }}
              variant="outline"
              size="sm"
              className="w-full border-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/20"
            >
              <HelpCircle className="w-4 h-4 mr-2" />
              Show Step-by-Step Guide
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Notification Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Push Notifications
                {isIOS && (
                  <Badge
                    variant="outline"
                    className="ml-2 text-xs"
                  >
                    iOS
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Get notified about new memories and prompts
              </CardDescription>
            </div>
            <Badge
              variant={isSubscribed ? "default" : "secondary"}
              className={isSubscribed ? "bg-green-500" : ""}
            >
              {isSubscribed ? (
                <>
                  <Check className="w-3 h-3 mr-1" />
                  Enabled
                </>
              ) : (
                <>
                  <X className="w-3 h-3 mr-1" />
                  Disabled
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Generic Permission Denied Warning */}
          {!isIOS && permission === "denied" && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Notifications blocked.</strong> To
                enable notifications, please allow them in your
                browser settings.
              </p>
            </div>
          )}

          {/* iOS Installation Status */}
          {isIOS && (
            <div className="p-3 bg-muted rounded-lg flex items-start gap-3">
              <Info className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <div className="flex-1 text-sm">
                <p className="font-medium">
                  {isStandalone
                    ? "✅ App installed"
                    : "⚠️ Not installed as app"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isStandalone
                    ? "Notifications are available on your device"
                    : "Install to home screen to enable notifications"}
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {!isSubscribed ? (
              <>
                <Button
                  onClick={handleEnableNotifications}
                  disabled={
                    isLoading ||
                    permission === "denied" ||
                    (isIOS && !isStandalone)
                  }
                  className="flex-1"
                >
                  <Bell className="w-4 h-4 mr-2" />
                  {isLoading
                    ? "Enabling..."
                    : "Enable Notifications"}
                </Button>
                <Button
                  onClick={() => {
                    console.log("🔄 Manual refresh triggered");
                    loadSettings();
                    toast.info(
                      "Checking notification status...",
                    );
                  }}
                  variant="outline"
                  size="icon"
                  title="Refresh status"
                >
                  <Info className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleDisableNotifications}
                  variant="outline"
                  disabled={isLoading}
                  className="flex-1"
                >
                  <BellOff className="w-4 h-4 mr-2" />
                  {isLoading
                    ? "Disabling..."
                    : "Disable Notifications"}
                </Button>
                <Button
                  onClick={handleTestNotification}
                  variant="outline"
                  size="icon"
                  title="Send test notification"
                >
                  <TestTube className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>

          {/* Push Notification Diagnostic Link - Shows when subscription fails */}
          {subscriptionFailed && (
            <Alert className="border-red-300 bg-red-50 dark:bg-red-950/20 mt-4">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertTitle className="text-red-900 dark:text-red-100">
                ❌ Push Notification Setup Failed
              </AlertTitle>
              <AlertDescription className="text-red-800 dark:text-red-200 space-y-3">
                <p className="text-sm">
                  The push notification subscription failed. Use the diagnostic tool below to identify and fix the issue.
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      console.log("🔧 Opening push diagnostic page...");
                      window.location.href = "/push-diagnostic.html";
                    }}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    size="sm"
                  >
                    <Wrench className="w-4 h-4 mr-2" />
                    Run Full Diagnostic
                  </Button>
                  <Button
                    onClick={() => setShowDiagnostic(!showDiagnostic)}
                    variant="outline"
                    size="sm"
                    className="border-red-300"
                  >
                    {showDiagnostic ? "Hide" : "Show"} Quick Check
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Diagnostic Button */}
          {isIOS && !isSubscribed && (
            <div className="flex items-center justify-center mt-4">
              <Button
                onClick={() =>
                  setShowDiagnostic(!showDiagnostic)
                }
                variant="ghost"
                size="sm"
                className="text-xs"
              >
                <Wrench className="w-3 h-3 mr-2" />
                {showDiagnostic ? "Hide" : "Show"} Diagnostic
                Tool
              </Button>
            </div>
          )}

          {/* iOS Additional Tips */}
          {isIOS && isStandalone && isSubscribed && (
            <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-200">
                <strong>💡 iOS Tips:</strong>
              </p>
              <ul className="text-xs text-green-700 dark:text-green-300 mt-2 space-y-1 ml-4 list-disc">
                <li>
                  Enable "Badge App Icon" in Settings → Adoras →
                  Notifications
                </li>
                <li>
                  Notifications appear even when phone is locked
                </li>
                <li>
                  Swipe down from top to view notification
                  history
                </li>
                <li>
                  Long-press notifications to reply or interact
                </li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diagnostic Tool */}
      {showDiagnostic && isIOS && <NotificationDiagnostic />}

      {/* Notification Preferences */}
      {isSubscribed && (
        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>
              Choose what notifications you'd like to receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* New Memories */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="newMemories">
                  New Memories
                </Label>
                <p className="text-sm text-muted-foreground">
                  When your family member shares a new memory
                </p>
              </div>
              <Switch
                id="newMemories"
                checked={preferences.newMemories}
                onCheckedChange={(checked) =>
                  handleUpdatePreference("newMemories", checked)
                }
              />
            </div>

            {/* Daily Prompts */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="dailyPrompts">
                  Daily Prompts
                </Label>
                <p className="text-sm text-muted-foreground">
                  Get daily memory prompt suggestions
                </p>
              </div>
              <Switch
                id="dailyPrompts"
                checked={preferences.dailyPrompts}
                onCheckedChange={(checked) =>
                  handleUpdatePreference(
                    "dailyPrompts",
                    checked,
                  )
                }
              />
            </div>

            {/* Responses */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="responses">
                  Responses to Prompts
                </Label>
                <p className="text-sm text-muted-foreground">
                  When someone responds to your prompts
                </p>
              </div>
              <Switch
                id="responses"
                checked={preferences.responses}
                onCheckedChange={(checked) =>
                  handleUpdatePreference("responses", checked)
                }
              />
            </div>

            {/* Milestones */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="milestones">
                  <span className="flex items-center gap-1">
                    Milestones
                    <Sparkles className="w-3 h-3 text-yellow-500" />
                  </span>
                </Label>
                <p className="text-sm text-muted-foreground">
                  Celebrate memory-sharing milestones
                </p>
              </div>
              <Switch
                id="milestones"
                checked={preferences.milestones}
                onCheckedChange={(checked) =>
                  handleUpdatePreference("milestones", checked)
                }
              />
            </div>

            {/* Partner Activity */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="partnerActivity">
                  Partner Activity
                </Label>
                <p className="text-sm text-muted-foreground">
                  When your family member is active
                </p>
              </div>
              <Switch
                id="partnerActivity"
                checked={preferences.partnerActivity}
                onCheckedChange={(checked) =>
                  handleUpdatePreference(
                    "partnerActivity",
                    checked,
                  )
                }
              />
            </div>

            {/* Quiet Hours */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <Label>Quiet Hours (Optional)</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Don't send notifications during these hours
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="quietStart"
                    className="text-xs"
                  >
                    Start Time
                  </Label>
                  <Select
                    value={preferences.quietHoursStart || ""}
                    onValueChange={(value) =>
                      handleUpdatePreference(
                        "quietHoursStart",
                        value,
                      )
                    }
                  >
                    <SelectTrigger id="quietStart">
                      <SelectValue placeholder="Not set" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Not set</SelectItem>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i
                          .toString()
                          .padStart(2, "0");
                        return (
                          <SelectItem
                            key={hour}
                            value={`${hour}:00`}
                          >
                            {hour}:00
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quietEnd" className="text-xs">
                    End Time
                  </Label>
                  <Select
                    value={preferences.quietHoursEnd || ""}
                    onValueChange={(value) =>
                      handleUpdatePreference(
                        "quietHoursEnd",
                        value,
                      )
                    }
                  >
                    <SelectTrigger id="quietEnd">
                      <SelectValue placeholder="Not set" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Not set</SelectItem>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i
                          .toString()
                          .padStart(2, "0");
                        return (
                          <SelectItem
                            key={hour}
                            value={`${hour}:00`}
                          >
                            {hour}:00
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Advanced Troubleshooting Section - iOS Specific */}
      {isIOS && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              Advanced Troubleshooting
            </CardTitle>
            <CardDescription>
              Tools to fix push notification issues on iOS
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Service Worker Status */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg space-y-2">
              <h4 className="text-sm mb-2">Service Worker Status:</h4>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">API Support:</span>
                <Badge variant={typeof navigator !== "undefined" && "serviceWorker" in navigator ? "default" : "destructive"}>
                  {typeof navigator !== "undefined" && "serviceWorker" in navigator ? "Yes" : "No"}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Registered:</span>
                <Badge variant={swRegistered === null ? "secondary" : swRegistered ? "default" : "destructive"}>
                  {swRegistered === null ? "Checking..." : swRegistered ? "Yes" : "No"}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Active:</span>
                <Badge variant={swActive === null ? "secondary" : swActive ? "default" : "destructive"}>
                  {swActive === null ? "Checking..." : swActive ? "Yes" : "No"}
                </Badge>
              </div>
              
              {swRegistered === false && (
                <Alert variant="destructive" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Service worker not found! Click the button below to register it.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Manual Service Worker Registration */}
            <div className="space-y-2">
              <Label className="text-sm">
                If push notifications aren't working, try re-registering the service worker:
              </Label>
              <Button
                onClick={async () => {
                  console.log("🔧 Manually re-registering service worker...");
                  if (!("serviceWorker" in navigator)) {
                    toast.error("Service workers not supported in this browser");
                    return;
                  }

                  try {
                    // Unregister existing SW first
                    const existing = await navigator.serviceWorker.getRegistration();
                    if (existing) {
                      await existing.unregister();
                      console.log("🗑️ Unregistered existing service worker");
                    }

                    // Wait a bit
                    await new Promise((resolve) => setTimeout(resolve, 500));

                    // Register new SW
                    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
                    console.log("✅ Service worker re-registered:", registration);

                    // Wait for it to be active
                    await navigator.serviceWorker.ready;

                    toast.success("Service worker re-registered successfully! Now try enabling notifications again.");
                    
                    // Reload status
                    await loadSettings();
                  } catch (error) {
                    console.error("❌ SW re-registration failed:", error);
                    toast.error(`Failed to register service worker: ${error instanceof Error ? error.message : "Unknown error"}`);
                    
                    // Still reload status
                    await loadSettings();
                  }
                }}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <Wrench className="w-4 h-4 mr-2" />
                Re-register Service Worker
              </Button>
            </div>

            {/* Link to Full Diagnostic */}
            <div className="pt-2 border-t">
              <Button
                onClick={() => {
                  window.location.href = "/push-diagnostic.html";
                }}
                variant="secondary"
                size="sm"
                className="w-full"
              >
                <Wrench className="w-4 h-4 mr-2" />
                Open Full Push Diagnostic Tool
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
