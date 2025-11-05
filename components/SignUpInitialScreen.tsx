/**
 * SignUpInitialScreen Component
 * Collects email/password before going to onboarding
 * Designed to match UserTypeSelection layout for seamless transition
 */

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Card } from './ui/card';
import { Mail, Lock, AlertCircle, Eye, EyeOff, Crown, Users, ArrowLeft, Loader2 } from 'lucide-react';

export interface SignUpCredentials {
  email: string;
  password: string;
}

interface SignUpInitialScreenProps {
  onComplete: (credentials: SignUpCredentials) => void;
  onLoginClick: () => void;
  onBack: () => void;
  userType: 'keeper' | 'teller';
}

export function SignUpInitialScreen({
  onComplete,
  onLoginClick,
  onBack,
  userType,
}: SignUpInitialScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Responsive ruler scale state
  const [rulerRange, setRulerRange] = useState<number[]>([3, 4, 5, 6, 7]);
  const rulerRef = React.useRef<HTMLDivElement>(null);

  // Calculate ruler range based on container width
  useEffect(() => {
    const calculateRulerRange = () => {
      if (!rulerRef.current) return;
      
      const containerWidth = rulerRef.current.offsetWidth;
      // Each numbered marker + 10 tick marks takes roughly 100px on mobile, 120px on desktop
      const markerWidth = window.innerWidth >= 768 ? 120 : 100;
      const maxMarkers = Math.floor(containerWidth / markerWidth);
      
      // Generate range starting from 3
      const range = Array.from({ length: Math.max(5, maxMarkers) }, (_, i) => i + 3);
      setRulerRange(range);
    };

    calculateRulerRange();
    window.addEventListener('resize', calculateRulerRange);
    return () => window.removeEventListener('resize', calculateRulerRange);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Validation
    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    onComplete({
      email: email.trim().toLowerCase(),
      password,
    });
  };

  const userTypeLabel = userType === 'keeper' ? 'Legacy Keeper' : 'Storyteller';
  const UserIcon = userType === 'keeper' ? Crown : Users;

  return (
    <div className="min-h-screen flex items-center justify-center p-2 sm:p-4 animate-fade-in relative" style={{ backgroundColor: 'rgb(245, 249, 233)' }}>
      {/* Timeline at the top */}
      <div ref={rulerRef} className="absolute top-4 sm:top-8 left-1/2 transform -translate-x-1/2 z-10 w-full max-w-[90vw] md:max-w-none md:w-auto">
        <div className="flex items-start justify-between md:gap-1">
          {rulerRange.map((num, index) => (
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
              {index < rulerRange.length - 1 && (
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
      <div className="absolute top-14 sm:top-20 left-4 sm:left-8 z-10">
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
        {/* Header matching UserTypeSelection */}
        <div className="text-center space-y-2 sm:space-y-4">
          <div className="flex items-center justify-center gap-3 mb-2 sm:mb-4">
            <div className="p-2 sm:p-3 bg-primary/10 rounded-2xl">
              <UserIcon className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
          </div>
          <h2 className="text-2xl sm:text-4xl font-medium" style={{ fontFamily: 'Archivo', letterSpacing: '-0.07em', color: '#36453B' }}>
            Create Account
          </h2>
          <p className="text-muted-foreground text-base sm:text-xl" style={{ fontFamily: 'Inter', letterSpacing: '-0.05em' }}>
            Join as a {userTypeLabel}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Sign Up Form */}
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
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 h-12 sm:h-14 bg-[rgba(236,240,226,0.4)] border-2 focus:border-primary/30"
                style={{ fontFamily: 'Inter' }}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" style={{ fontFamily: 'Inter' }}>Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10 h-12 sm:h-14 bg-[rgba(236,240,226,0.4)] border-2 focus:border-primary/30"
                style={{ fontFamily: 'Inter' }}
                autoComplete="new-password"
              />
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-12 sm:h-14 bg-primary hover:bg-primary/90 mt-2 sm:mt-4"
            style={{ fontFamily: 'Inter', letterSpacing: '-0.02em' }}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              'Continue to Profile Setup'
            )}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative -mb-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-card text-muted-foreground" style={{ fontFamily: 'Inter' }}>
              Already have an account?
            </span>
          </div>
        </div>

        {/* Login Link */}
        <Button
          type="button"
          variant="outline"
          className="w-full h-12 sm:h-14 border-2 hover:bg-primary/5 hover:border-primary/30"
          onClick={onLoginClick}
          style={{ fontFamily: 'Inter', letterSpacing: '-0.02em' }}
        >
          Sign In Instead
        </Button>

        {/* Help Text */}
        <div className="text-center">
          <p className="text-xs sm:text-sm text-muted-foreground bg-muted/30 rounded-xl p-3 sm:p-4 inline-block" style={{ fontFamily: 'Inter' }}>
            By creating an account, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </Card>
    </div>
  );
}