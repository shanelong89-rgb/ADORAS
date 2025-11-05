/**
 * Server Status Banner
 * Shows deployment status and provides clear instructions
 */

import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import { AlertCircle, CheckCircle, Loader2, RefreshCw, ExternalLink, Terminal, FileCode } from 'lucide-react';
import { checkServerHealth, getCachedServerStatus } from '../utils/serverHealth';

interface ServerStatusBannerProps {
  onDismiss?: () => void;
}

export function ServerStatusBanner({ onDismiss }: ServerStatusBannerProps) {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    checkHealth(false); // Use cached result on initial load
    
    // Auto-check every 60 seconds if offline
    const interval = setInterval(() => {
      if (status === 'offline') {
        checkHealth(false); // Use cached result
      }
    }, 60000); // Increased to 60 seconds to reduce unnecessary checks
    
    return () => clearInterval(interval);
  }, [status]);

  const checkHealth = async (forceRefresh = false) => {
    setIsRefreshing(true);
    const result = await checkServerHealth(forceRefresh);
    setStatus(result.online ? 'online' : 'offline');
    setLatency(result.latency ?? null);
    setIsRefreshing(false);
  };

  const handleRefresh = () => {
    checkHealth(true); // Only force refresh when user manually clicks
  };

  // Don't show banner if server is online
  if (status === 'online') {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-3 sm:p-4">
      <Alert variant={status === 'offline' ? 'destructive' : 'default'} className="shadow-lg border-2">
        <div className="flex items-start gap-3">
          {status === 'checking' && <Loader2 className="h-5 w-5 animate-spin mt-0.5 flex-shrink-0" />}
          {status === 'offline' && <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />}
          
          <div className="flex-1 min-w-0">
            <AlertTitle className="mb-2">
              {status === 'checking' && 'Checking Backend Server...'}
              {status === 'offline' && '🚀 Backend Deployment Required'}
            </AlertTitle>
            
            <AlertDescription>
              <div className="space-y-3">
                {status === 'offline' && (
                  <>
                    {/* Main Message */}
                    <p className="text-sm">
                      Your Adoras app is ready, but the backend server needs to be deployed to Supabase. 
                      <strong> All code is complete</strong> - just run the deployment script!
                    </p>

                    {/* Quick Actions */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setShowDetails(!showDetails)}
                        className="gap-2"
                      >
                        <Terminal className="h-4 w-4" />
                        {showDetails ? 'Hide' : 'Show'} Deploy Instructions
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="gap-2"
                      >
                        {isRefreshing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        Check Again
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
                        className="gap-2"
                      >
                        Supabase Dashboard
                        <ExternalLink className="h-3 w-3" />
                      </Button>

                      {onDismiss && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={onDismiss}
                        >
                          Dismiss
                        </Button>
                      )}
                    </div>

                    {/* Deployment Instructions */}
                    {showDetails && (
                      <div className="mt-3 p-4 bg-background/80 rounded-lg border border-border space-y-4 text-sm">
                        <div className="flex items-center gap-2">
                          <FileCode className="h-4 w-4" />
                          <p className="font-semibold">Quick Deploy (5 minutes)</p>
                        </div>
                        
                        <div className="space-y-3">
                          {/* Method 1: Automated Script */}
                          <div className="space-y-2">
                            <p className="font-semibold text-green-600 dark:text-green-400">
                              ⚡ Method 1: Automated Script (Easiest)
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Run the deployment script from your project directory:
                            </p>
                            <div className="space-y-2">
                              <div>
                                <p className="text-xs font-semibold mb-1">macOS / Linux:</p>
                                <pre className="bg-black/10 dark:bg-black/30 p-3 rounded overflow-x-auto text-xs">
{`chmod +x deploy.sh
./deploy.sh`}
                                </pre>
                              </div>
                              <div>
                                <p className="text-xs font-semibold mb-1">Windows:</p>
                                <pre className="bg-black/10 dark:bg-black/30 p-3 rounded overflow-x-auto text-xs">
{`deploy.bat`}
                                </pre>
                              </div>
                            </div>
                          </div>

                          {/* Method 2: Manual Commands */}
                          <div className="space-y-2 pt-2 border-t border-border/50">
                            <p className="font-semibold">📋 Method 2: Manual Commands</p>
                            <pre className="bg-black/10 dark:bg-black/30 p-3 rounded overflow-x-auto text-xs">
{`# Install CLI (if needed)
npm install -g supabase

# Login
supabase login

# Deploy
supabase link --project-ref cyaaksjydpegofrldxbo
supabase functions deploy make-server-deded1eb`}
                            </pre>
                          </div>

                          {/* Method 3: Dashboard */}
                          <div className="space-y-2 pt-2 border-t border-border/50">
                            <p className="font-semibold">🖱️ Method 3: Supabase Dashboard (No CLI)</p>
                            <ol className="list-decimal list-inside space-y-1 ml-2 text-xs">
                              <li>Go to <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-primary underline">Supabase Dashboard</a></li>
                              <li>Select project: <code className="bg-black/10 dark:bg-black/20 px-1 py-0.5 rounded">cyaaksjydpegofrldxbo</code></li>
                              <li>Navigate to <strong>Edge Functions</strong> → <strong>Deploy new function</strong></li>
                              <li>Upload <code className="bg-black/10 dark:bg-black/20 px-1 py-0.5 rounded">/supabase/functions/server/</code> folder</li>
                              <li>Name it: <code className="bg-black/10 dark:bg-black/20 px-1 py-0.5 rounded">make-server-deded1eb</code></li>
                            </ol>
                          </div>

                          {/* Verification */}
                          <div className="pt-3 border-t border-border/50 space-y-2">
                            <p className="text-xs font-semibold">✅ Verify Deployment:</p>
                            <pre className="bg-black/10 dark:bg-black/30 p-2 rounded overflow-x-auto text-xs">
{`curl https://cyaaksjydpegofrldxbo.supabase.co/functions/v1/make-server-deded1eb/health`}
                            </pre>
                            <p className="text-xs text-muted-foreground">
                              Expected: <code className="bg-black/10 dark:bg-black/20 px-1 py-0.5 rounded">{`{"status":"ok"}`}</code>
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              📖 <strong>Full guide:</strong> See <code className="bg-black/10 dark:bg-black/20 px-1 py-0.5 rounded">DEPLOY_NOW.md</code> in your project folder
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Status footer */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border/30">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                        <span>Server Offline</span>
                      </div>
                      {latency !== null && (
                        <span className="text-xs">• Last check: {latency}ms</span>
                      )}
                      <span className="ml-auto text-xs">Auto-checking every 30s</span>
                    </div>
                  </>
                )}
              </div>
            </AlertDescription>
          </div>
        </div>
      </Alert>
    </div>
  );
}