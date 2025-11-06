import React from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { UserType } from '../App';
import { Crown, Users, ArrowRight, ArrowLeft } from 'lucide-react';

interface UserTypeSelectionProps {
  onSelect: (type: UserType) => void;
  onBack?: () => void;
}

export function UserTypeSelection({ onSelect, onBack }: UserTypeSelectionProps) {
  return (
    <div 
      className="flex items-start justify-center p-2 sm:p-4 animate-fade-in relative" 
      style={{ 
        backgroundColor: 'rgb(245, 249, 233)',
        minHeight: '100svh',
        paddingTop: 'max(8rem, calc(env(safe-area-inset-top) + 6rem))',
        paddingBottom: 'env(safe-area-inset-bottom, 1rem)'
      }}
    >
      {/* Timeline at the top */}
      <div className="absolute top-4 sm:top-8 left-1/2 transform -translate-x-1/2 z-10 w-full max-w-[90vw] md:max-w-none md:w-auto">
        <div className="flex items-start justify-between md:gap-1">
          {[1, 2, 3, 4, 5].map((num, index) => (
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

      {/* Logo - positioned below timeline */}
      <div className="absolute top-16 sm:top-20 md:top-24 left-4 sm:left-8 md:left-12 flex items-center gap-3 z-10">
        <div className="w-full max-w-[60px] sm:max-w-[75px] md:max-w-[90px]">
          <img 
            src="https://cdn.shopify.com/s/files/1/0504/5963/9996/files/ADORASLogo-1-white.png?v=1762417593" 
            alt="Adoras Logo" 
            className="w-full h-auto object-contain"
          />
        </div>
      </div>

      {/* Back Button - positioned under logo */}
      {onBack && (
        <div className="absolute top-32 sm:top-36 md:top-40 left-4 sm:left-8 md:left-12 z-10">
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
      )}

      <Card className="w-full max-w-2xl space-y-6 sm:space-y-10 animate-slide-up shadow-lg border-border/30 backdrop-blur-sm bg-transparent p-6 sm:p-[40px] m-0">
        <div className="text-center space-y-2 sm:space-y-4">
          <h2 className="text-2xl sm:text-4xl font-medium" style={{ fontFamily: 'Archivo', letterSpacing: '-0.07em', color: '#36453B' }}>
            Who are you?
          </h2>
          <p className="text-muted-foreground text-base sm:text-xl" style={{ fontFamily: 'Inter', letterSpacing: '-0.05em' }}>
            Choose your role to get started with Adoras
          </p>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <Button
            onClick={() => onSelect('keeper')}
            variant="outline"
            className="w-full h-auto min-h-[100px] sm:h-28 flex items-center justify-between p-4 sm:p-8 hover:bg-primary/5 border-2 hover:border-primary/30 transition-all duration-200 group bg-[rgba(236,240,226,0.4)]"
            style={{ color: 'rgb(54, 69, 59)' }}
          >
            <div className="flex items-center space-x-3 sm:space-x-6">
              <div className="p-3 sm:p-4 bg-primary/10 rounded-2xl group-hover:bg-accent/70 transition-colors">
                <Crown className="w-6 h-6 sm:w-10 sm:h-10 text-primary" />
              </div>
              <div className="text-left space-y-0.5 sm:space-y-1">
                <div className="font-semibold text-base sm:text-xl" style={{ fontFamily: 'Archivo', letterSpacing: '-0.05em', fontSize: '0.85em' }}>
                  I'm the Legacy Keeper
                </div>
                <div className="text-[10px] sm:text-xs text-muted-foreground" style={{ fontFamily: 'Inter' }}>
                  Start the connection<br />with your storyteller
                </div>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
          </Button>

          <Button
            onClick={() => onSelect('teller')}
            variant="outline"
            className="w-full h-auto min-h-[100px] sm:h-28 flex items-center justify-between p-4 sm:p-8 hover:bg-primary/5 border-2 hover:border-primary/30 transition-all duration-200 group bg-[rgba(236,240,226,0.4)]"
            style={{ color: 'rgb(54, 69, 59)' }}
          >
            <div className="flex items-center space-x-3 sm:space-x-6">
              <div className="p-3 sm:p-4 bg-accent/50 rounded-2xl group-hover:bg-accent/70 transition-colors bg-[rgba(54,69,59,0.1)]">
                <Users className="w-6 h-6 sm:w-10 sm:h-10 text-primary" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-base sm:text-xl" style={{ fontFamily: 'Archivo', letterSpacing: '-0.05em', fontSize: '0.85em' }}>
                  I'm the Storyteller
                </div>
                <div className="text-[10px] sm:text-xs text-muted-foreground" style={{ fontFamily: 'Inter' }}>
                  Join using the<br />legacy keeper's invitation
                </div>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
          </Button>
        </div>

        <div className="text-center">
          <p className="text-xs sm:text-sm text-muted-foreground bg-muted/30 rounded-xl p-3 sm:p-4 inline-block" style={{ fontFamily: 'Inter' }}>
            This choice will customize your Adoras experience
          </p>
        </div>
      </Card>
    </div>
  );
}
