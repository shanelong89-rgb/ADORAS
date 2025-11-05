/**
 * Safe Notification Settings Component
 * Simplified version with extensive error handling to prevent crashes
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
import { Badge } from "./ui/badge";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Bell, BellOff, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner@2.0.3";

interface NotificationSettingsSafeProps {
  userId: string;
}

export function NotificationSettingsSafe({ userId }: NotificationSettingsSafeProps) {
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    try {
      console.log('🔔 [SAFE] Component mounting with userId:', userId);
      
      // Check basic support
      const supported = 'Notification' in window && 'serviceWorker' in navigator;
      setIsSupported(supported);
      
      if (supported) {
        setPermission(Notification.permission);
      }

      // iOS-specific standalone detection
      // On iOS, we need to check navigator.standalone (Safari-specific property)
      const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isStandaloneMode = isIOSDevice 
        ? (window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches
        : window.matchMedia('(display-mode: standalone)').matches;

      const debugData = {
        isIOSDevice,
        navigatorStandalone: (window.navigator as any).standalone,
        navigatorStandaloneType: typeof (window.navigator as any).standalone,
        displayModeStandalone: window.matchMedia('(display-mode: standalone)').matches,
        displayModeMatches: window.matchMedia('(display-mode: standalone)').matches,
        finalResult: isStandaloneMode,
        referrer: document.referrer,
        href: window.location.href,
      };
      
      console.log('🔍 [STANDALONE CHECK]', debugData);
      console.log('🔍 [STANDALONE CHECK] navigator.standalone raw value:', (window.navigator as any).standalone);
      console.log('🔍 [STANDALONE CHECK] Is it exactly true?', (window.navigator as any).standalone === true);
      console.log('🔍 [STANDALONE CHECK] Is it truthy?', !!(window.navigator as any).standalone);

      // Collect debug info
      setDebugInfo({
        userId,
        notificationAPI: 'Notification' in window,
        serviceWorkerAPI: 'serviceWorker' in navigator,
        pushManagerAPI: 'PushManager' in window,
        permission: Notification?.permission || 'N/A',
        userAgent: navigator.userAgent,
        isStandalone: isStandaloneMode,
        isIOS: isIOSDevice,
        // Extra iOS debug info
        navigatorStandalone: (window.navigator as any).standalone,
        navigatorStandaloneType: typeof (window.navigator as any).standalone,
        displayModeStandalone: window.matchMedia('(display-mode: standalone)').matches,
        referrer: document.referrer,
        href: window.location.href,
      });

      console.log('🔔 [SAFE] Debug info:', debugInfo);
    } catch (err) {
      console.error('❌ [SAFE] Error in useEffect:', err);
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [userId]);

  if (!userId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="w-5 h-5" />
            Configuration Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Missing User ID</AlertTitle>
            <AlertDescription>
              Unable to load notification settings. Please try logging out and back in.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Error Loading Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Component Error</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>{error}</p>
              <pre className="text-xs mt-2 p-2 bg-red-950/20 rounded overflow-auto">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="w-5 h-5" />
            Notifications Not Supported
          </CardTitle>
          <CardDescription>
            Push notifications are not supported in this browser.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <p className="text-sm mb-2">
                Your browser doesn't support push notifications.
              </p>
              <details className="text-xs">
                <summary className="cursor-pointer">Technical Details</summary>
                <pre className="mt-2 p-2 bg-muted rounded overflow-auto">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </details>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Check if iOS and not standalone
  const isIOSNotStandalone = debugInfo.isIOS && !debugInfo.isStandalone;

  return (
    <div className="space-y-6">
      {/* iOS Installation Required Alert */}
      {isIOSNotStandalone && (
        <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-900 dark:text-orange-100">
            📱 Installation Required
          </AlertTitle>
          <AlertDescription className="text-orange-800 dark:text-orange-200">
            <div className="space-y-3">
              <p className="text-sm">
                <strong>Push notifications don't work in Safari browser on iOS.</strong> You need to install Adoras as an app first:
              </p>
              <ol className="text-sm space-y-2 ml-4 list-decimal">
                <li>
                  Tap the <strong>Share</strong> button{" "}
                  <span className="inline-block px-2 py-0.5 bg-orange-100 dark:bg-orange-900 rounded text-xs">
                    ⬆️
                  </span>{" "}
                  at the bottom of Safari
                </li>
                <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                <li>Tap <strong>"Add"</strong></li>
                <li>Open Adoras from your <strong>home screen icon</strong> (not Safari)</li>
                <li>Return here to enable notifications</li>
              </ol>
              <div className="mt-3 p-2 bg-orange-100 dark:bg-orange-900/30 rounded text-xs">
                <strong>💡 Why?</strong> Apple only allows push notifications in installed PWA apps, not in Safari browser.
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Push Notifications
              </CardTitle>
              <CardDescription>
                Get notified about new memories and prompts
              </CardDescription>
            </div>
            <Badge variant={permission === 'granted' ? "default" : "secondary"}>
              {permission}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Installation Status for iOS */}
          {debugInfo.isIOS && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">App Installation Status:</span>
                <Badge variant={debugInfo.isStandalone ? "default" : "destructive"}>
                  {debugInfo.isStandalone ? "✅ Installed" : "❌ Not Installed"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {debugInfo.isStandalone 
                  ? "Great! The app is installed and running in standalone mode. Notifications should work."
                  : "You're viewing in Safari browser. Install to home screen to enable notifications."}
              </p>
            </div>
          )}

          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Diagnostic Information</AlertTitle>
            <AlertDescription>
              <div className="space-y-2">
                <p className="text-sm mb-2">
                  System capabilities and configuration:
                </p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Notification API:</span>
                    <Badge variant={debugInfo.notificationAPI ? "default" : "destructive"} className="text-xs">
                      {debugInfo.notificationAPI ? "✅ Yes" : "❌ No"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Service Worker API:</span>
                    <Badge variant={debugInfo.serviceWorkerAPI ? "default" : "destructive"} className="text-xs">
                      {debugInfo.serviceWorkerAPI ? "✅ Yes" : "❌ No"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Push Manager API:</span>
                    <Badge variant={debugInfo.pushManagerAPI ? "default" : "destructive"} className="text-xs">
                      {debugInfo.pushManagerAPI ? "✅ Yes" : "❌ No"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Permission Status:</span>
                    <Badge variant={debugInfo.permission === 'granted' ? "default" : "secondary"} className="text-xs">
                      {debugInfo.permission}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Platform:</span>
                    <Badge variant="outline" className="text-xs">
                      {debugInfo.isIOS ? "iOS" : "Other"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>PWA Mode:</span>
                    <Badge variant={debugInfo.isStandalone ? "default" : "secondary"} className="text-xs">
                      {debugInfo.isStandalone ? "Standalone" : "Browser"}
                    </Badge>
                  </div>
                </div>
                <details className="text-xs mt-3">
                  <summary className="cursor-pointer text-muted-foreground">View Raw Debug Data</summary>
                  <pre className="mt-2 p-2 bg-muted rounded overflow-auto max-h-64">
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </details>
              </div>
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button
              onClick={() => {
                console.log('🔔 Test button clicked');
                console.log('Debug Info:', debugInfo);
                if (isIOSNotStandalone) {
                  toast.error('Please install Adoras to home screen first!', {
                    duration: 5000,
                  });
                } else {
                  toast.success('Notification system check passed!');
                }
              }}
              className="flex-1"
              disabled={isIOSNotStandalone}
            >
              <Bell className="w-4 h-4 mr-2" />
              {isIOSNotStandalone ? "Install App First" : "Test Notifications"}
            </Button>
          </div>

          <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Safe Diagnostic Mode:</strong> This version helps identify configuration issues without crashing.
              {isIOSNotStandalone && (
                <p className="mt-2">
                  <strong>Action Required:</strong> Install the app to your home screen to enable full notification features.
                </p>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
