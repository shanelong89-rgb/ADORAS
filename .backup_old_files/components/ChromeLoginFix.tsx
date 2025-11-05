/**
 * Chrome Login Fix Component
 * Tests direct Supabase Auth sign-in to bypass potential Chrome CORS issues
 */

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cgnjqhaxvicfjlruqrtj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnbmpxaGF4dmljZmpscnVxcnRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ3Mzk5NTUsImV4cCI6MjA1MDMxNTk1NX0.VYDK5i6CmkW7GD5ySxJTa8Rd9_YLcEuFf4k-Z5YzW1o';

export function ChromeLoginFix() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const testDirectSupabaseAuth = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      console.log('🧪 Testing Direct Supabase Auth in Chrome...');
      console.log('📧 Email:', email);
      
      // Create Supabase client directly
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      
      // Try to sign in directly through Supabase (bypasses our server)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        console.error('❌ Direct Supabase Auth Error:', error);
        setResult({
          success: false,
          message: `Supabase Auth Error: ${error.message}`,
        });
        return;
      }

      if (data.session) {
        console.log('✅ Direct Supabase Auth SUCCESS!');
        console.log('📱 Session:', data.session.access_token.substring(0, 20) + '...');
        console.log('👤 User:', data.user.id);
        
        setResult({
          success: true,
          message: `✅ SUCCESS! Got access token: ${data.session.access_token.substring(0, 30)}...`,
        });
      }
    } catch (err) {
      console.error('💥 Exception:', err);
      setResult({
        success: false,
        message: `Exception: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <Card className="p-6 max-w-md mx-auto">
        <h2 className="text-xl mb-4" style={{ fontFamily: 'Archivo' }}>
          🔧 Chrome Login Test
        </h2>
        
        <div className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="allison.tam@hotmail.com"
            />
          </div>

          <div>
            <Label>Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />
          </div>

          <Button
            onClick={testDirectSupabaseAuth}
            disabled={isLoading || !email || !password}
            className="w-full"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Direct Supabase Auth
          </Button>

          {result && (
            <Alert variant={result.success ? 'default' : 'destructive'}>
              {result.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription className="ml-2">
                {result.message}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="mt-6 p-4 bg-muted rounded text-sm">
          <p className="mb-2" style={{ fontFamily: 'Inter' }}>
            <strong>What this tests:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Direct Supabase Auth (bypasses our server)</li>
            <li>Chrome's ability to make CORS requests to Supabase</li>
            <li>Whether the account exists and password is correct</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
