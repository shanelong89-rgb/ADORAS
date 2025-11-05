/**
 * iOS Notification Help Component
 * Quick visual guide to enable notifications in iOS Settings
 * Shows in NotificationSettings when notifications are not working
 */

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Settings, Bell, CheckCircle2, ArrowRight, Smartphone } from 'lucide-react';

interface IOSNotificationHelpProps {
  onShowFullGuide?: () => void;
}

export function IOSNotificationHelp({ onShowFullGuide }: IOSNotificationHelpProps) {
  return (
    <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
      <Bell className="h-4 w-4 text-blue-600" />
      <AlertTitle className="text-blue-900 dark:text-blue-100">
        📱 One More Step for iOS Notifications
      </AlertTitle>
      <AlertDescription className="text-blue-800 dark:text-blue-200 space-y-3">
        <p className="text-sm">
          You've enabled notifications in Adoras! Now you need to enable them in your iPhone Settings:
        </p>
        
        {/* Quick Steps */}
        <Card className="border-blue-300 bg-white/50 dark:bg-blue-900/20">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-start gap-2 text-sm">
              <Settings className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Step 1:</strong> Open <strong>Settings</strong> app
              </div>
            </div>
            
            <div className="flex items-start gap-2 text-sm">
              <ArrowRight className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Step 2:</strong> Scroll down to <strong>Adoras</strong>
              </div>
            </div>
            
            <div className="flex items-start gap-2 text-sm">
              <Smartphone className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Step 3:</strong> Tap <strong>Notifications</strong>
              </div>
            </div>
            
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Step 4:</strong> Toggle <strong>Allow Notifications</strong> ON
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-blue-700 dark:text-blue-300">
          💡 <strong>Why?</strong> iOS requires you to manually enable notifications in Settings for all web apps. 
          This is a security feature. Once enabled, you'll receive notification banners just like iMessage!
        </p>

        {onShowFullGuide && (
          <Button
            onClick={onShowFullGuide}
            variant="outline"
            size="sm"
            className="w-full border-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30"
          >
            <Settings className="w-4 h-4 mr-2" />
            Show Detailed Step-by-Step Guide
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
