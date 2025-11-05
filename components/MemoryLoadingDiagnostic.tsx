/**
 * Memory Loading Diagnostic Component
 * Helps diagnose why memories aren't loading
 */

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { apiClient } from '../utils/api/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface DiagnosticResult {
  test: string;
  status: 'pass' | 'fail' | 'warning' | 'pending';
  message: string;
  details?: any;
}

export function MemoryLoadingDiagnostic() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (result: DiagnosticResult) => {
    setResults((prev) => [...prev, result]);
  };

  const runDiagnostics = async () => {
    setResults([]);
    setIsRunning(true);

    try {
      // Test 1: Check token storage
      addResult({ test: 'Checking for stored auth token...', status: 'pending', message: '' });
      const localToken = localStorage.getItem('adoras_access_token');
      const sessionToken = sessionStorage.getItem('adoras_access_token');
      const apiClientToken = apiClient.getAccessToken();

      if (apiClientToken) {
        addResult({
          test: 'Auth Token',
          status: 'pass',
          message: `Token found (${apiClientToken.length} chars)`,
          details: {
            localStorage: !!localToken,
            sessionStorage: !!sessionToken,
            apiClient: !!apiClientToken,
            tokenPreview: apiClientToken.substring(0, 30) + '...'
          }
        });
      } else {
        addResult({
          test: 'Auth Token',
          status: 'fail',
          message: 'No auth token found',
          details: {
            localStorage: !!localToken,
            sessionStorage: !!sessionToken,
          }
        });
        setIsRunning(false);
        return;
      }

      // Test 2: Verify token with server
      addResult({ test: 'Verifying token with server...', status: 'pending', message: '' });
      try {
        const userResponse = await apiClient.getCurrentUser();
        if (userResponse.success && userResponse.user) {
          addResult({
            test: 'Token Verification',
            status: 'pass',
            message: `Authenticated as ${userResponse.user.name} (${userResponse.user.email})`,
            details: {
              userId: userResponse.user.id,
              userType: userResponse.user.type,
              email: userResponse.user.email
            }
          });
        } else {
          addResult({
            test: 'Token Verification',
            status: 'fail',
            message: userResponse.error || 'Failed to verify token',
            details: userResponse
          });
          setIsRunning(false);
          return;
        }
      } catch (error) {
        addResult({
          test: 'Token Verification',
          status: 'fail',
          message: error instanceof Error ? error.message : String(error),
          details: error
        });
        setIsRunning(false);
        return;
      }

      // Test 3: Load connections
      addResult({ test: 'Loading connections...', status: 'pending', message: '' });
      try {
        const connectionsResponse = await apiClient.getConnections();
        if (connectionsResponse.success && connectionsResponse.connections) {
          const connectionCount = connectionsResponse.connections.length;
          const activeConnections = connectionsResponse.connections.filter(
            (c) => c.connection.status === 'active'
          );
          
          if (connectionCount > 0) {
            addResult({
              test: 'Connections',
              status: 'pass',
              message: `Found ${connectionCount} connection(s), ${activeConnections.length} active`,
              details: {
                total: connectionCount,
                active: activeConnections.length,
                connections: connectionsResponse.connections.map((c) => ({
                  id: c.connection.id,
                  status: c.connection.status,
                  partnerName: c.partner?.name,
                  partnerEmail: c.partner?.email
                }))
              }
            });

            // Test 4: Load memories for each connection
            for (const conn of activeConnections) {
              const connectionId = conn.connection.id;
              const partnerName = conn.partner?.name || 'Unknown';
              
              addResult({ 
                test: `Loading memories for ${partnerName}...`, 
                status: 'pending', 
                message: '' 
              });

              try {
                const memoriesResponse = await apiClient.getMemories(connectionId);
                console.log(`📦 Memories response for ${connectionId}:`, memoriesResponse);

                if (memoriesResponse.success) {
                  const memoryCount = memoriesResponse.memories?.length || 0;
                  addResult({
                    test: `Memories for ${partnerName}`,
                    status: memoryCount > 0 ? 'pass' : 'warning',
                    message: memoryCount > 0 
                      ? `Loaded ${memoryCount} memories` 
                      : 'No memories found',
                    details: {
                      connectionId,
                      count: memoryCount,
                      memories: memoriesResponse.memories?.map((m) => ({
                        id: m.id,
                        type: m.type,
                        timestamp: m.timestamp,
                        content: m.content?.substring(0, 50)
                      }))
                    }
                  });
                } else {
                  addResult({
                    test: `Memories for ${partnerName}`,
                    status: 'fail',
                    message: memoriesResponse.error || 'Failed to load memories',
                    details: {
                      connectionId,
                      response: memoriesResponse
                    }
                  });
                }
              } catch (error) {
                addResult({
                  test: `Memories for ${partnerName}`,
                  status: 'fail',
                  message: error instanceof Error ? error.message : String(error),
                  details: {
                    connectionId,
                    error
                  }
                });
              }
            }
          } else {
            addResult({
              test: 'Connections',
              status: 'warning',
              message: 'No connections found',
              details: connectionsResponse
            });
          }
        } else {
          addResult({
            test: 'Connections',
            status: 'fail',
            message: connectionsResponse.error || 'Failed to load connections',
            details: connectionsResponse
          });
        }
      } catch (error) {
        addResult({
          test: 'Connections',
          status: 'fail',
          message: error instanceof Error ? error.message : String(error),
          details: error
        });
      }

      // Test 5: Check server config
      addResult({ test: 'Checking server configuration...', status: 'pending', message: '' });
      addResult({
        test: 'Server Config',
        status: 'pass',
        message: 'Configuration loaded',
        details: {
          projectId: projectId.substring(0, 10) + '...',
          publicAnonKey: publicAnonKey.substring(0, 30) + '...',
          baseUrl: `https://${projectId}.supabase.co/functions/v1/make-server-deded1eb`
        }
      });

    } catch (error) {
      addResult({
        test: 'General Error',
        status: 'fail',
        message: error instanceof Error ? error.message : String(error),
        details: error
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'fail':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'pending':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Memory Loading Diagnostics</CardTitle>
        <CardDescription>
          Run this diagnostic to identify why memories aren't loading
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runDiagnostics} disabled={isRunning}>
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Diagnostics...
            </>
          ) : (
            'Run Full Diagnostic'
          )}
        </Button>

        {results.length > 0 && (
          <div className="space-y-3 mt-6">
            {results.map((result, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-4 border rounded-lg bg-white"
              >
                <div className="mt-0.5">{getStatusIcon(result.status)}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{result.test}</div>
                  <div className="text-sm text-gray-600 mt-1">{result.message}</div>
                  {result.details && (
                    <details className="mt-2">
                      <summary className="text-xs text-blue-600 cursor-pointer hover:underline">
                        View Details
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto max-h-40">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!isRunning && results.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Next Steps:</h4>
            <ul className="text-sm space-y-1 list-disc list-inside">
              <li>Copy the console output and share with the developer</li>
              <li>Check the browser console (F12) for additional error messages</li>
              <li>Try signing out and signing back in</li>
              <li>If the issue persists, try clearing the PWA cache</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
