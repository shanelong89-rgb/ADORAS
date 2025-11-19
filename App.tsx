// Cache bust: 2024-11-08-11-15-COMPLETE-MOCK-ALL-EXPORTS
import React, { useEffect } from 'react';
import { PWAMetaTags } from './components/PWAMetaTags';
import { PWAUpdateNotification } from './components/PWAUpdateNotification';
import { ErrorBoundary } from './components/ErrorBoundary'; // Phase 3f
import { DebugPanel, useDebugPanel } from './components/DebugPanel'; // Phase 3f
import { ServerStatusBanner } from './components/ServerStatusBanner'; // Backend deployment status
import { GroqAPIKeySetup } from './components/GroqAPIKeySetup'; // Groq API key configuration
import { MobileAuthDiagnostic } from './components/MobileAuthDiagnostic'; // Mobile auth diagnostic
import { ChromeLoginFix } from './components/ChromeLoginFix'; // Chrome login fix
import { SimpleLoginTest } from './components/SimpleLoginTest'; // Simple login test
import { AuthProvider } from './utils/api/AuthContext';
import { AppContent } from './components/AppContent';
import { Toaster } from 'sonner';
import { setupGlobalErrorHandlers } from './utils/errorLogger'; // Phase 3f
import { initPerformanceMonitoring } from './utils/performanceMonitor'; // Phase 3f
import { pwaInstaller } from './utils/pwaInstaller'; // PWA and Service Worker

export type UserType = 'keeper' | 'teller' | null;
export type AppLanguage = 'english' | 'spanish' | 'french' | 'chinese' | 'korean' | 'japanese';

export interface UserProfile {
  id: string;
  name: string;
  age?: number;
  relationship: string;
  bio: string;
  photo?: string;
  avatarZoom?: number;
  avatarRotation?: number;
  inviteCode?: string;
  email?: string;
  birthday?: Date;
  phoneNumber?: string;
  appLanguage?: AppLanguage;
  // Privacy & Security Settings
  privacySettings?: {
    privateProfile?: boolean;
    shareLocationData?: boolean;
  };
}

export interface Storyteller {
  id: string;
  name: string;
  relationship: string;
  bio: string;
  photo?: string;
  isConnected: boolean;
  lastMessage?: string;
  lastMessageTime?: Date;
}

export interface LegacyKeeper {
  id: string;
  name: string;
  relationship: string;
  bio: string;
  photo?: string;
  isConnected: boolean;
  lastMessage?: string;
  lastMessageTime?: Date;
}

export interface Memory {
  id: string;
  type: 'text' | 'photo' | 'voice' | 'video' | 'document';
  content: string;
  sender: 'keeper' | 'teller';
  timestamp: Date;
  category?: string;
  estimatedDate?: string;
  tags: string[];
  readBy?: string[]; // User IDs who have read this message
  transcript?: string;
  originalText?: string;
  promptQuestion?: string;
  conversationContext?: string;
  voiceLanguage?: string;
  voiceLanguageCode?: string;
  transcriptionShown?: boolean;
  translationShown?: boolean;
  englishTranslation?: string;
  isPlaying?: boolean;
  audioUrl?: string;
  audioBlob?: string;
  note?: string; // For user notes on memories
  notes?: string; // Legacy support
  location?: string;
  photoUrl?: string;
  photoDate?: Date;
  photoLocation?: string;
  photoGPSCoordinates?: { latitude: number; longitude: number };
  detectedPeople?: string[];
  detectedFaces?: number;
  videoUrl?: string;
  videoThumbnail?: string;
  videoDate?: Date;
  videoLocation?: string;
  videoGPSCoordinates?: { latitude: number; longitude: number };
  videoPeople?: string[];
  videoFaces?: number;
  voiceVisualReference?: string;
  documentUrl?: string;
  documentType?: string;
  documentFileName?: string;
  documentScannedText?: string;
  documentPageCount?: number;
  documentScanLanguage?: string;
}

export type DisplayLanguage = 'english' | 'french' | 'chinese' | 'korean' | 'japanese' | 'all';

