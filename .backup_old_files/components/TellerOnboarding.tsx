import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { UserProfile, AppLanguage } from '../App';
import { ArrowLeft, Heart, Camera, MessageCircle, Mic, Globe, Loader2, AlertCircle } from 'lucide-react';
import { apiClient } from '../utils/api/client';

interface TellerOnboardingProps {
  onComplete: (profile: UserProfile & { invitationCode: string }) => void;
  onBack: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export function TellerOnboarding({ onComplete, onBack, isLoading = false, error = null }: TellerOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [inviteCode, setInviteCode] = useState('');
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    name: '',
    relationship: 'Teller',
    bio: ''
  });
  const [keeperName, setKeeperName] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete({ ...profile, invitationCode: inviteCode } as UserProfile & { invitationCode: string });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      onBack();
    }
  };

  const handleInviteSubmit = async () => {
    // If no code entered, skip verification
    if (!inviteCode.trim()) {
      handleSkipInvitation();
      return;
    }

    setIsVerifying(true);
    setVerificationError(null);

    try {
      // Verify invitation code with backend
      const response = await apiClient.verifyInvitationCode(inviteCode);

      if (!response.success) {
        setVerificationError(response.error || 'Invalid invitation code');
        return;
      }

      // Store keeper info
      if (response.keeper) {
        setKeeperName(response.keeper.name);
      }

      // Show dev mode indicator if applicable
      if ((response as any).devMode) {
        console.log('🧪 DEV MODE: Using auto-generated test invitation');
      }

      // Move to next step
      setCurrentStep(2);
    } catch (err) {
      console.error('Error verifying invitation code:', err);
      setVerificationError('Failed to verify invitation code. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSkipInvitation = () => {
    // Allow user to skip invitation and connect later
    setInviteCode(''); // Clear any entered code
    setKeeperName(''); // Clear keeper name
    setVerificationError(null); // Clear any errors
    setCurrentStep(2); // Move to profile step
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return true; // Always allow moving forward - code is optional
      case 2:
        return profile.name;
      default:
        return true;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="min-h-[400px] sm:min-h-[450px] flex flex-col justify-between">
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-[rgb(241,241,241)] rounded-full">
                    <Heart className="w-8 h-8 text-[#36453B]" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-[rgb(54,69,59)]">Welcome!</h2>
                <p className="text-muted-foreground">
                  You've been invited to share memories with your keeper
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="inviteCode">Invitation Code</Label>
                  <Input
                    id="invite-code"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="Enter invitation code (e.g., FAM-2025-ABC123)"
                  />
                </div>
                {verificationError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="ml-4">
                      {verificationError}
                    </AlertDescription>
                  </Alert>
                )}
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-800">
                    Enter your invitation code to sync with your keeper and start sharing memories together.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="min-h-[400px] sm:min-h-[450px] flex flex-col justify-between">
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-[rgb(54,69,59)]">Your Profile</h2>
                <p className="text-muted-foreground">
                  Complete your profile to get started
                </p>
              </div>
              <div className="space-y-4">
                {keeperName && (
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <p className="text-sm text-green-800">
                      <strong>✓ Connected to:</strong> {keeperName} (Legacy Keeper)
                    </p>
                  </div>
                )}
                {!keeperName && (
                  <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                    <p className="text-sm text-amber-800">
                      <strong>Note:</strong> You can connect with a keeper later from your dashboard.
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="name">Your Name</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="How should your keeper address you?"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio (Optional)</Label>
                  <Input
                    id="bio"
                    value={profile.bio}
                    onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Tell your keeper a little about yourself..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="appLanguage" className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-primary" />
                    App Language
                  </Label>
                  <Select 
                    value={profile.appLanguage || 'english'} 
                    onValueChange={(value: AppLanguage) => setProfile(prev => ({ ...prev, appLanguage: value }))}
                  >
                    <SelectTrigger id="appLanguage">
                      <SelectValue placeholder="Select your preferred language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="english">English</SelectItem>
                      <SelectItem value="spanish">Español (Spanish)</SelectItem>
                      <SelectItem value="french">Français (French)</SelectItem>
                      <SelectItem value="chinese">中文 (Chinese)</SelectItem>
                      <SelectItem value="korean">한국어 (Korean)</SelectItem>
                      <SelectItem value="japanese">日本語 (Japanese)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Choose the language for the app interface
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="min-h-[400px] sm:min-h-[450px] flex flex-col justify-between">
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-[rgb(54,69,59)]">Quick Tutorial</h2>
                <p className="text-muted-foreground">
                  Here's how to share memories with your keeper
                </p>
              </div>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center space-x-3">
                    <MessageCircle className="w-6 h-6 text-[#36453B]" />
                    <div>
                      <h4 className="font-semibold">Respond to Prompts</h4>
                      <p className="text-sm text-muted-foreground">
                        Your keeper will send you questions to spark conversations
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center space-x-3">
                    <Camera className="w-6 h-6 text-[#36453B]" />
                    <div>
                      <h4 className="font-semibold">Share Photos & Videos</h4>
                      <p className="text-sm text-muted-foreground">
                        Upload pictures and videos from your memories together
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center space-x-3">
                    <Mic className="w-6 h-6 text-[#36453B]" />
                    <div>
                      <h4 className="font-semibold">Record Voice Memos</h4>
                      <p className="text-sm text-muted-foreground">
                        Share stories in your own voice for a personal touch
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-[rgb(255,255,255)] p-4 rounded-lg">
                <p className="text-sm text-[rgb(89,101,105)]">
                  <strong>Tip:</strong> The AI will help organize your shared memories into a beautiful timeline you can both explore together.
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-2 sm:p-4 animate-fade-in" style={{ backgroundColor: 'rgb(245, 249, 233)' }}>
      <Card className="w-full max-w-lg p-4 sm:p-6 md:p-10 space-y-4 sm:space-y-6 md:space-y-8 animate-slide-up shadow-xl border border-border/30 backdrop-blur-sm bg-transparent">
        <div className="flex items-center justify-between">
          <Button onClick={handleBack} variant="ghost" size="sm" className="text-[rgb(54,69,59)] text-xs sm:text-sm">
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            Back
          </Button>
          <div className="text-xs sm:text-sm text-muted-foreground">
            Step {currentStep} of 3
          </div>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
          <div 
            className="bg-primary h-1.5 sm:h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / 3) * 100}%` }}
          />
        </div>

        {renderStep()}

        {error && (
          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="ml-4">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <Button 
          onClick={currentStep === 1 ? handleInviteSubmit : handleNext} 
          className="w-full h-10 sm:h-11 text-sm sm:text-base" 
          disabled={!isStepValid() || isLoading || isVerifying}
        >
          {(isLoading || isVerifying) ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            currentStep === 1 ? 'Submit Code' : currentStep === 3 ? 'Get Started' : 'Continue'
          )}
        </Button>

        {currentStep === 1 && (
          <Button
            onClick={handleSkipInvitation}
            variant="ghost"
            className="w-full h-10 sm:h-11 text-sm sm:text-base text-muted-foreground hover:text-foreground"
            disabled={isLoading || isVerifying}
          >
            Skip invitation
          </Button>
        )}
      </Card>
    </div>
  );
}
