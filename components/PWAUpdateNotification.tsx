import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { RefreshCw, X } from 'lucide-react';
import { pwaInstaller } from '../utils/pwaInstaller';

export function PWAUpdateNotification() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Listen for service worker updates
    const unsubscribe = pwaInstaller.onUpdateAvailable(() => {
      console.log('🆕 App update available');
      setShowUpdate(true);
    });

    return unsubscribe;
  }, []);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await pwaInstaller.forceUpdate();
      // Page will reload after update
    } catch (error) {
      console.error('Failed to update:', error);
      setIsUpdating(false);
      // Fallback to manual reload
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    setShowUpdate(false);
    // Show again after 1 hour
    setTimeout(() => {
      setShowUpdate(true);
    }, 60 * 60 * 1000);
  };

  if (!showUpdate) {
    return null;
  }

  return (
    <Card className="fixed top-4 left-4 right-4 z-50 shadow-lg border-2 border-primary/20 animate-fade-in mx-auto max-w-md">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm mb-1" style={{ fontFamily: 'Archivo' }}>
              Update Available
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              A new version of Adoras is available. Update now to get the latest features and improvements.
            </p>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleUpdate}
                size="sm"
                disabled={isUpdating}
                className="bg-primary text-white"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isUpdating ? 'animate-spin' : ''}`} />
                {isUpdating ? 'Updating...' : 'Update Now'}
              </Button>
              <Button 
                onClick={handleDismiss}
                size="sm"
                variant="ghost"
                disabled={isUpdating}
              >
                Later
              </Button>
            </div>
          </div>
          
          <button
            onClick={handleDismiss}
            disabled={isUpdating}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Card>
  );
}
