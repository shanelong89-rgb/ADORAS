import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { copyToClipboard } from '../utils/clipboard';
import { toast } from 'sonner';

/**
 * PWA Diagnostic Tool
 * Helps debug icon and fullscreen issues
 * Shows real-time status of PWA configuration
 */
export const PWADiagnostic: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any>(null);

  const runDiagnostics = () => {
    const isStandalone = window.navigator.standalone || 
                        window.matchMedia('(display-mode: standalone)').matches;
    
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
    const manifestUrl = manifestLink?.href || 'Not found';
    
    const appleIcons = Array.from(document.querySelectorAll('link[rel="apple-touch-icon"]'))
      .map(link => ({
        href: (link as HTMLLinkElement).href,
        sizes: (link as HTMLLinkElement).sizes?.value || 'any'
      }));
    
    const metaTags = {
      capable: document.querySelector('meta[name="apple-mobile-web-app-capable"]')?.getAttribute('content'),
      statusBar: document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')?.getAttribute('content'),
      title: document.querySelector('meta[name="apple-mobile-web-app-title"]')?.getAttribute('content'),
      themeColor: document.querySelector('meta[name="theme-color"]')?.getAttribute('content')
    };
    
    const iconGenUrl = (window as any).__adorasIconUrl || 'Not generated yet';
    
    setDiagnostics({
      isStandalone,
      isIOS,
      manifestUrl,
      appleIcons,
      metaTags,
      iconGenUrl,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    });
    
    setIsOpen(true);
  };

  if (!diagnostics) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={runDiagnostics}
          variant="outline"
          size="sm"
          className="bg-white shadow-lg"
        >
          🔍 PWA Debug
        </Button>
      </div>
    );
  }

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <Card className="w-full max-w-2xl bg-white p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-['Archivo']" style={{ fontSize: '1.875rem', letterSpacing: '-0.05em' }}>
                PWA Diagnostics
              </h2>
              <Button
                onClick={() => setIsOpen(false)}
                variant="ghost"
                size="sm"
              >
                ✕
              </Button>
            </div>

            <div className="space-y-4">
              {/* Standalone Mode */}
              <DiagnosticItem
                label="Fullscreen Mode"
                value={diagnostics.isStandalone ? 'Active' : 'Not Active'}
                status={diagnostics.isStandalone ? 'success' : 'error'}
                detail={diagnostics.isStandalone ? 
                  'App is running in fullscreen/standalone mode' : 
                  'App is running in browser mode - reinstall from home screen'
                }
              />

              {/* iOS Detection */}
              <DiagnosticItem
                label="Platform"
                value={diagnostics.isIOS ? 'iOS Device' : 'Non-iOS Device'}
                status={diagnostics.isIOS ? 'success' : 'warning'}
                detail={diagnostics.userAgent}
              />

              {/* Manifest */}
              <DiagnosticItem
                label="Manifest"
                value={diagnostics.manifestUrl}
                status={diagnostics.manifestUrl !== 'Not found' ? 'success' : 'error'}
                detail="PWA manifest file location"
              />

              {/* Icon Generator */}
              <DiagnosticItem
                label="Dynamic Icon"
                value={diagnostics.iconGenUrl.startsWith('blob:') ? 'Generated' : 'Not Generated'}
                status={diagnostics.iconGenUrl.startsWith('blob:') ? 'success' : 'warning'}
                detail={diagnostics.iconGenUrl}
              />

              {/* Apple Icons */}
              <div className="border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  {diagnostics.appleIcons.length > 0 ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span className="font-['Inter']" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                    Apple Touch Icons ({diagnostics.appleIcons.length})
                  </span>
                </div>
                {diagnostics.appleIcons.length > 0 ? (
                  <div className="space-y-1 ml-6">
                    {diagnostics.appleIcons.map((icon: any, i: number) => (
                      <div key={i} className="text-xs text-gray-600">
                        {icon.sizes}: {icon.href.substring(0, 50)}...
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="ml-6 text-xs text-red-600">
                    No apple-touch-icon tags found
                  </div>
                )}
              </div>

              {/* Meta Tags */}
              <div className="border rounded-lg p-3">
                <div className="font-['Inter']" style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  iOS Meta Tags
                </div>
                <div className="space-y-1 ml-2 text-xs">
                  <MetaStatus label="app-capable" value={diagnostics.metaTags.capable} expected="yes" />
                  <MetaStatus label="status-bar-style" value={diagnostics.metaTags.statusBar} expected="black-translucent" />
                  <MetaStatus label="app-title" value={diagnostics.metaTags.title} expected="Adoras" />
                  <MetaStatus label="theme-color" value={diagnostics.metaTags.themeColor} expected="#36453B" />
                </div>
              </div>

              {/* Viewport */}
              <DiagnosticItem
                label="Viewport"
                value={`${diagnostics.viewport.width} × ${diagnostics.viewport.height}`}
                status="success"
                detail="Current window dimensions"
              />

              {/* Recommendations */}
              <div className="border-t pt-4 mt-4">
                <h3 className="font-['Inter']" style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Recommendations:
                </h3>
                <div className="space-y-2 text-sm">
                  {!diagnostics.isStandalone && (
                    <div className="flex gap-2 text-red-700">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong>Not in fullscreen mode.</strong> Delete the app and reinstall from Safari's "Add to Home Screen".
                      </div>
                    </div>
                  )}
                  {!diagnostics.iconGenUrl.startsWith('blob:') && (
                    <div className="flex gap-2 text-yellow-700">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong>Icon not generated.</strong> IconGenerator may not have loaded. Refresh the page.
                      </div>
                    </div>
                  )}
                  {diagnostics.appleIcons.length === 0 && (
                    <div className="flex gap-2 text-red-700">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong>No iOS icons.</strong> The HTML may not have loaded properly.
                      </div>
                    </div>
                  )}
                  {diagnostics.isStandalone && diagnostics.iconGenUrl.startsWith('blob:') && (
                    <div className="flex gap-2 text-green-700">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong>Everything looks good!</strong> If you still see issues, try reinstalling.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={() => {
                    window.location.reload();
                  }}
                  variant="outline"
                  size="sm"
                >
                  Reload App
                </Button>
                <Button
                  onClick={async () => {
                    const success = await copyToClipboard(JSON.stringify(diagnostics, null, 2));
                    if (success) {
                      toast.success('Diagnostics copied to clipboard!');
                    } else {
                      toast.error('Failed to copy diagnostics');
                    }
                  }}
                  variant="outline"
                  size="sm"
                >
                  Copy Data
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={runDiagnostics}
          variant="outline"
          size="sm"
          className="bg-white shadow-lg"
        >
          🔍 PWA Debug
        </Button>
      </div>
    </>
  );
};

const DiagnosticItem: React.FC<{
  label: string;
  value: string;
  status: 'success' | 'error' | 'warning';
  detail?: string;
}> = ({ label, value, status, detail }) => {
  const Icon = status === 'success' ? CheckCircle2 : status === 'error' ? XCircle : AlertCircle;
  const color = status === 'success' ? 'text-green-600' : status === 'error' ? 'text-red-600' : 'text-yellow-600';

  return (
    <div className="border rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="font-['Inter']" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
          {label}
        </span>
      </div>
      <div className="ml-6 text-sm font-['Inter']" style={{ fontWeight: 500 }}>
        {value}
      </div>
      {detail && (
        <div className="ml-6 text-xs text-gray-500 mt-1 break-all">
          {detail}
        </div>
      )}
    </div>
  );
};

const MetaStatus: React.FC<{
  label: string;
  value: string | null;
  expected: string;
}> = ({ label, value, expected }) => {
  const isCorrect = value === expected;
  return (
    <div className="flex items-center gap-2">
      {isCorrect ? (
        <CheckCircle2 className="w-3 h-3 text-green-600" />
      ) : (
        <XCircle className="w-3 h-3 text-red-600" />
      )}
      <span className={isCorrect ? 'text-green-700' : 'text-red-700'}>
        {label}: {value || 'missing'} {!isCorrect && `(expected: ${expected})`}
      </span>
    </div>
  );
};

export default PWADiagnostic;