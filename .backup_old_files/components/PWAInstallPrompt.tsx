import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Download, X, Share, Plus, Smartphone } from 'lucide-react';
import { pwaInstaller, PWAStatus } from '../utils/pwaInstaller';

interface PWAInstallPromptProps {
  onClose?: () => void;
}

export function PWAInstallPrompt({ onClose }: PWAInstallPromptProps) {
  const [pwaStatus, setPwaStatus] = useState<PWAStatus | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Get initial status
    const status = pwaInstaller.getStatus();
    setPwaStatus(status);

    // Don't show if already installed
    if (status.isInstalled) {
      return;
    }

    // Check if user previously dismissed
    const wasDismissed = localStorage.getItem('pwa-install-dismissed');
    if (wasDismissed) {
      setDismissed(true);
      return;
    }

    // Show prompt after 3 seconds if installable
    const timer = setTimeout(() => {
      if (status.canInstall || status.platform === 'ios') {
        setShowPrompt(true);
      }
    }, 3000);

    // Listen for install availability changes
    const unsubscribe = pwaInstaller.onInstallAvailable((canInstall) => {
      const newStatus = pwaInstaller.getStatus();
      setPwaStatus(newStatus);
      
      if (canInstall && !wasDismissed) {
        setShowPrompt(true);
      }
    });

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  const handleInstall = async () => {
    if (!pwaStatus) return;

    // Handle iOS separately
    if (pwaStatus.platform === 'ios') {
      setShowIOSInstructions(true);
      return;
    }

    // Handle Android/Desktop
    const result = await pwaInstaller.showInstallPrompt();
    
    if (result === 'accepted') {
      setShowPrompt(false);
      onClose?.();
    } else if (result === 'dismissed') {
      handleDismiss();
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
    onClose?.();
  };

  const handleCloseIOSInstructions = () => {
    setShowIOSInstructions(false);
    handleDismiss();
  };

  // Don't render if conditions not met
  if (!pwaStatus || dismissed || pwaStatus.isInstalled || !showPrompt) {
    return null;
  }

  return (
    <>
      {/* Install Prompt Banner */}
      <Card className="fixed bottom-[5.5rem] left-4 right-4 z-50 shadow-lg border-2 border-primary/20 animate-fade-in mx-auto max-w-md">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-primary" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base mb-1" style={{ fontFamily: 'Archivo' }}>
                Install Adoras
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Install our app for a better experience with offline access and quick launch from your home screen.
              </p>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleInstall}
                  size="sm"
                  className="bg-primary text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Install App
                </Button>
                <Button 
                  onClick={handleDismiss}
                  size="sm"
                  variant="ghost"
                >
                  Not Now
                </Button>
              </div>
            </div>
            
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </Card>

      {/* iOS Install Instructions Dialog */}
      <Dialog open={showIOSInstructions} onOpenChange={handleCloseIOSInstructions}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              Install Adoras on iOS
            </DialogTitle>
            <DialogDescription>
              Follow these steps to add Adoras to your home screen:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Step 1 */}
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                1
              </div>
              <div className="flex-1 pt-1">
                <p className="text-sm">
                  Tap the <strong>Share</strong> button <Share className="inline w-4 h-4 mx-1" /> at the bottom of your browser
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                2
              </div>
              <div className="flex-1 pt-1">
                <p className="text-sm">
                  Scroll down and tap <strong>"Add to Home Screen"</strong> <Plus className="inline w-4 h-4 mx-1" />
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                3
              </div>
              <div className="flex-1 pt-1">
                <p className="text-sm">
                  Tap <strong>"Add"</strong> in the top right to install Adoras
                </p>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 mt-4">
              <p className="text-xs text-muted-foreground">
                💡 Once installed, Adoras will launch like a native app and work offline!
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleCloseIOSInstructions} className="w-full">
              Got It!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Compact install button for settings/menu
export function PWAInstallButton() {
  const [pwaStatus, setPwaStatus] = useState<PWAStatus | null>(null);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    const status = pwaInstaller.getStatus();
    setPwaStatus(status);

    const unsubscribe = pwaInstaller.onInstallAvailable(() => {
      const newStatus = pwaInstaller.getStatus();
      setPwaStatus(newStatus);
    });

    return unsubscribe;
  }, []);

  const handleInstall = async () => {
    if (!pwaStatus) return;

    if (pwaStatus.platform === 'ios') {
      setShowIOSInstructions(true);
      return;
    }

    await pwaInstaller.showInstallPrompt();
  };

  // Don't show button if already installed or not installable
  if (!pwaStatus || pwaStatus.isInstalled || (!pwaStatus.canInstall && pwaStatus.platform !== 'ios')) {
    return null;
  }

  return (
    <>
      <Button 
        onClick={handleInstall}
        variant="outline"
        size="sm"
        className="w-full justify-start"
      >
        <Download className="w-4 h-4 mr-2" />
        Install App
      </Button>

      {/* iOS Instructions Dialog */}
      <Dialog open={showIOSInstructions} onOpenChange={setShowIOSInstructions}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              Install Adoras on iOS
            </DialogTitle>
            <DialogDescription>
              Follow these steps to add Adoras to your home screen:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">1</div>
              <div className="flex-1 pt-1">
                <p className="text-sm">Tap the <strong>Share</strong> button <Share className="inline w-4 h-4 mx-1" /></p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">2</div>
              <div className="flex-1 pt-1">
                <p className="text-sm">Tap <strong>"Add to Home Screen"</strong> <Plus className="inline w-4 h-4 mx-1" /></p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">3</div>
              <div className="flex-1 pt-1">
                <p className="text-sm">Tap <strong>"Add"</strong> to install</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowIOSInstructions(false)} className="w-full">
              Got It!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}