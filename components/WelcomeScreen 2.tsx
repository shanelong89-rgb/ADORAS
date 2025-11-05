import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { motion } from 'motion/react';
import { Mail } from 'lucide-react';
import { Separator } from './ui/separator';
import { IOSInstallPrompt } from './IOSInstallPrompt';
import { useAuth } from '../utils/api/AuthContext';

interface WelcomeScreenProps {
  onNext: () => void;
  onLogin: () => void;
}

export function WelcomeScreen({ onNext, onLogin }: WelcomeScreenProps) {
  const [showSignIn, setShowSignIn] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();

  // If user is already authenticated, skip to next screen
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      onNext();
    }
  }, [isAuthenticated, isLoading, onNext]);

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden animate-fade-in bg-primary">
      {/* Extended background container that goes behind notch */}
      <div className="fixed inset-0 -top-20">
        {/* Background plant image */}
        <motion.div 
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{ backgroundImage: `url(https://images.unsplash.com/photo-1593309556524-350239b6ac10?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080)` }}
          animate={{
            scale: [1, 1.1, 1],
            x: [0, -20, 0],
            y: [0, -10, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        ></motion.div>
        
        {/* Dark overlay for better text contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/40"></div>
      </div>
      
      {/* Content container with safe area padding */}
      <div className="relative w-full min-h-screen flex items-center justify-center p-2 sm:p-4" style={{ paddingTop: 'max(env(safe-area-inset-top), 0.5rem)' }}>
        {/* Corner frame decorations */}
        <div className="absolute top-3 left-3 sm:top-4 sm:left-4 w-4 h-4 sm:w-6 sm:h-6 border-l-2 border-t-2 border-white/50"></div>
        <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 w-4 h-4 sm:w-6 sm:h-6 border-l-2 border-b-2 border-white/50"></div>
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 w-4 h-4 sm:w-6 sm:h-6 border-r-2 border-t-2 border-white/50"></div>
        <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 w-4 h-4 sm:w-6 sm:h-6 border-r-2 border-b-2 border-white/50"></div>

        <div className="relative w-full max-w-md text-center space-y-3 sm:space-y-6 px-4 sm:px-6 py-4 sm:py-8 animate-scale-in rounded-[1px]">
          {/* Adoras Logo */}
          <div className="flex justify-center mt-0 mb-4 sm:mb-[10px]">
            <div className="w-32 h-32 sm:w-45 sm:h-45 flex items-center justify-center mb-8 sm:mb-[100px]">
              <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
                <circle cx="50" cy="50" r="45" fill="rgb(245, 249, 233)" opacity="0.9"/>
                <text x="50" y="60" fontSize="36" fontWeight="700" fill="rgb(54, 69, 59)" textAnchor="middle" fontFamily="Archivo">A</text>
              </svg>
            </div>
          </div>

          {/* Main heading */}
          <div className="space-y-2 sm:space-y-3 mb-6 sm:mb-[60px]">
            <h2 
              className="text-base sm:text-lg text-white/90 font-normal tracking-wide" 
              style={{ fontFamily: 'Archivo', letterSpacing: '0.1em' }}
            >
              Preserve
            </h2>
            
            <div className="space-y-1 sm:space-y-2">
              <h1 
                className="text-3xl sm:text-4xl md:text-5xl font-medium text-white" 
                style={{ 
                  fontFamily: 'Archivo', 
                  letterSpacing: '-0.05em',
                  lineHeight: '1.1em'
                }}
              >
                YOUR FAMILY
              </h1>
              
              <h1 
                className="text-2xl sm:text-3xl md:text-4xl italic text-white font-light" 
                style={{ 
                  fontFamily: 'serif',
                  letterSpacing: '0.02em'
                }}
              >
                Stories
              </h1>
            </div>
          </div>

          {/* Description */}
          <p className="text-white/80 text-xs sm:text-sm max-w-sm mx-auto px-2" style={{ fontFamily: 'Inter', letterSpacing: '-0.02em' }}>
            Share stories, photos, and voice memos with your family. Build a digital memory book together.
          </p>

          {/* Sign In Options */}
          {!showSignIn ? (
            <div className="sm:pt-4 space-y-3 pt-[20px] pr-[0px] pb-[0px] pl-[0px]">
              <Button 
                onClick={() => setShowSignIn(true)} 
                className="bg-white text-primary hover:bg-white/95 hover:text-[#515751] shadow-2xl border-0 h-11 sm:h-12 px-6 sm:px-8 font-semibold rounded-full w-full" 
                size="lg"
                style={{ fontFamily: 'Inter', letterSpacing: '-0.02em' }}
              >
                Get Started
              </Button>
            </div>
          ) : (
            <div className="pt-2 sm:pt-4 space-y-2 sm:space-y-3">
              {/* Apple Sign In */}
              <Button 
                onClick={onNext}
                variant="outline"
                className="w-full h-10 sm:h-12 bg-black hover:bg-black/90 text-white hover:text-[#F1F1F1] border-0 rounded-full font-medium text-sm sm:text-base"
                style={{ fontFamily: 'Inter', letterSpacing: '-0.02em' }}
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Continue with Apple
              </Button>

              {/* Google Sign In */}
              <Button 
                onClick={onNext}
                variant="outline"
                className="w-full h-10 sm:h-12 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-full font-medium text-sm sm:text-base"
                style={{ fontFamily: 'Inter', letterSpacing: '-0.02em' }}
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </Button>

              <div className="flex items-center gap-3 py-0.5 sm:py-1">
                <Separator className="flex-1 bg-white/20" />
                <span className="text-white/60 text-xs">or</span>
                <Separator className="flex-1 bg-white/20" />
              </div>

              {/* Email Sign In */}
              <Button 
                onClick={onNext}
                variant="outline"
                className="w-full h-10 sm:h-12 bg-white/10 hover:bg-white/20 text-white hover:text-white border border-white/30 rounded-full font-medium backdrop-blur-sm text-sm sm:text-base"
                style={{ fontFamily: 'Inter', letterSpacing: '-0.02em' }}
              >
                <Mail className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Continue with Email
              </Button>

              {/* Sign In Link for Existing Users */}
              <div className="pt-2 sm:pt-3">
                <Button 
                  onClick={onLogin}
                  variant="ghost"
                  className="w-full h-9 sm:h-10 text-white/80 hover:text-white hover:bg-white/5 rounded-full text-xs sm:text-sm"
                  style={{ fontFamily: 'Inter', letterSpacing: '-0.02em' }}
                >
                  Already have an account? <span className="font-semibold ml-1">Sign In</span>
                </Button>
              </div>

              {/* iOS Install Button */}
              <div className="pt-1">
                <IOSInstallPrompt variant="button" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}