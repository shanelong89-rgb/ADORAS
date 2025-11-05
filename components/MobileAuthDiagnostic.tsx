/**
 * Mobile Authentication Diagnostic Tool
 * Helps debug login issues on mobile devices
 */

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle2, XCircle, AlertCircle, Loader2, Copy } from 'lucide-react';
import { checkServerHealth } from '../utils/serverHealth';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export function MobileAuthDiagnostic() {
  const [tests, setTests] = useState<{
    localStorage: 'pending' | 'pass' | 'fail';
    sessionStorage: 'pending' | 'pass' | 'fail';
    fetch: 'pending' | 'pass' | 'fail';
    serverHealth: 'pending' | 'pass' | 'fail';
    cors: 'pending' | 'pass' | 'fail';
    existingAuth: 'pending' | 'pass' | 'fail';
  }>({
    localStorage: 'pending',
    sessionStorage: 'pending',
    fetch: 'pending',
    serverHealth: 'pending',
    cors: 'pending',
    existingAuth: 'pending',
  });
  
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
    console.log(message);
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setLogs([]);
    addLog('🔍 Starting diagnostics...');
    
    // Test 1: localStorage
    addLog('Test 1: Checking localStorage...');
    try {
      localStorage.setItem('test_key', 'test_value');
      const value = localStorage.getItem('test_key');
      localStorage.removeItem('test_key');
      
      if (value === 'test_value') {
        setTests(prev => ({ ...prev, localStorage: 'pass' }));
        addLog('✅ localStorage: PASS');
      } else {
        setTests(prev => ({ ...prev, localStorage: 'fail' }));
        addLog('❌ localStorage: FAIL - Value mismatch');
      }
    } catch (error) {
      setTests(prev => ({ ...prev, localStorage: 'fail' }));
      addLog(`❌ localStorage: FAIL - ${error}`);
    }

    // Test 2: sessionStorage
    addLog('Test 2: Checking sessionStorage...');
    try {
      sessionStorage.setItem('test_key', 'test_value');
      const value = sessionStorage.getItem('test_key');
      sessionStorage.removeItem('test_key');
      
      if (value === 'test_value') {
        setTests(prev => ({ ...prev, sessionStorage: 'pass' }));
        addLog('✅ sessionStorage: PASS');
      } else {
        setTests(prev => ({ ...prev, sessionStorage: 'fail' }));
        addLog('❌ sessionStorage: FAIL - Value mismatch');
      }
    } catch (error) {
      setTests(prev => ({ ...prev, sessionStorage: 'fail' }));
      addLog(`❌ sessionStorage: FAIL - ${error}`);
    }

    // Test 3: Fetch API
    addLog('Test 3: Testing fetch API with public endpoint...');
    try {
      const response = await fetch('https://httpbin.org/json', {
        method: 'GET',
      });
      
      if (response.ok) {
        setTests(prev => ({ ...prev, fetch: 'pass' }));
        addLog('✅ Fetch API: PASS');
      } else {
        setTests(prev => ({ ...prev, fetch: 'fail' }));
        addLog(`❌ Fetch API: FAIL - Status ${response.status}`);
      }
    } catch (error) {
      setTests(prev => ({ ...prev, fetch: 'fail' }));
      addLog(`❌ Fetch API: FAIL - ${error}`);
    }

    // Test 4: Server Health
    addLog('Test 4: Checking server health...');
    try {
      const result = await checkServerHealth();
      
      if (result.online) {
        setTests(prev => ({ ...prev, serverHealth: 'pass' }));
        addLog(`✅ Server Health: PASS - Latency ${result.latency}ms`);
      } else {
        setTests(prev => ({ ...prev, serverHealth: 'fail' }));
        addLog(`❌ Server Health: FAIL - ${result.error}`);
      }
    } catch (error) {
      setTests(prev => ({ ...prev, serverHealth: 'fail' }));
      addLog(`❌ Server Health: FAIL - ${error}`);
    }

    // Test 5: CORS and Auth endpoint
    addLog('Test 5: Testing CORS with auth endpoint...');
    try {
      const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-deded1eb`;
      const response = await fetch(`${BASE_URL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        setTests(prev => ({ ...prev, cors: 'pass' }));
        addLog('✅ CORS: PASS');
      } else {
        setTests(prev => ({ ...prev, cors: 'fail' }));
        addLog(`❌ CORS: FAIL - Status ${response.status}`);
      }
    } catch (error) {
      setTests(prev => ({ ...prev, cors: 'fail' }));
      addLog(`❌ CORS: FAIL - ${error}`);
    }

    // Test 6: Existing Auth
    addLog('Test 6: Checking existing authentication...');
    try {
      const localToken = localStorage.getItem('adoras_access_token');
      const sessionToken = sessionStorage.getItem('adoras_access_token');
      const rememberEmail = localStorage.getItem('adoras_remember_email');
      
      addLog(`  - localStorage token: ${localToken ? 'EXISTS' : 'NONE'}`);
      addLog(`  - sessionStorage token: ${sessionToken ? 'EXISTS' : 'NONE'}`);
      addLog(`  - Remembered email: ${rememberEmail || 'NONE'}`);
      
      if (localToken || sessionToken) {
        setTests(prev => ({ ...prev, existingAuth: 'pass' }));
        addLog('✅ Existing Auth: PASS - Token found in storage');
      } else {
        setTests(prev => ({ ...prev, existingAuth: 'fail' }));
        addLog('ℹ️ Existing Auth: No stored token (user not logged in)');
      }
    } catch (error) {
      setTests(prev => ({ ...prev, existingAuth: 'fail' }));
      addLog(`❌ Existing Auth: FAIL - ${error}`);
    }

    addLog('🎉 Diagnostics complete!');
    setIsRunning(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const copyLogs = () => {
    navigator.clipboard.writeText(logs.join('\n'));
    alert('Logs copied to clipboard!');
  };

  const getStatusIcon = (status: 'pending' | 'pass' | 'fail') => {
    if (status === 'pass') return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    if (status === 'fail') return <XCircle className="w-5 h-5 text-red-600" />;
    return <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />;
  };

  const getStatusBadge = (status: 'pending' | 'pass' | 'fail') => {
    if (status === 'pass') return <Badge className="bg-green-100 text-green-800">PASS</Badge>;
    if (status === 'fail') return <Badge className="bg-red-100 text-red-800">FAIL</Badge>;
    return <Badge className="bg-gray-100 text-gray-800">...</Badge>;
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <Card className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Archivo' }}>
            Mobile Auth Diagnostic
          </h1>
          <p className="text-muted-foreground" style={{ fontFamily: 'Inter' }}>
            Testing authentication capabilities on this device
          </p>
        </div>

        {/* Test Results */}
        <div className="space-y-3">
          <h2 className="text-lg font-medium" style={{ fontFamily: 'Archivo' }}>Test Results</h2>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(tests.localStorage)}
                <span style={{ fontFamily: 'Inter' }}>localStorage</span>
              </div>
              {getStatusBadge(tests.localStorage)}
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(tests.sessionStorage)}
                <span style={{ fontFamily: 'Inter' }}>sessionStorage</span>
              </div>
              {getStatusBadge(tests.sessionStorage)}
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(tests.fetch)}
                <span style={{ fontFamily: 'Inter' }}>Fetch API</span>
              </div>
              {getStatusBadge(tests.fetch)}
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(tests.serverHealth)}
                <span style={{ fontFamily: 'Inter' }}>Server Health</span>
              </div>
              {getStatusBadge(tests.serverHealth)}
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(tests.cors)}
                <span style={{ fontFamily: 'Inter' }}>CORS / Auth Endpoint</span>
              </div>
              {getStatusBadge(tests.cors)}
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(tests.existingAuth)}
                <span style={{ fontFamily: 'Inter' }}>Existing Auth</span>
              </div>
              {getStatusBadge(tests.existingAuth)}
            </div>
          </div>
        </div>

        {/* Overall Status */}
        {!isRunning && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {Object.values(tests).every(t => t === 'pass') ? (
                <span className="text-green-700">✅ All tests passed! Authentication should work.</span>
              ) : (
                <span className="text-red-700">❌ Some tests failed. Check logs below.</span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Logs */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium" style={{ fontFamily: 'Archivo' }}>Logs</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={copyLogs}
              disabled={logs.length === 0}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
          </div>
          
          <div className="bg-black text-green-400 p-4 rounded-lg max-h-64 overflow-y-auto font-mono text-xs">
            {logs.length === 0 ? (
              <p className="text-gray-500">No logs yet...</p>
            ) : (
              logs.map((log, index) => (
                <div key={index}>{log}</div>
              ))
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={runDiagnostics}
            disabled={isRunning}
            className="flex-1"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              'Run Diagnostics Again'
            )}
          </Button>
        </div>

        {/* Device Info */}
        <div className="text-xs text-muted-foreground space-y-1" style={{ fontFamily: 'monospace' }}>
          <p>User Agent: {navigator.userAgent}</p>
          <p>Platform: {navigator.platform}</p>
          <p>Screen: {window.screen.width}x{window.screen.height}</p>
          <p>Viewport: {window.innerWidth}x{window.innerHeight}</p>
          <p>Online: {navigator.onLine ? 'Yes' : 'No'}</p>
        </div>
      </Card>
    </div>
  );
}