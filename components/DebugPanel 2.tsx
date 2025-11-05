/**
 * Debug Panel Component for Adoras
 * Phase 3f: Developer diagnostics and debugging tools
 */

import React, { useState, useEffect } from 'react';
import { 
  Bug, 
  Activity, 
  Database, 
  Wifi, 
  HardDrive, 
  Download,
  Trash2,
  ChevronDown,
  ChevronUp,
  X,
  Users,
  Smartphone
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  getErrorLog, 
  getErrorStats, 
  clearErrorLog, 
  downloadErrorLog 
} from '../utils/errorLogger';
import { 
  getPerformanceStats, 
  getMemoryUsage, 
  clearMetrics, 
  downloadMetrics 
} from '../utils/performanceMonitor';
import { getCacheStats, clearAllCache } from '../utils/mediaCache';
import { getQueueStats, clearQueue } from '../utils/offlineQueue';
import { useNetworkStatus } from '../utils/networkStatus';
import { TestInvitationDebug } from './TestInvitationDebug';
import { InvitationDiagnostic } from './InvitationDiagnostic';
import { PWADiagnostic } from './PWADiagnostic';
import { PWAInstallPrompt } from './PWAInstallPrompt';
import { IconGenerator } from './IconGenerator';
import { MemoryLoadingDiagnostic } from './MemoryLoadingDiagnostic';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface DebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DebugPanel({ isOpen, onClose }: DebugPanelProps) {
  const [activeTab, setActiveTab] = useState<'errors' | 'performance' | 'cache' | 'network' | 'test' | 'memory'>('errors');
  const [errorStats, setErrorStats] = useState<any>(null);
  const [perfStats, setPerfStats] = useState<any>(null);
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [queueStats, setQueueStats] = useState<any>(null);
  const [memoryUsage, setMemoryUsage] = useState<any>(null);
  const networkStatus = useNetworkStatus();

  // Refresh stats
  const refreshStats = async () => {
    setErrorStats(getErrorStats());
    setPerfStats(getPerformanceStats());
    setCacheStats(await getCacheStats());
    setQueueStats(await getQueueStats());
    setMemoryUsage(getMemoryUsage());
  };

  useEffect(() => {
    if (isOpen) {
      refreshStats();
      
      // Auto-refresh every 5 seconds while open
      const interval = setInterval(refreshStats, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-[9999] flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-background w-full md:max-w-3xl md:rounded-lg shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Bug className="w-5 h-5 text-primary" />
            <h2 style={{ fontFamily: 'Archivo', letterSpacing: '0.05em' }}>
              Debug Panel
            </h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b overflow-x-auto">
          {[
            { id: 'errors', label: 'Errors', icon: Bug },
            { id: 'performance', label: 'Performance', icon: Activity },
            { id: 'cache', label: 'Storage', icon: HardDrive },
            { id: 'network', label: 'Network', icon: Wifi },
            { id: 'memory', label: 'Memories', icon: Database },
            { id: 'test', label: 'Test', icon: Users },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              style={{ fontFamily: 'Inter', letterSpacing: '0.025em' }}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'errors' && (
            <ErrorsTab errorStats={errorStats} onRefresh={refreshStats} />
          )}
          {activeTab === 'performance' && (
            <PerformanceTab perfStats={perfStats} memoryUsage={memoryUsage} onRefresh={refreshStats} />
          )}
          {activeTab === 'cache' && (
            <CacheTab cacheStats={cacheStats} queueStats={queueStats} onRefresh={refreshStats} />
          )}
          {activeTab === 'network' && (
            <NetworkTab networkStatus={networkStatus} />
          )}
          {activeTab === 'memory' && (
            <MemoryTab />
          )}
          {activeTab === 'test' && (
            <TestTab />
          )}
        </div>
      </div>
    </div>
  );
}

// Errors Tab
function ErrorsTab({ errorStats, onRefresh }: any) {
  const errors = getErrorLog();

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total" value={errorStats?.total || 0} />
        <StatCard label="Critical" value={errorStats?.bySeverity?.critical || 0} color="red" />
        <StatCard label="High" value={errorStats?.bySeverity?.high || 0} color="orange" />
        <StatCard label="Medium" value={errorStats?.bySeverity?.medium || 0} color="yellow" />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onRefresh}>
          Refresh
        </Button>
        <Button size="sm" variant="outline" onClick={downloadErrorLog}>
          <Download className="w-4 h-4 mr-2" />
          Download
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => {
            clearErrorLog();
            onRefresh();
          }}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Clear
        </Button>
      </div>

      {/* Error List */}
      <div className="space-y-2">
        <h3 className="text-sm" style={{ fontFamily: 'Inter' }}>
          Recent Errors ({errors.length})
        </h3>
        {errors.length === 0 ? (
          <p className="text-sm text-muted-foreground" style={{ fontFamily: 'Inter' }}>
            No errors logged
          </p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {errors.map((error) => (
              <ErrorCard key={error.id} error={error} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Performance Tab
function PerformanceTab({ perfStats, memoryUsage, onRefresh }: any) {
  return (
    <div className="space-y-4">
      {/* Memory Usage */}
      {memoryUsage && (
        <div className="p-4 bg-muted rounded-lg">
          <h3 className="text-sm mb-2" style={{ fontFamily: 'Inter' }}>
            Memory Usage
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Used:</span>
              <span>{(memoryUsage.used / 1024 / 1024).toFixed(1)} MB</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Total:</span>
              <span>{(memoryUsage.total / 1024 / 1024).toFixed(1)} MB</span>
            </div>
            <div className="w-full bg-background rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${memoryUsage.percentage}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Metrics Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total Metrics" value={perfStats?.totalMetrics || 0} />
        <StatCard label="Slow Ops" value={perfStats?.slowOperations?.length || 0} color="orange" />
      </div>

      {/* Average Times by Category */}
      {perfStats?.avgByCategory && (
        <div className="space-y-2">
          <h3 className="text-sm" style={{ fontFamily: 'Inter' }}>
            Average Times by Category
          </h3>
          {Object.entries(perfStats.avgByCategory).map(([category, avg]: [string, any]) => (
            <div key={category} className="flex justify-between text-sm p-2 bg-muted rounded">
              <span className="capitalize">{category}:</span>
              <span>{avg.toFixed(0)}ms</span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onRefresh}>
          Refresh
        </Button>
        <Button size="sm" variant="outline" onClick={downloadMetrics}>
          <Download className="w-4 h-4 mr-2" />
          Download
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => {
            clearMetrics();
            onRefresh();
          }}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Clear
        </Button>
      </div>
    </div>
  );
}

// Cache Tab
function CacheTab({ cacheStats, queueStats, onRefresh }: any) {
  return (
    <div className="space-y-4">
      {/* Cache Stats */}
      <div>
        <h3 className="text-sm mb-3" style={{ fontFamily: 'Inter' }}>
          Media Cache
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <StatCard 
            label="Size" 
            value={cacheStats ? `${cacheStats.totalSizeMB.toFixed(1)} MB` : '0 MB'} 
          />
          <StatCard label="Items" value={cacheStats?.itemCount || 0} />
        </div>
        {cacheStats && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Usage</span>
              <span>{cacheStats.usagePercent.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${Math.min(cacheStats.usagePercent, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Offline Queue */}
      <div>
        <h3 className="text-sm mb-3" style={{ fontFamily: 'Inter' }}>
          Offline Queue
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Queued" value={queueStats?.totalCount || 0} />
        </div>
        {queueStats?.byType && Object.keys(queueStats.byType).length > 0 && (
          <div className="mt-3 space-y-1">
            {Object.entries(queueStats.byType).map(([type, count]: [string, any]) => (
              <div key={type} className="flex justify-between text-xs p-2 bg-muted rounded">
                <span className="capitalize">{type}:</span>
                <span>{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onRefresh}>
          Refresh
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={async () => {
            await clearAllCache();
            await clearQueue();
            onRefresh();
          }}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Clear All
        </Button>
      </div>
    </div>
  );
}

// Network Tab
function NetworkTab({ networkStatus }: any) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard 
          label="Status" 
          value={networkStatus.isOnline ? 'Online' : 'Offline'}
          color={networkStatus.isOnline ? 'green' : 'red'}
        />
        <StatCard 
          label="Connection" 
          value={networkStatus.effectiveType?.toUpperCase() || 'Unknown'}
        />
      </div>

      {networkStatus.downlink && (
        <div className="p-4 bg-muted rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span>Downlink:</span>
            <span>{networkStatus.downlink} Mbps</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>RTT:</span>
            <span>{networkStatus.rtt} ms</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Slow Connection:</span>
            <Badge variant={networkStatus.isSlowConnection ? 'destructive' : 'default'}>
              {networkStatus.isSlowConnection ? 'Yes' : 'No'}
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
}

// Test Tab
function TestTab() {
  const [isTestingOpenAI, setIsTestingOpenAI] = useState(false);
  const [openAIResult, setOpenAIResult] = useState<any>(null);

  const testOpenAIVision = async () => {
    setIsTestingOpenAI(true);
    setOpenAIResult(null);
    
    try {
      console.log('🧪 Testing OpenAI Vision API...');
      
      // Use a simple test image (a public placeholder image)
      const testImageUrl = 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=400';
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-deded1eb/ai/extract-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          imageUrl: testImageUrl,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ OpenAI Vision test PASSED:', data);
        setOpenAIResult({
          success: true,
          message: 'OpenAI Vision API is working!',
          text: data.text?.substring(0, 200) || 'No text extracted',
        });
      } else {
        console.error('❌ OpenAI Vision test FAILED:', data);
        setOpenAIResult({
          success: false,
          message: `Error: ${data.error}`,
          details: data.message || 'No details',
        });
      }
    } catch (error) {
      console.error('❌ OpenAI Vision test ERROR:', error);
      setOpenAIResult({
        success: false,
        message: `Exception: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setIsTestingOpenAI(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* OpenAI Vision Test */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h3 className="font-medium mb-2" style={{ fontFamily: 'Archivo', letterSpacing: '0.05em' }}>
          🔬 OpenAI Vision API Test
        </h3>
        <p className="text-sm text-muted-foreground mb-3" style={{ fontFamily: 'Inter' }}>
          Test document extraction with OpenAI's Vision API (gpt-4o-mini)
        </p>
        
        <Button 
          onClick={testOpenAIVision} 
          disabled={isTestingOpenAI}
          size="sm"
          className="mb-3"
        >
          {isTestingOpenAI ? 'Testing...' : 'Run OpenAI Test'}
        </Button>

        {openAIResult && (
          <div className={`p-3 rounded-lg text-sm ${
            openAIResult.success 
              ? 'bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
              : 'bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}>
            <div className="font-medium mb-2" style={{ fontFamily: 'Inter' }}>
              {openAIResult.success ? '✅ Success' : '❌ Failed'}
            </div>
            <div className="space-y-1 text-xs" style={{ fontFamily: 'Inter' }}>
              <div><strong>Message:</strong> {openAIResult.message}</div>
              {openAIResult.text && (
                <div><strong>Extracted:</strong> {openAIResult.text}</div>
              )}
              {openAIResult.details && (
                <div><strong>Details:</strong> {openAIResult.details}</div>
              )}
            </div>
            {!openAIResult.success && (
              <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/10 rounded text-xs">
                <strong>💡 Solution:</strong> Add credits to your OpenAI account at{' '}
                <a 
                  href="https://platform.openai.com/account/billing" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline hover:text-blue-600"
                >
                  platform.openai.com/account/billing
                </a>
                <div className="mt-1 text-muted-foreground">
                  Or users can manually add text/tags to their memories using the edit button.
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Test Invitation Setup */}
      <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
        <h3 className="font-medium mb-2" style={{ fontFamily: 'Archivo', letterSpacing: '0.05em' }}>
          Test Invitation Setup
        </h3>
        <p className="text-sm text-muted-foreground mb-3" style={{ fontFamily: 'Inter' }}>
          Setup and verify the invitation code <span className="font-mono font-bold">TESTCODE</span> connecting Shane Long to Allison Tam.
        </p>
        <div className="space-y-2 text-sm" style={{ fontFamily: 'Inter' }}>
          <div className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Keeper: Shane Long (shanelong@gmail.com)</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Teller: Allison Tam (allison.tam@hotmail.com)</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Code: TESTCODE</span>
          </div>
        </div>
      </div>
      <TestInvitationDebug />

      {/* Invitation Diagnostic */}
      <InvitationDiagnostic />

      {/* PWA Diagnostic */}
      <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
        <h3 className="font-medium mb-2" style={{ fontFamily: 'Archivo', letterSpacing: '0.05em' }}>
          PWA Diagnostic
        </h3>
        <p className="text-sm text-muted-foreground mb-3" style={{ fontFamily: 'Inter' }}>
          Check the status of the Progressive Web App (PWA) and install prompts.
        </p>
        <PWADiagnostic />
      </div>

      {/* PWA Install Prompt */}
      <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
        <h3 className="font-medium mb-2" style={{ fontFamily: 'Archivo', letterSpacing: '0.05em' }}>
          PWA Install Prompt
        </h3>
        <p className="text-sm text-muted-foreground mb-3" style={{ fontFamily: 'Inter' }}>
          Trigger the PWA install prompt to add Adoras to your home screen.
        </p>
        <PWAInstallPrompt />
      </div>

      {/* Icon Generator */}
      <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
        <h3 className="font-medium mb-2" style={{ fontFamily: 'Archivo', letterSpacing: '0.05em' }}>
          Icon Generator
        </h3>
        <p className="text-sm text-muted-foreground mb-3" style={{ fontFamily: 'Inter' }}>
          Generate icons for different platforms and resolutions.
        </p>
        <IconGenerator />
      </div>
    </div>
  );
}

// Helper Components
function StatCard({ label, value, color }: { label: string; value: any; color?: string }) {
  const colorClasses = {
    red: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400',
    orange: 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400',
    green: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
  };

  return (
    <div className={`p-3 rounded-lg ${color ? colorClasses[color as keyof typeof colorClasses] : 'bg-muted'}`}>
      <div className="text-xs opacity-75 mb-1" style={{ fontFamily: 'Inter' }}>
        {label}
      </div>
      <div className="text-lg" style={{ fontFamily: 'Archivo' }}>
        {value}
      </div>
    </div>
  );
}

function ErrorCard({ error }: { error: any }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const severityColors = {
    low: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
    medium: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400',
    high: 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400',
    critical: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400',
  };

  return (
    <div className="p-3 bg-muted rounded-lg text-sm">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="truncate" style={{ fontFamily: 'Inter' }}>
            {error.message}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {new Date(error.timestamp).toLocaleTimeString()}
          </p>
        </div>
        <Badge className={severityColors[error.severity as keyof typeof severityColors]}>
          {error.severity}
        </Badge>
      </div>

      {error.stack && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {isExpanded ? 'Hide' : 'Show'} stack trace
        </button>
      )}

      {isExpanded && error.stack && (
        <pre className="mt-2 text-xs overflow-x-auto p-2 bg-background rounded">
          {error.stack}
        </pre>
      )}
    </div>
  );
}

/**
 * Hook to toggle debug panel with keyboard shortcut
 */
export function useDebugPanel() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Enable debug mode by default for testing
    // Set localStorage flag on first load
    if (!localStorage.getItem('adoras-debug')) {
      localStorage.setItem('adoras-debug', 'true');
    }

    // Only enable in development or if debug flag is set
    const isDebugEnabled = 
      process.env.NODE_ENV === 'development' || 
      localStorage.getItem('adoras-debug') === 'true';

    if (!isDebugEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+D or Cmd+Shift+D
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { isOpen, setIsOpen };
}