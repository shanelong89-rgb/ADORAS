/**
 * Simple Login Test - No server, just direct Supabase
 */

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export function SimpleLoginTest() {
  const [result, setResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const testLogin = async () => {
    setIsLoading(true);
    setResult('Testing...');

    try {
      // Test 1: Can we reach the server health endpoint?
      const healthUrl = `https://${projectId}.supabase.co/functions/v1/make-server-deded1eb/health`;
      console.log('🏥 Testing health endpoint:', healthUrl);
      
      const healthResp = await fetch(healthUrl);
      const healthData = await healthResp.json();
      console.log('✅ Health check result:', healthData);
      
      setResult(prev => prev + '\n✅ Server is ONLINE\n' + JSON.stringify(healthData, null, 2));

      // Test 2: Can we call signin endpoint?
      const signinUrl = `https://${projectId}.supabase.co/functions/v1/make-server-deded1eb/auth/signin`;
      console.log('🔑 Testing signin endpoint:', signinUrl);
      
      const signinResp = await fetch(signinUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'allison.tam@hotmail.com',
          password: 'Ilovetam',
        }),
      });
      
      const signinData = await signinResp.json();
      console.log('🔑 Signin result:', signinData);
      
      if (signinResp.ok) {
        setResult(prev => prev + '\n\n✅ SIGNIN WORKED!\n' + JSON.stringify(signinData, null, 2));
      } else {
        setResult(prev => prev + '\n\n❌ Signin failed (Status: ' + signinResp.status + ')\n' + JSON.stringify(signinData, null, 2));
      }

      // Test 3: Direct Supabase Auth
      console.log('🧪 Testing direct Supabase auth...');
      const supabase = createClient(
        `https://${projectId}.supabase.co`,
        publicAnonKey
      );
      
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'allison.tam@hotmail.com',
        password: 'Ilovetam',
      });
      
      if (authError) {
        setResult(prev => prev + '\n\n❌ Direct Supabase Auth Error:\n' + authError.message);
      } else {
        setResult(prev => prev + '\n\n✅ DIRECT SUPABASE AUTH WORKED!\nUser ID: ' + authData.user?.id);
      }

    } catch (err) {
      console.error('💥 Exception:', err);
      setResult(prev => prev + '\n\n💥 Exception: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 bg-background">
      <Card className="p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl mb-4" style={{ fontFamily: 'Archivo' }}>
          🔍 Simple Login Test
        </h1>
        
        <Button 
          onClick={testLogin} 
          disabled={isLoading}
          className="w-full mb-4"
        >
          {isLoading ? 'Testing...' : 'Run Full Test'}
        </Button>

        <pre className="bg-muted p-4 rounded text-xs overflow-auto max-h-96 whitespace-pre-wrap">
          {result || 'Click "Run Full Test" to see results'}
        </pre>

        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm">
            <strong>This test will:</strong>
          </p>
          <ol className="list-decimal list-inside text-sm mt-2 space-y-1">
            <li>Check if the server is running</li>
            <li>Try logging in through OUR server</li>
            <li>Try logging in DIRECTLY through Supabase</li>
          </ol>
          <p className="text-xs mt-2 text-muted-foreground">
            This will show us exactly where the problem is!
          </p>
        </div>
      </Card>
    </div>
  );
}
