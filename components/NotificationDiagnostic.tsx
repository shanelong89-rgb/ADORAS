/**
 * Notification Diagnostic Tool
 * Helps debug iOS notification permission issues
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { 
  Bell, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Smartphone,
  RefreshCw,
  Info,
  Settings
} from 'lucide-react';

export function NotificationDiagnostic() {
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostics = () => {
    setIsRunning(true);
    
    // Gather all diagnostic information
    const info = {
      // Browser/Platform
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
      isSafari: /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent),
      
      // PWA Detection
      isStandalone: window.matchMedia('(display-mode: standalone)').matches || 
                   (window.navigator as any).standalone === true,
      displayMode: window.matchMedia('(display-mode: standalone)').matches ? 'standalone' :
                   window.matchMedia('(display-mode: fullscreen)').matches ? 'fullscreen' :
                   window.matchMedia('(display-mode: minimal-ui)').matches ? 'minimal-ui' : 'browser',
      
      // Notification API Support
      notificationAPISupported: 'Notification' in window,
      serviceWorkerSupported: 'serviceWorker' in navigator,
      pushManagerSupported: 'PushManager' in window,
      
      // Permission State
      notificationPermission: 'Notification' in window ? Notification.permission : 'not-supported',
      
      // Service Worker
      serviceWorkerRegistered: false,
      serviceWorkerActive: false,
      
      // Screen Info
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      
      // Other
      online: navigator.onLine,
      cookiesEnabled: navigator.cookieEnabled,
      timestamp: new Date().toISOString(),
    };
    
    // Check service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg) {
          info.serviceWorkerRegistered = true;
          info.serviceWorkerActive = reg.active !== null;
        }
        setDiagnostics(info);
        setIsRunning(false);
      }).catch(() => {
        setDiagnostics(info);
        setIsRunning(false);
      });
    } else {
      setDiagnostics(info);
      setIsRunning(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const getStatusIcon = (condition: boolean) => {
    return condition ? (
      <CheckCircle className="w-4 h-4 text-green-600" />
    ) : (
      <XCircle className="w-4 h-4 text-red-600" />
    );
  };

  const getStatusBadge = (condition: boolean) => {
    return (
      <Badge variant={condition ? 'default' : 'destructive'} className={condition ? 'bg-green-500' : ''}>
        {condition ? 'OK' : 'FAIL'}
      </Badge>
    );
  };

  if (!diagnostics) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Running diagnostics...</span>
        </CardContent>
      </Card>
    );
  }

  const isIOSReady = diagnostics.isIOS && 
                     diagnostics.isStandalone && 
                     diagnostics.notificationAPISupported;
  
  const canShowPrompt = diagnostics.notificationPermission === 'default';
  const permissionGranted = diagnostics.notificationPermission === 'granted';
  const permissionDenied = diagnostics.notificationPermission === 'denied';

  return (
    <div className="space-y-4">
      {/* Overall Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notification Diagnostic Report
            </CardTitle>
            <Button onClick={runDiagnostics} disabled={isRunning} size="sm" variant="outline">
              <RefreshCw className={`w-4 h-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          <CardDescription>
            System check for notification functionality
          </CardDescription>
        </CardHeader>
      </Card>

      {/* iOS-Specific Alerts */}
      {diagnostics.isIOS && !diagnostics.isStandalone && (
        <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-900 dark:text-orange-100">Not Installed as PWA</AlertTitle>
          <AlertDescription className="text-orange-800 dark:text-orange-200">
            <p className="text-sm mb-2">
              You must install Adoras to your home screen first:
            </p>
            <ol className="text-sm space-y-1 ml-4 list-decimal">
              <li>Tap the Share button <span className="inline-block px-2 py-0.5 bg-orange-100 dark:bg-orange-900 rounded text-xs">⬆️</span></li>
              <li>Scroll and tap "Add to Home Screen"</li>
              <li>Open Adoras from your home screen</li>
              <li>Return here to enable notifications</li>
            </ol>
          </AlertDescription>
        </Alert>
      )}

      {diagnostics.isIOS && diagnostics.isStandalone && permissionDenied && (
        <Alert className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-900 dark:text-red-100">Permission Denied in iOS Settings</AlertTitle>
          <AlertDescription className="text-red-800 dark:text-red-200 space-y-3">
            <p className="text-sm">
              Notifications are blocked in iOS Settings. To fix this:
            </p>
            <ol className="text-sm space-y-1 ml-4 list-decimal">
              <li>Open iPhone <strong>Settings</strong> app</li>
              <li>Scroll down and find <strong>Adoras</strong></li>
              <li>Tap <strong>Notifications</strong></li>
              <li>Turn ON <strong>Allow Notifications</strong></li>
              <li>Return to Adoras and try again</li>
            </ol>
            <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <p className="text-xs font-medium">⚠️ iOS caches permission state</p>
              <p className="text-xs mt-1">
                If you previously denied permission, iOS will NOT show the prompt again until you enable it in Settings.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {diagnostics.isIOS && diagnostics.isStandalone && canShowPrompt && (
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-900 dark:text-blue-100">Ready for Permission Request</AlertTitle>
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            <p className="text-sm">
              ✅ Your device is ready! Go to Settings → Notifications and tap "Enable Notifications" to see the iOS permission prompt.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {diagnostics.isIOS && diagnostics.isStandalone && permissionGranted && (
        <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-900 dark:text-green-100">Notifications Enabled!</AlertTitle>
          <AlertDescription className="text-green-800 dark:text-green-200">
            <p className="text-sm">
              🎉 Everything is working! You'll receive notification banners when messages arrive.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Platform Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            Platform Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm font-medium">iOS Device</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(diagnostics.isIOS)}
              <span className="text-sm">{diagnostics.isIOS ? 'Yes' : 'No'}</span>
            </div>
          </div>

          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm font-medium">Safari Browser</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(diagnostics.isSafari)}
              <span className="text-sm">{diagnostics.isSafari ? 'Yes' : 'No'}</span>
            </div>
          </div>

          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm font-medium">Installed as PWA</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(diagnostics.isStandalone)}
              <span className="text-sm">{diagnostics.isStandalone ? 'Yes' : 'No'}</span>
            </div>
          </div>

          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm font-medium">Display Mode</span>
            <Badge variant="outline" className="text-xs">
              {diagnostics.displayMode}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* API Support */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            API Support
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm font-medium">Notification API</span>
            <div className="flex items-center gap-2">
              {getStatusBadge(diagnostics.notificationAPISupported)}
            </div>
          </div>

          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm font-medium">Service Worker</span>
            <div className="flex items-center gap-2">
              {getStatusBadge(diagnostics.serviceWorkerSupported)}
            </div>
          </div>

          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm font-medium">Push Manager</span>
            <div className="flex items-center gap-2">
              {getStatusBadge(diagnostics.pushManagerSupported)}
            </div>
          </div>

          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm font-medium">Service Worker Registered</span>
            <div className="flex items-center gap-2">
              {getStatusBadge(diagnostics.serviceWorkerRegistered)}
            </div>
          </div>

          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm font-medium">Service Worker Active</span>
            <div className="flex items-center gap-2">
              {getStatusBadge(diagnostics.serviceWorkerActive)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permission Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Permission Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <span className="text-sm font-medium">Current Permission</span>
            <Badge 
              variant={permissionGranted ? 'default' : permissionDenied ? 'destructive' : 'secondary'}
              className={permissionGranted ? 'bg-green-500' : ''}
            >
              {diagnostics.notificationPermission}
            </Badge>
          </div>

          {permissionDenied && (
            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-2">
                🔒 iOS Permission Cache Issue
              </p>
              <p className="text-xs text-yellow-800 dark:text-yellow-200 mb-3">
                iOS has cached your "deny" decision. The browser will NOT show the permission prompt again.
              </p>
              <p className="text-xs text-yellow-800 dark:text-yellow-200 font-medium">
                Only fix: Enable in iOS Settings → Adoras → Notifications
              </p>
            </div>
          )}

          {canShowPrompt && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                ✅ Ready to Request Permission
              </p>
              <p className="text-xs text-blue-800 dark:text-blue-200">
                You haven't been asked yet. When you tap "Enable Notifications", iOS will show the permission prompt.
              </p>
            </div>
          )}

          {permissionGranted && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
                🎉 Permission Granted!
              </p>
              <p className="text-xs text-green-800 dark:text-green-200">
                Notifications are enabled. You'll receive iOS banners when messages arrive.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-4 h-4" />
            System Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between py-1 text-xs">
            <span className="text-muted-foreground">Online</span>
            <span>{diagnostics.online ? 'Yes' : 'No'}</span>
          </div>
          <div className="flex items-center justify-between py-1 text-xs">
            <span className="text-muted-foreground">Cookies</span>
            <span>{diagnostics.cookiesEnabled ? 'Enabled' : 'Disabled'}</span>
          </div>
          <div className="flex items-center justify-between py-1 text-xs">
            <span className="text-muted-foreground">Screen</span>
            <span>{diagnostics.screenWidth} × {diagnostics.screenHeight}</span>
          </div>
          <div className="flex items-center justify-between py-1 text-xs">
            <span className="text-muted-foreground">Window</span>
            <span>{diagnostics.windowWidth} × {diagnostics.windowHeight}</span>
          </div>
          <div className="py-1 text-xs">
            <p className="text-muted-foreground mb-1">User Agent:</p>
            <p className="font-mono text-[10px] break-all bg-muted p-2 rounded">
              {diagnostics.userAgent}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Copy Report */}
      <Card>
        <CardContent className="pt-6">
          <Button
            onClick={() => {
              const report = JSON.stringify(diagnostics, null, 2);
              navigator.clipboard.writeText(report).then(() => {
                alert('Diagnostic report copied to clipboard!');
              });
            }}
            variant="outline"
            className="w-full"
          >
            Copy Full Report
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
