import React, { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Alert, AlertDescription } from './ui/alert';
import { UserProfile } from '../App';
import { ArrowLeft, Shield, Eye, Calendar as CalendarIcon, Upload, X, Loader2, AlertCircle, Send, Copy, Check, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { AvatarCropper } from './AvatarCropper';

interface KeeperOnboardingProps {
  onComplete: (profile: UserProfile, invitationCode?: string) => void;
  onBack: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export function KeeperOnboarding({ onComplete, onBack, isLoading = false, error = null }: KeeperOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    name: '',
    age: undefined,
    relationship: '',
    bio: '',
    photo: undefined
  });
  const [storytellerInfo, setStorytellerInfo] = useState<{
    name: string;
    birthday: Date | undefined;
    relationship: string;
    bio: string;
    photo?: string;
  }>({
    name: '',
    birthday: undefined,
    relationship: '',
    bio: '',
    photo: undefined
  });
  const [privacySettings, setPrivacySettings] = useState({
    allowAI: true,
    publicUploads: false
  });
  
  // Invitation state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [invitationCode, setInvitationCode] = useState<string | null>(null);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [skipInvitation, setSkipInvitation] = useState(false);

  const keeperAvatarInputRef = useRef<HTMLInputElement>(null);
  const storytellerAvatarInputRef = useRef<HTMLInputElement>(null);
  
  const [showKeeperCropper, setShowKeeperCropper] = useState(false);
  const [showStorytellerCropper, setShowStorytellerCropper] = useState(false);
  const [tempKeeperImage, setTempKeeperImage] = useState<string>('');
  const [tempStorytellerImage, setTempStorytellerImage] = useState<string>('');
  const [birthdayPopoverOpen, setBirthdayPopoverOpen] = useState(false);

  const handleKeeperAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempKeeperImage(reader.result as string);
        setShowKeeperCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleKeeperCropComplete = (croppedImageUrl: string) => {
    setProfile(prev => ({ ...prev, photo: croppedImageUrl }));
    setShowKeeperCropper(false);
    setTempKeeperImage('');
    toast.success('Avatar uploaded successfully!');
    if (keeperAvatarInputRef.current) {
      keeperAvatarInputRef.current.value = '';
    }
  };
  
  const handleKeeperCropCancel = () => {
    setShowKeeperCropper(false);
    setTempKeeperImage('');
    if (keeperAvatarInputRef.current) {
      keeperAvatarInputRef.current.value = '';
    }
  };

  const handleStorytellerAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempStorytellerImage(reader.result as string);
        setShowStorytellerCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleStorytellerCropComplete = (croppedImageUrl: string) => {
    setStorytellerInfo(prev => ({ ...prev, photo: croppedImageUrl }));
    setShowStorytellerCropper(false);
    setTempStorytellerImage('');
    toast.success('Avatar uploaded successfully!');
    if (storytellerAvatarInputRef.current) {
      storytellerAvatarInputRef.current.value = '';
    }
  };
  
  const handleStorytellerCropCancel = () => {
    setShowStorytellerCropper(false);
    setTempStorytellerImage('');
    if (storytellerAvatarInputRef.current) {
      storytellerAvatarInputRef.current.value = '';
    }
  };

  const handleRemoveKeeperAvatar = () => {
    setProfile(prev => ({ ...prev, photo: undefined }));
    if (keeperAvatarInputRef.current) {
      keeperAvatarInputRef.current.value = '';
    }
  };

  const handleRemoveStorytellerAvatar = () => {
    setStorytellerInfo(prev => ({ ...prev, photo: undefined }));
    if (storytellerAvatarInputRef.current) {
      storytellerAvatarInputRef.current.value = '';
    }
  };

  const generateInvitationCode = () => {
    // Generate a simple alphanumeric code for now
    // The backend will create the actual invitation when signup completes
    const prefix = 'FAM';
    const year = new Date().getFullYear();
    const randomChars = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `${prefix}-${year}-${randomChars}`;
  };

  const handleCopyCode = async () => {
    if (invitationCode) {
      try {
        await navigator.clipboard.writeText(invitationCode);
        setCodeCopied(true);
        toast.success('Code copied to clipboard!');
        setTimeout(() => setCodeCopied(false), 2000);
      } catch (err) {
        toast.error('Failed to copy code');
      }
    }
  };

  const handleNext = () => {
    if (currentStep < 6) {
      // Generate invitation code when moving to step 4 (Invite step)
      if (currentStep === 3 && !invitationCode) {
        setInvitationCode(generateInvitationCode());
      }
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding with all data including invitation code
      onComplete({
        ...profile,
        storytellerInfo,
        invitationCode: skipInvitation ? undefined : invitationCode || undefined,
        phoneNumber: skipInvitation ? undefined : phoneNumber || undefined,
      } as UserProfile, invitationCode || undefined);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      onBack();
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 2:
        return profile.name && profile.age && profile.relationship;
      case 3:
        return storytellerInfo.name && storytellerInfo.birthday && storytellerInfo.relationship;
      case 4:
        return true; // Invitation step - optional
      case 5:
        return true; // How it works - no validation needed
      case 6:
        return true; // Privacy settings - no validation needed
      default:
        return true;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="min-h-[400px] sm:min-h-[450px] flex flex-col justify-between">
            <div className="space-y-3 sm:space-y-4">
              <div className="text-center space-y-1 sm:space-y-2">
                <h2 className="text-xl sm:text-2xl font-bold text-[#36453B]">Welcome!</h2>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Let's help you reconnect with your elders through shared memories
                </p>
              </div>
              <div className="bg-[rgb(255,255,255)] p-3 sm:p-4 rounded-lg">
                <p className="text-xs sm:text-sm text-[rgb(89,101,105)]">
                  This app helps you and your elders share stories, photos, and memories in a private, secure space.
                </p>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="min-h-[400px] sm:min-h-[450px] flex flex-col justify-between">
            <div className="space-y-3 sm:space-y-4">
              <div className="text-center space-y-1 sm:space-y-2">
                <h2 className="text-xl sm:text-2xl font-bold text-[#36453B]">Tell us about yourself</h2>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Help your elder recognize you
                </p>
              </div>
              <div className="space-y-4">
                {/* Avatar Upload */}
                <div className="flex flex-col items-center space-y-3">
                  <Label className="text-center">Your Photo (Optional)</Label>
                  <div className="relative">
                    <Avatar className="w-24 h-24 ring-2 ring-primary/20">
                      <AvatarImage src={profile.photo} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {profile.name ? profile.name[0].toUpperCase() : <Upload className="w-8 h-8" />}
                      </AvatarFallback>
                    </Avatar>
                    {profile.photo && (
                      <button
                        onClick={handleRemoveKeeperAvatar}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <input
                    ref={keeperAvatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleKeeperAvatarUpload}
                    className="hidden"
                    id="keeper-avatar-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => keeperAvatarInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {profile.photo ? 'Change Photo' : 'Upload Photo'}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    JPG, PNG or GIF (max 5MB)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Your Name</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter your name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age">Your Age</Label>
                  <Input
                    id="age"
                    type="number"
                    value={profile.age || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, age: parseInt(e.target.value) }))}
                    placeholder="Enter your age"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="relationship">Relationship</Label>
                  <Select 
                    value={profile.relationship} 
                    onValueChange={(value) => setProfile(prev => ({ ...prev, relationship: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Son">Son</SelectItem>
                      <SelectItem value="Daughter">Daughter</SelectItem>
                      <SelectItem value="Grandson">Grandson</SelectItem>
                      <SelectItem value="Granddaughter">Granddaughter</SelectItem>
                      <SelectItem value="Nephew">Nephew</SelectItem>
                      <SelectItem value="Niece">Niece</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Short Bio (Optional)</Label>
                  <Textarea
                    id="bio"
                    value={profile.bio}
                    onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Tell your elder a little about yourself..."
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="min-h-[400px] sm:min-h-[450px] flex flex-col justify-between">
            <div className="space-y-3 sm:space-y-4">
              <div className="text-center space-y-1 sm:space-y-2">
                <h2 className="text-xl sm:text-2xl font-bold text-[#36453B]">Tell us about your storyteller</h2>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Help us prepare for their connection
                </p>
              </div>
              <div className="space-y-4">
                {/* Storyteller Avatar Upload */}
                <div className="flex flex-col items-center space-y-3">
                  <Label className="text-center">Their Photo (Optional)</Label>
                  <div className="relative">
                    <Avatar className="w-24 h-24 ring-2 ring-primary/20">
                      <AvatarImage src={storytellerInfo.photo} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {storytellerInfo.name ? storytellerInfo.name[0].toUpperCase() : <Upload className="w-8 h-8" />}
                      </AvatarFallback>
                    </Avatar>
                    {storytellerInfo.photo && (
                      <button
                        onClick={handleRemoveStorytellerAvatar}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <input
                    ref={storytellerAvatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleStorytellerAvatarUpload}
                    className="hidden"
                    id="storyteller-avatar-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => storytellerAvatarInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {storytellerInfo.photo ? 'Change Photo' : 'Upload Photo'}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    JPG, PNG or GIF (max 5MB)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="storyteller-name">Their Name</Label>
                  <Input
                    id="storyteller-name"
                    value={storytellerInfo.name}
                    onChange={(e) => setStorytellerInfo(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Mom, Dad, Grandma Ruth"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Birthday</Label>
                  <Popover open={birthdayPopoverOpen} onOpenChange={setBirthdayPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {storytellerInfo.birthday ? format(storytellerInfo.birthday, 'PP') : 'Select birthday'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={storytellerInfo.birthday}
                        onSelect={(date) => {
                          setStorytellerInfo(prev => ({ ...prev, birthday: date }));
                          if (date) {
                            setBirthdayPopoverOpen(false);
                          }
                        }}
                        initialFocus
                        captionLayout="dropdown-buttons"
                        fromYear={1920}
                        toYear={new Date().getFullYear()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="storyteller-relationship">Relationship</Label>
                  <Select 
                    value={storytellerInfo.relationship} 
                    onValueChange={(value) => setStorytellerInfo(prev => ({ ...prev, relationship: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mom">Mom</SelectItem>
                      <SelectItem value="Dad">Dad</SelectItem>
                      <SelectItem value="Grandma">Grandma</SelectItem>
                      <SelectItem value="Grandpa">Grandpa</SelectItem>
                      <SelectItem value="Aunt">Aunt</SelectItem>
                      <SelectItem value="Uncle">Uncle</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="storyteller-bio">Short Bio (Optional)</Label>
                  <Textarea
                    id="storyteller-bio"
                    value={storytellerInfo.bio}
                    onChange={(e) => setStorytellerInfo(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Tell them a little about your storyteller..."
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="min-h-[400px] sm:min-h-[450px] flex flex-col justify-between">
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-[#36453B]">Invite Your Storyteller</h2>
                <p className="text-muted-foreground text-sm">
                  Send them an invitation to join Adoras
                </p>
              </div>

              {!skipInvitation ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Their Phone Number (Optional)</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="(555) 123-4567"
                    />
                    <p className="text-xs text-muted-foreground">
                      We'll send them an SMS with your invitation code
                    </p>
                  </div>

                  {invitationCode && (
                    <div className="space-y-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <Label>Your Invitation Code</Label>
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-white p-3 rounded border text-center">
                          <code className="text-lg font-bold text-primary tracking-wider">
                            {invitationCode}
                          </code>
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleCopyCode}
                          className="flex-shrink-0"
                        >
                          {codeCopied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Share this code with {storytellerInfo.name} to connect
                      </p>
                    </div>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSkipInvitation(true)}
                    className="w-full"
                  >
                    Skip for now
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      You can invite {storytellerInfo.name} later from your dashboard
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSkipInvitation(false)}
                    className="w-full"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send Invitation Now
                  </Button>
                </div>
              )}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="min-h-[400px] sm:min-h-[450px] flex flex-col justify-between">
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-[#36453B]">How it works</h2>
                <p className="text-muted-foreground">
                  Building memories together is simple
                </p>
              </div>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="bg-[rgba(17,17,18,0.2)] p-2 rounded-full flex-shrink-0">
                    <span className="text-[rgb(54,69,59)] font-bold text-sm">1</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-[rgb(54,69,59)]">Send daily prompts</h4>
                    <p className="text-sm text-muted-foreground">Ask questions that spark meaningful conversations</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-[rgba(17,17,18,0.2)] p-2 rounded-full flex-shrink-0">
                    <span className="text-[rgb(54,69,59)] font-bold text-sm">2</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-[rgb(54,69,59)]">Share stories & media</h4>
                    <p className="text-sm text-muted-foreground">Exchange photos, voice memos, and messages</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-[rgba(17,17,18,0.2)] p-2 rounded-full flex-shrink-0">
                    <span className="text-[rgb(54,69,59)] font-bold text-sm">3</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-[rgb(54,69,59)]">Build your timeline</h4>
                    <p className="text-sm text-muted-foreground">AI organizes your memories into a beautiful timeline</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="min-h-[400px] sm:min-h-[450px] flex flex-col justify-between">
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-[#36453B]">Privacy Settings</h2>
                <p className="text-muted-foreground">
                  Choose how your memories are handled
                </p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-start space-x-3">
                    <Shield className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <h4 className="font-semibold">AI Organization</h4>
                      <p className="text-sm text-muted-foreground">
                        Allow AI to categorize and organize your memories
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={privacySettings.allowAI}
                    onCheckedChange={(checked) => 
                      setPrivacySettings(prev => ({ ...prev, allowAI: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-start space-x-3">
                    <Eye className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <h4 className="font-semibold">Shared Visibility</h4>
                      <p className="text-sm text-muted-foreground">
                        Only you and your storyteller can see your memories
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={!privacySettings.publicUploads}
                    onCheckedChange={(checked) => 
                      setPrivacySettings(prev => ({ ...prev, publicUploads: !checked }))
                    }
                  />
                </div>
                <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
                  <p className="text-sm text-primary text-center">
                    Your memories are private and secure. Only you and your connected storytellers can see them.
                  </p>
                </div>
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
            Step {currentStep} of 6
          </div>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
          <div 
            className="bg-primary h-1.5 sm:h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / 6) * 100}%` }}
          />
        </div>

        {renderStep()}

        <Button 
          onClick={handleNext} 
          className="w-full h-10 sm:h-11 text-sm sm:text-base" 
          disabled={!isStepValid()}
        >
          {currentStep === 6 ? 'Complete Setup' : 'Continue'}
        </Button>

        {isLoading && (
          <div className="absolute top-0 left-0 right-0 bottom-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          </div>
        )}

        {error && (
          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )}
      </Card>
      
      {/* Avatar Cropper Dialogs */}
      <AvatarCropper
        key={`keeper-${tempKeeperImage}`}
        imageUrl={tempKeeperImage}
        isOpen={showKeeperCropper}
        onCropComplete={handleKeeperCropComplete}
        onCancel={handleKeeperCropCancel}
      />
      <AvatarCropper
        key={`storyteller-${tempStorytellerImage}`}
        imageUrl={tempStorytellerImage}
        isOpen={showStorytellerCropper}
        onCropComplete={handleStorytellerCropComplete}
        onCancel={handleStorytellerCropCancel}
      />
    </div>
  );
}