import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Share, Plus, Home, Check } from 'lucide-react';
import { pwaInstaller } from '../utils/pwaInstaller';
import { motion, AnimatePresence } from 'motion/react';

interface IOSInstallPromptProps {
  variant?: 'button' | 'inline';
  className?: string;
}

export function IOSInstallPrompt({ variant = 'button', className = '' }: IOSInstallPromptProps) {
  const [showInstructions, setShowInstructions] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isSafari, setIsSafari] = useState(false);

  useEffect(() => {
    // Check if iOS
    const status = pwaInstaller.getStatus();
    const isIOSDevice = status.platform === 'ios';
    setIsIOS(isIOSDevice);
    setIsInstalled(status.isInstalled);

    // Check if Safari (required for iOS PWA installation)
    const ua = navigator.userAgent.toLowerCase();
    const isSafariBrowser = /safari/.test(ua) && !/chrome|crios|fxios/.test(ua);
    setIsSafari(isSafariBrowser);
  }, []);

  // Don't show if not iOS or already installed
  if (!isIOS || isInstalled) {
    return null;
  }

  const handleShowInstructions = () => {
    setShowInstructions(true);
  };

  return (
    <>
      {variant === 'button' ? (
        <Button
          onClick={handleShowInstructions}
          variant="outline"
          className={`w-full h-10 sm:h-12 bg-white/10 hover:bg-white/20 text-white hover:text-white border border-white/30 rounded-full backdrop-blur-sm ${className}`}
          style={{ fontFamily: 'Inter', letterSpacing: '-0.02em' }}
        >
          <Home className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
          Add to Home Screen
        </Button>
      ) : (
        <button
          onClick={handleShowInstructions}
          className={`text-white/80 hover:text-white text-xs sm:text-sm underline ${className}`}
          style={{ fontFamily: 'Inter' }}
        >
          Install as App
        </button>
      )}

      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Archivo' }}>
              Install Adoras
            </DialogTitle>
            <DialogDescription style={{ fontFamily: 'Inter' }}>
              {isSafari ? (
                "Follow these steps to add Adoras to your home screen"
              ) : (
                "Please open this page in Safari to install Adoras"
              )}
            </DialogDescription>
          </DialogHeader>

          {isSafari ? (
            <div className="space-y-6 py-4">
              {/* Step 1 */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="font-semibold text-primary" style={{ fontFamily: 'Archivo' }}>1</span>
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-sm mb-2" style={{ fontFamily: 'Inter' }}>
                    Tap the <strong>Share</strong> button at the bottom of Safari
                  </p>
                  <div className="bg-gray-100 rounded-lg p-3 inline-flex items-center gap-2">
                    <Share className="w-5 h-5 text-blue-500" />
                    <span className="text-xs text-muted-foreground">Share button</span>
                  </div>
                </div>
              </motion.div>

              {/* Step 2 */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="font-semibold text-primary" style={{ fontFamily: 'Archivo' }}>2</span>
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-sm mb-2" style={{ fontFamily: 'Inter' }}>
                    Scroll down and tap <strong>"Add to Home Screen"</strong>
                  </p>
                  <div className="bg-gray-100 rounded-lg p-3 inline-flex items-center gap-2">
                    <Plus className="w-5 h-5 text-gray-700" />
                    <span className="text-xs text-muted-foreground">Add to Home Screen</span>
                  </div>
                </div>
              </motion.div>

              {/* Step 3 */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="font-semibold text-primary" style={{ fontFamily: 'Archivo' }}>3</span>
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-sm mb-2" style={{ fontFamily: 'Inter' }}>
                    Tap <strong>"Add"</strong> to install Adoras
                  </p>
                  <div className="bg-primary/10 rounded-lg p-3 inline-flex items-center gap-2">
                    <Check className="w-5 h-5 text-primary" />
                    <span className="text-xs text-primary font-medium">Done!</span>
                  </div>
                </div>
              </motion.div>

              {/* Visual Preview */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-6 text-center"
              >
                <div className="inline-flex flex-col items-center gap-2">
                  <div className="w-16 h-16 bg-primary rounded-2xl shadow-lg flex items-center justify-center">
                    <Home className="w-8 h-8 text-white" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium">Adoras</p>
                    <p className="text-[10px] text-muted-foreground">
                      Will appear on your home screen
                    </p>
                  </div>
                </div>
              </motion.div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-xs text-blue-900" style={{ fontFamily: 'Inter' }}>
                  💡 <strong>Tip:</strong> Once installed, Adoras will open in fullscreen mode like a native app!
                </p>
              </div>
            </div>
          ) : (
            // Not Safari - show instruction to switch browser
            <div className="space-y-4 py-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-900 mb-2" style={{ fontFamily: 'Inter' }}>
                  <strong>Safari Required</strong>
                </p>
                <p className="text-xs text-amber-800" style={{ fontFamily: 'Inter' }}>
                  To install Adoras on your iPhone, you need to open this page in Safari browser.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium" style={{ fontFamily: 'Inter' }}>
                  How to switch to Safari:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground" style={{ fontFamily: 'Inter' }}>
                  <li>Copy this page's URL</li>
                  <li>Open Safari app</li>
                  <li>Paste the URL and visit the page</li>
                  <li>Tap "Add to Home Screen"</li>
                </ol>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              onClick={() => setShowInstructions(false)}
              variant="outline"
              style={{ fontFamily: 'Inter' }}
            >
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
