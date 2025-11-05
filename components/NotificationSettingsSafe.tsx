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

      // Collect debug info
      setDebugInfo({
        userId,
        notificationAPI: 'Notification' in window,
        serviceWorkerAPI: 'serviceWorker' in navigator,
        pushManagerAPI: 'PushManager' in window,
        permission: Notification?.permission || 'N/A',
        userAgent: navigator.userAgent,
        isStandalone: window.matchMedia('(display-mode: standalone)').matches,
        isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
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

  return (
    <div className="space-y-6">
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
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Debug Mode</AlertTitle>
            <AlertDescription>
              <p className="text-sm mb-2">
                This is a safe diagnostic version of the notification settings.
              </p>
              <details className="text-xs">
                <summary className="cursor-pointer">View Debug Info</summary>
                <pre className="mt-2 p-2 bg-muted rounded overflow-auto max-h-64">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </details>
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button
              onClick={() => {
                console.log('🔔 Test button clicked');
                toast.success('Notification settings are loading in safe mode');
              }}
              className="flex-1"
            >
              <Bell className="w-4 h-4 mr-2" />
              Test Button
            </Button>
          </div>

          <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Safe Mode Active:</strong> This simplified component is loaded to help diagnose the crash.
              Check the console for detailed debug information.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
