// OnboardingTour.tsx - First-time user introduction guide
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';
import { UserType } from '../App';
import { Sparkles, Users, MessageCircle, Image as ImageIcon, Zap, Bell, CheckCircle, ArrowRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface OnboardingTourProps {
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
  userType: UserType;
  userName: string;
}

interface Step {
  title: string;
  description: string;
  icon: React.ReactNode;
  image?: string;
  keeperContent?: string;
  tellerContent?: string;
}

export function OnboardingTour({ 
  isOpen, 
  onComplete, 
  onSkip, 
  userType, 
  userName 
}: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps: Step[] = [
    {
      title: `Welcome to Adoras, ${userName}!`,
      description: "Let's take a quick tour to help you get started with preserving and sharing your family memories.",
      icon: <Sparkles className="w-12 h-12 text-[#36453B]" />,
      keeperContent: "As a Keeper, you'll preserve memories and share stories with your family.",
      tellerContent: "As a Teller, you'll help capture precious memories from your loved ones.",
    },
    {
      title: "Connect with Family",
      description: userType === 'keeper' 
        ? "You can connect with Tellers (usually younger family members) who will help you share your stories, or with other Keepers to share memories together."
        : "Connect with Keepers (usually older family members) to help them preserve their precious memories and life stories.",
      icon: <Users className="w-12 h-12 text-[#36453B]" />,
      keeperContent: "💡 Tip: You can have multiple connections - one with each family member who wants to help capture your memories.",
      tellerContent: "💡 Tip: You can help multiple Keepers preserve their stories - parents, grandparents, aunts, uncles, and more!",
    },
    {
      title: "Three Ways to Share",
      description: "Adoras makes it easy to capture and share memories in the way that works best for you.",
      icon: <MessageCircle className="w-12 h-12 text-[#36453B]" />,
      keeperContent: "📝 Text messages\n🎙️ Voice recordings\n📸 Photos & videos",
      tellerContent: "📝 Text messages\n🎙️ Voice recordings\n📸 Photos & videos",
    },
    {
      title: "Prompts Tab",
      description: userType === 'keeper'
        ? "Get thoughtful questions every 2 days to help you remember and share stories from your life. Perfect conversation starters!"
        : "Send thoughtful prompts to your Keepers to help them remember and share their stories. You'll also get prompts to share your own memories.",
      icon: <Zap className="w-12 h-12 text-[#36453B]" />,
      keeperContent: "Examples:\n• \"Tell me about your first job\"\n• \"What was your favorite childhood memory?\"\n• \"Describe your wedding day\"",
      tellerContent: "💡 Tip: Connection-level prompts (marked 'Shared') are perfect for guided conversations between you and your Keeper.",
    },
    {
      title: "Chat Tab",
      description: "Have real-time conversations, share memories, and respond to prompts. All your messages are preserved forever.",
      icon: <MessageCircle className="w-12 h-12 text-[#36453B]" />,
      keeperContent: "Share your stories through text, voice notes, photos, and videos. Your Teller will help organize everything.",
      tellerContent: "Chat with your Keepers, ask follow-up questions, and help them expand on their stories.",
    },
    {
      title: "Media Library",
      description: "Every photo, video, and voice note you share is automatically organized in your media library.",
      icon: <ImageIcon className="w-12 h-12 text-[#36453B]" />,
      keeperContent: "Relive memories anytime by browsing your collection. You can export everything as a ZIP file to keep forever.",
      tellerContent: "Browse all the precious memories you've helped capture. Export them to create physical albums or digital backups.",
    },
    {
      title: "Stay Connected with Notifications",
      description: "Get notified when you receive new messages or prompts. You'll receive prompts at 8am in your local timezone.",
      icon: <Bell className="w-12 h-12 text-[#36453B]" />,
      keeperContent: "💡 Enable notifications in Settings to never miss a message or new prompt from your family.",
      tellerContent: "💡 Enable notifications so you can respond quickly when your Keepers share their stories.",
    },
    {
      title: "Ready to Get Started!",
      description: userType === 'keeper'
        ? "You're all set! Start by connecting with a Teller or another Keeper to begin sharing your precious memories."
        : "You're all set! Start by connecting with a Keeper to help them preserve their life stories.",
      icon: <CheckCircle className="w-12 h-12 text-[#36453B]" />,
      keeperContent: "🎉 Tip: You can connect with family members by creating an invitation in Settings → Connections.",
      tellerContent: "🎉 Tip: Ask your family member to send you a connection invitation, or create one yourself in Settings → Connections.",
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleDotClick = (index: number) => {
    setCurrentStep(index);
  };

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-2xl p-0 gap-0 overflow-hidden bg-[#F5F9E9]"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Skip button */}
        <button
          onClick={onSkip}
          className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-white/50 transition-colors"
          aria-label="Skip tour"
        >
          <X className="w-5 h-5 text-[#36453B]" />
        </button>

        {/* Content */}
        <div className="relative min-h-[500px] flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col p-8 sm:p-12"
            >
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-md">
                  {currentStepData.icon}
                </div>
              </div>

              {/* Title */}
              <h2 className="text-center mb-4 text-[#36453B]">
                {currentStepData.title}
              </h2>

              {/* Description */}
              <p className="text-center text-[#36453B]/80 mb-6">
                {currentStepData.description}
              </p>

              {/* Role-specific content */}
              {(currentStepData.keeperContent || currentStepData.tellerContent) && (
                <div className="bg-white rounded-lg p-6 mb-6 border-2 border-[#36453B]/10">
                  <p className="text-[#36453B] whitespace-pre-line leading-relaxed">
                    {userType === 'keeper' 
                      ? currentStepData.keeperContent 
                      : currentStepData.tellerContent}
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="p-6 sm:p-8 pt-0">
            {/* Progress dots */}
            <div className="flex justify-center gap-2 mb-6">
              {steps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => handleDotClick(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === currentStep
                      ? 'w-8 bg-[#36453B]'
                      : 'w-2 bg-[#36453B]/30 hover:bg-[#36453B]/50'
                  }`}
                  aria-label={`Go to step ${index + 1}`}
                />
              ))}
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="flex-1 border-[#36453B] text-[#36453B] hover:bg-[#36453B]/10"
                >
                  Back
                </Button>
              )}
              <Button
                onClick={handleNext}
                className="flex-1 bg-[#36453B] hover:bg-[#36453B]/90 text-white"
              >
                {isLastStep ? (
                  <>
                    Get Started
                    <CheckCircle className="w-4 h-4 ml-2" />
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>

            {/* Step counter */}
            <p className="text-center text-sm text-[#36453B]/60 mt-4">
              Step {currentStep + 1} of {steps.length}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
