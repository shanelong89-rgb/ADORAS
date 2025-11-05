/**
 * iOS Settings Guide Component
 * Provides step-by-step visual guide to enable notifications in iOS Settings
 * Since we cannot programmatically change iOS Settings, we guide users through it
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { 
  Settings, 
  Bell, 
  ChevronRight, 
  CheckCircle2, 
  ArrowRight,
  Smartphone,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent } from './ui/card';

interface IOSSettingsGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason: 'blocked' | 'first-time' | 'instructions';
}

export function IOSSettingsGuide({ open, onOpenChange, reason }: IOSSettingsGuideProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 6;

  const steps = [
    {
      number: 1,
      title: 'Open iPhone Settings',
      description: 'Tap the Settings app on your home screen',
      icon: Settings,
      detail: 'Look for the gray gear icon labeled "Settings"',
    },
    {
      number: 2,
      title: 'Scroll Down',
      description: 'Scroll down to find "Adoras"',
      icon: ArrowRight,
      detail: 'Apps are listed alphabetically below system settings',
    },
    {
      number: 3,
      title: 'Tap Adoras',
      description: 'Open Adoras app settings',
      icon: Smartphone,
      detail: 'You\'ll see the Adoras app icon next to the name',
    },
    {
      number: 4,
      title: 'Tap Notifications',
      description: 'Select the Notifications option',
      icon: Bell,
      detail: 'This opens notification-specific settings',
    },
    {
      number: 5,
      title: 'Enable Allow Notifications',
      description: 'Toggle "Allow Notifications" to ON',
      icon: CheckCircle2,
      detail: 'The switch will turn green when enabled',
    },
    {
      number: 6,
      title: 'Enable Additional Options',
      description: 'Turn on these recommended settings:',
      icon: CheckCircle2,
      detail: '• Lock Screen\n• Notification Center\n• Banners\n• Badge App Icon\n• Sounds',
    },
  ];

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleDone = () => {
    onOpenChange(false);
  };

  const currentStepData = steps[currentStep - 1];
  const Icon = currentStepData.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Enable Notifications in iOS Settings
          </DialogTitle>
          <DialogDescription>
            {reason === 'blocked' 
              ? 'Notifications are currently blocked. Follow these steps to enable them.'
              : 'Follow these steps to enable notifications for Adoras.'}
          </DialogDescription>
        </DialogHeader>

        {/* Important Note */}
        {reason === 'blocked' && (
          <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-sm text-orange-800 dark:text-orange-200">
              <strong>Why do I need to do this?</strong> iOS security prevents apps from changing settings automatically. You must enable notifications manually in iPhone Settings.
            </AlertDescription>
          </Alert>
        )}

        {/* Step Progress */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-muted-foreground">
            Step {currentStep} of {totalSteps}
          </span>
          <div className="flex gap-1">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 w-8 rounded-full transition-colors ${
                  index + 1 === currentStep
                    ? 'bg-[#36453B]'
                    : index + 1 < currentStep
                    ? 'bg-green-500'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Current Step Card */}
        <Card className="border-2 border-[#36453B]/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#36453B] flex items-center justify-center">
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">
                  {currentStepData.title}
                </h3>
                <p className="text-muted-foreground mb-3">
                  {currentStepData.description}
                </p>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm whitespace-pre-line">
                    {currentStepData.detail}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Visual Path Indicator */}
        {currentStep <= 5 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground px-4">
            <span className="font-medium">Path:</span>
            <span>Settings</span>
            {currentStep >= 2 && <ChevronRight className="w-3 h-3" />}
            {currentStep >= 2 && <span>Scroll to Adoras</span>}
            {currentStep >= 3 && <ChevronRight className="w-3 h-3" />}
            {currentStep >= 3 && <span>Adoras</span>}
            {currentStep >= 4 && <ChevronRight className="w-3 h-3" />}
            {currentStep >= 4 && <span>Notifications</span>}
            {currentStep >= 5 && <ChevronRight className="w-3 h-3" />}
            {currentStep >= 5 && <span>Allow Notifications</span>}
          </div>
        )}

        {/* Success Message on Last Step */}
        {currentStep === totalSteps && (
          <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-900 dark:text-green-100">
              Almost Done!
            </AlertTitle>
            <AlertDescription className="text-sm text-green-800 dark:text-green-200">
              After enabling these settings in iOS Settings, return to Adoras and tap "Enable Notifications" again.
            </AlertDescription>
          </Alert>
        )}

        {/* Navigation */}
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="w-full sm:w-auto"
          >
            Previous
          </Button>
          <div className="flex gap-2 flex-1">
            <Button
              variant="outline"
              onClick={handleDone}
              className="flex-1 sm:flex-none"
            >
              Close
            </Button>
            {currentStep < totalSteps ? (
              <Button
                onClick={handleNext}
                className="flex-1 bg-[#36453B] hover:bg-[#36453B]/90"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleDone}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Got It!
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
