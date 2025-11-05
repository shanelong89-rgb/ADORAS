/**
 * LoginScreen Component
 * Handles user login with email/password
 * Designed to match SignUpInitialScreen layout for seamless UX
 */

import React, { useState } from 'react';
import { useAuth } from '../utils/api/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Card } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Loader2, Mail, Lock, AlertCircle, Eye, EyeOff, ArrowLeft, Wrench } from 'lucide-react';
import { checkServerHealth } from '../utils/serverHealth';
import { MobileAuthDiagnostic } from './MobileAuthDiagnostic';

interface LoginScreenProps {
  onSuccess: () => void;
  onSignUpClick: () => void;
  onBack: () => void;
}

export function LoginScreen({ onSuccess, onSignUpClick, onBack }: LoginScreenProps) {
  const { signin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true); // Default to true for better mobile UX
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [showDiagnostic, setShowDiagnostic] = useState(false);

  // Load saved credentials on mount
  React.useEffect(() => {
    const savedEmail = localStorage.getItem('adoras_remember_email');
    const savedRemember = localStorage.getItem('adoras_remember_me') === 'true';
    
    if (savedEmail && savedRemember) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  // Check server health on mount with optimized timeout
  React.useEffect(() => {
    let mounted = true;
    
    const checkServer = async () => {
      const result = await checkServerHealth();
      
      if (mounted) {
        setServerStatus(result.online ? 'online' : 'offline');
        
        if (!result.online) {
          console.warn('Server health check failed:', result.error);
        }
      }
    };
    
    checkServer();
    
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Check server status first
    if (serverStatus === 'offline') {
      setError('Backend server is not responding. The Supabase Edge Function may not be deployed yet. Please contact support or try again later.');
      return;
    }

    // Validation
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      const result = await signin({
        email: email.trim().toLowerCase(),
        password,
      }, rememberMe);

      if (result.success) {
        // Save email if "Remember Me" is checked
        if (rememberMe) {
          localStorage.setItem('adoras_remember_email', email.trim().toLowerCase());
          localStorage.setItem('adoras_remember_me', 'true');
        } else {
          localStorage.removeItem('adoras_remember_email');
          localStorage.removeItem('adoras_remember_me');
        }
        
        onSuccess();
      } else {
        // Log the full error for debugging
        console.error('❌ Sign in failed with error:', result.error);
        
        // Clear any old tokens that might be causing issues
        localStorage.removeItem('adoras_access_token');
        sessionStorage.removeItem('adoras_access_token');
        
        // Better error messages
        if (result.error?.includes('Failed to fetch') || result.error?.includes('Network')) {
          setError('Server connection failed. The backend may not be deployed. Please try again later or contact support.');
        } else if (result.error?.includes('Invalid login credentials') || result.error?.includes('Email not confirmed')) {
          setError('❌ Invalid email or password. This account may not exist yet. Please check your credentials or click "Don\'t have an account? Sign up" below to create a new account.');
        } else {
          // Show the actual error message from the backend
          setError(result.error || 'Sign in failed. Please check your credentials.');
        }
      }
    } catch (err) {
      console.error('❌ Sign in exception:', err);
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Cannot connect to server. The Supabase Edge Function may not be deployed. Please contact support.');
      } else {
        setError('Network error. Please check your connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="flex items-center justify-center p-2 sm:p-4 animate-fade-in relative" 
      style={{ 
        minHeight: '100vh',
        minHeight: '-webkit-fill-available',
        backgroundColor: 'rgb(245, 249, 233)',
        paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))'
      }}
    >
      {/* Timeline at the top */}
      <div 
        className="absolute left-1/2 transform -translate-x-1/2 z-10 w-full max-w-[90vw] md:max-w-none md:w-auto"
        style={{
          top: 'max(1rem, calc(env(safe-area-inset-top) + 0.5rem))'
        }}
      >
        <div className="flex items-start justify-between md:gap-1">
          {[3, 4, 5, 6, 7].map((num, index) => (
            <React.Fragment key={num}>
              {/* Main numbered marker */}
              <div className="flex flex-col items-center">
                <div className="w-px h-2 sm:h-3 bg-primary/30 mb-0.5 sm:mb-1"></div>
                <span 
                  className="text-primary/50 text-[10px] sm:text-xs" 
                  style={{ fontFamily: 'Inter', letterSpacing: '0.05em' }}
                >
                  {num.toString().padStart(2, '0')}
                </span>
              </div>
              
              {/* Small tick marks between numbered markers */}
              {index < 4 && (
                <>
                  {[...Array(10)].map((_, i) => (
                    <div key={`tick-${num}-${i}`} className="flex flex-col items-center">
                      <div className="w-px h-1 sm:h-1.5 bg-primary/20"></div>
                    </div>
                  ))}
                </>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Back Button - positioned under timeline */}
      <div 
        className="absolute left-4 sm:left-8 z-10"
        style={{
          top: 'max(3.5rem, calc(env(safe-area-inset-top) + 3rem))'
        }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm" style={{ fontFamily: 'Inter', letterSpacing: '-0.02em' }}>
            Back
          </span>
        </button>
      </div>

      <Card className="w-full max-w-2xl space-y-6 sm:space-y-8 animate-slide-up shadow-lg border-border/30 backdrop-blur-sm bg-transparent p-6 sm:p-[40px] m-0">
        {/* Header matching SignUpInitialScreen */}
        <div className="text-center space-y-2 sm:space-y-4">
          <h2 className="text-2xl sm:text-4xl font-medium" style={{ fontFamily: 'Archivo', letterSpacing: '-0.07em', color: '#36453B' }}>
            Welcome Back
          </h2>
          <p className="text-muted-foreground text-base sm:text-xl" style={{ fontFamily: 'Inter', letterSpacing: '-0.05em' }}>
            Continue sharing precious memories
          </p>
          
          {/* Server Status Indicator */}
          <div className="flex items-center justify-center gap-2 text-sm">
            {serverStatus === 'checking' && (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                <span className="text-muted-foreground" style={{ fontFamily: 'Inter' }}>Checking server...</span>
              </>
            )}
            {serverStatus === 'online' && (
              <>
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-green-700" style={{ fontFamily: 'Inter' }}>Server Online</span>
              </>
            )}
            {serverStatus === 'offline' && (
              <>
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <span className="text-red-700" style={{ fontFamily: 'Inter' }}>Server Offline</span>
              </>
            )}
          </div>
        </div>

        {/* Server Offline Warning */}
        {serverStatus === 'offline' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p><strong>Backend Server Not Available</strong></p>
                <p className="text-sm">The Supabase Edge Function is not deployed or not responding. Please contact the administrator.</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Technical details: Cannot reach https://cyaaksjydpegofrldxbo.supabase.co/functions/v1/make-server-deded1eb/health
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-3">
                <p className="whitespace-pre-line">{error}</p>
                {error.includes('Invalid login credentials') && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-900">
                    <p className="font-medium mb-1">💡 Common Solutions:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Check email spelling (typos are common!)</li>
                      <li>Verify password (check caps lock)</li>
                      <li>New user? Click "Create New Account" below</li>
                    </ul>
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDiagnostic(true)}
                  className="mt-2"
                >
                  <Wrench className="w-4 h-4 mr-2" />
                  Run Diagnostic
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email" style={{ fontFamily: 'Inter' }}>Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12 sm:h-14 bg-[rgba(236,240,226,0.4)] border-2 focus:border-primary/30"
                style={{ fontFamily: 'Inter' }}
                disabled={isLoading}
                autoComplete="email"
                autoFocus
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password" style={{ fontFamily: 'Inter' }}>Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 h-12 sm:h-14 bg-[rgba(236,240,226,0.4)] border-2 focus:border-primary/30"
                style={{ fontFamily: 'Inter' }}
                disabled={isLoading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Remember Me Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked === true)}
            />
            <Label 
              htmlFor="remember" 
              className="text-sm cursor-pointer"
              style={{ fontFamily: 'Inter' }}
            >
              Remember me on this device
            </Label>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-12 sm:h-14 transition-colors text-base sm:text-lg"
            style={{ fontFamily: 'Inter', letterSpacing: '-0.02em', backgroundColor: 'rgb(54, 69, 59)', color: 'rgb(255, 255, 255)' }}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative -mb-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/50" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-card text-muted-foreground" style={{ fontFamily: 'Inter', letterSpacing: '-0.02em' }}>
              Don't have an account?
            </span>
          </div>
        </div>

        {/* Sign Up Link */}
        <Button
          type="button"
          variant="outline"
          className="w-full h-12 sm:h-14 border-2 hover:bg-primary/5 transition-colors text-base sm:text-lg"
          style={{ fontFamily: 'Inter', letterSpacing: '-0.02em' }}
          onClick={onSignUpClick}
          disabled={isLoading}
        >
          Create New Account
        </Button>

        {/* Help Text */}
        <p className="text-center text-sm text-muted-foreground" style={{ fontFamily: 'Inter', letterSpacing: '-0.02em' }}>
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </Card>

      {/* Diagnostic Dialog */}
      <Dialog open={showDiagnostic} onOpenChange={setShowDiagnostic}>
        <DialogContent className="max-w-full h-full sm:max-w-[600px] sm:h-auto overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Authentication Diagnostic</DialogTitle>
          </DialogHeader>
          <MobileAuthDiagnostic />
        </DialogContent>
      </Dialog>
    </div>
  );
}