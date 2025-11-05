import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { X, Share, Plus, ChevronRight } from 'lucide-react';
import { pwaInstaller } from '../utils/pwaInstaller';
import { motion, AnimatePresence } from 'motion/react';

export function SafariInstallBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    // Check if should show banner
    const status = pwaInstaller.getStatus();
    const isIOSDevice = status.platform === 'ios';
    const isInstalled = status.isInstalled;
    
    // Check if Safari
    const ua = navigator.userAgent.toLowerCase();
    const isSafari = /safari/.test(ua) && !/chrome|crios|fxios/.test(ua);
    
    // Check if user dismissed before
    const wasDismissed = localStorage.getItem('safari-install-banner-dismissed') === 'true';
    
    // Show banner only if:
    // - iOS device
    // - Not installed
    // - Using Safari
    // - Not previously dismissed
    if (isIOSDevice && !isInstalled && isSafari && !wasDismissed) {
      setShowBanner(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    setShowBanner(false);
    localStorage.setItem('safari-install-banner-dismissed', 'true');
  };

  const handleShowInstructions = () => {
    setShowInstructions(!showInstructions);
  };

  if (!showBanner || dismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-primary to-primary/90 text-white shadow-lg"
      >
        <div className="max-w-[1400px] mx-auto">
          {/* Main Banner */}
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="bg-white/20 rounded-full p-1.5">
                  <Share className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ fontFamily: 'Archivo', letterSpacing: '-0.02em' }}>
                    Install for Full-Screen Experience
                  </p>
                  <p className="text-xs text-white/80 truncate" style={{ fontFamily: 'Inter', letterSpacing: '-0.01em' }}>
                    Tap Share, then "Add to Home Screen"
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                onClick={handleShowInstructions}
                variant="ghost"
                size="sm"
                className="h-8 px-3 bg-white/20 hover:bg-white/30 text-white hover:text-white border-0"
              >
                <span className="hidden sm:inline text-xs mr-1">How</span>
                <ChevronRight className={`w-4 h-4 transition-transform ${showInstructions ? 'rotate-90' : ''}`} />
              </Button>
              <button
                onClick={handleDismiss}
                className="p-1 rounded-full hover:bg-white/20 transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Expandable Instructions */}
          <AnimatePresence>
            {showInstructions && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden border-t border-white/20"
              >
                <div className="px-4 py-4 space-y-3 bg-primary/40 backdrop-blur-sm">
                  {/* Step 1 */}
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-white/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold">1</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-1">Tap the Share button</p>
                      <div className="inline-flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1.5">
                        <Share className="w-4 h-4" />
                        <span className="text-xs">Bottom of Safari</span>
                      </div>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-white/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold">2</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-1">Scroll & tap "Add to Home Screen"</p>
                      <div className="inline-flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1.5">
                        <Plus className="w-4 h-4" />
                        <span className="text-xs">In the share menu</span>
                      </div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-white/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold">3</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-1">Tap "Add" to install</p>
                      <div className="bg-white/20 rounded-lg px-3 py-1.5">
                        <span className="text-xs">✨ Adoras will open full-screen like a native app!</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