export default function App() {
  const { isOpen, setIsOpen } = useDebugPanel(); // Phase 3f
  const [groqDialogOpen, setGroqDialogOpen] = React.useState(false); // Don't auto-open, user can open from settings

  // Check if diagnostic mode is enabled via URL parameter
  const isDiagnosticMode = new URLSearchParams(window.location.search).get('diagnostic') === 'true';
  // Check if Chrome fix mode is enabled
  const isChromeFixMode = new URLSearchParams(window.location.search).get('chromefix') === 'true';
  // Check if simple test mode is enabled
  const isSimpleTestMode = new URLSearchParams(window.location.search).get('test') === 'true';

  useEffect(() => {
    // Phase 3f: Setup global error handlers and performance monitoring
    const cleanupErrorHandlers = setupGlobalErrorHandlers();
    const cleanupPerformanceMonitoring = initPerformanceMonitoring();
    console.log('✅ Phase 3f: Error tracking and performance monitoring initialized');

    // Initialize PWA and register service worker immediately
    console.log('📱 Initializing PWA and service worker...');

    // Detect if running in preview environment
    const isPreview = window.location.hostname.includes('figma.site') ||
                      window.location.hostname.includes('figmaiframepreview');

    pwaInstaller.registerServiceWorker().then((registration) => {
      if (registration) {
        console.log('✅ Service worker registered on app load');
      } else {
        // Don't show warning in preview - it's expected
        if (isPreview) {
          console.log('ℹ️ Service worker not available in preview (expected - will work in production)');
        } else {
          console.log('ℹ️ Service worker not registered (may be unsupported or unavailable)');
        }
      }
    }).catch((error) => {
      console.error('❌ Service worker registration error:', error);
    });
    return () => {
      cleanupErrorHandlers();
      cleanupPerformanceMonitoring();
    };
  }, []);

  // Show simple test if test mode is enabled
  if (isSimpleTestMode) {
    return (
      <ErrorBoundary>
        <SimpleLoginTest />
      </ErrorBoundary>
    );
  }

  // Show Chrome fix tool if chromefix mode is enabled
  if (isChromeFixMode) {
    return (
      <ErrorBoundary>
        <div className="fixed inset-0 overflow-y-auto" style={{
          paddingTop: 'env(safe-area-inset-top, 0)',
          paddingBottom: 'env(safe-area-inset-bottom, 0)',
          backgroundColor: 'rgb(245, 249, 233)'
        }}>
          <ChromeLoginFix />
          <Toaster
            position="top-center"
            richColors
            toastOptions={{ style: { fontFamily: 'Inter, sans-serif' } }}
          />
        </div>
      </ErrorBoundary>
    );
  }

  // Show diagnostic tool if diagnostic mode is enabled
  if (isDiagnosticMode) {
    return (
      <ErrorBoundary>
        <div className="fixed inset-0 overflow-y-auto" style={{
          paddingTop: 'env(safe-area-inset-top, 0)',
          paddingBottom: 'env(safe-area-inset-bottom, 0)',
          backgroundColor: 'rgb(245, 249, 233)'
        }}>
          <MobileAuthDiagnostic />
          <Toaster
            position="top-center"
            richColors
            toastOptions={{ style: { fontFamily: 'Inter, sans-serif' } }}
          />
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      {/* Root container - Flexible height with safe area support */}
      <div
        className="w-full flex flex-col flex-1"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0)',
          paddingBottom: 'env(safe-area-inset-bottom, 0)',
          backgroundColor: 'rgb(245, 249, 233)'
        }}
      >
        {/* Main content area - Flexible scroll container */}
        <div
          className="flex-1 overflow-y-auto overflow-x-hidden"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
        >
          <AuthProvider>
            <AppContent style={{ overflow: 'visible' }} />
          </AuthProvider>
        </div>
        {/* Overlay components - Fixed positioning to not affect layout height */}
        <PWAMetaTags style={{ position: 'fixed', bottom: 0, width: '100%', zIndex: 9999 }} />
        <PWAUpdateNotification />
        <DebugPanel isOpen={isOpen} onClose={() => setIsOpen(false)} style={{ position: 'fixed', bottom: 0, width: '100%', zIndex: 9999 }} />
        <ServerStatusBanner style={{ position: 'fixed', bottom: 0, width: '100%', zIndex: 9999 }} />
        <GroqAPIKeySetup
          open={groqDialogOpen}
          onOpenChange={setGroqDialogOpen}
          style={{ position: 'fixed', bottom: 0, width: '100%', zIndex: 9999 }}
        />
        <Toaster
          position="top-center"
          richColors
          toastOptions={{ style: { fontFamily: 'Inter, sans-serif' } }}
        />
      </div>
    </ErrorBoundary>
  );
}
