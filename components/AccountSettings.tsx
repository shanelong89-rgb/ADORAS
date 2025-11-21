import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Separator } from './ui/separator';
import { UserProfile, AppLanguage } from '../App';
import { Upload, X, User, Mail, Calendar as CalendarIcon, Lock, CreditCard, Save, QrCode, Phone, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { format } from 'date-fns';
import { SimpleAvatarCropper, CropSettings } from './SimpleAvatarCropper';
import { SmartAvatar } from './SmartAvatar';
import { PWAInstallButton } from './PWAInstallPrompt';

interface AccountSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  onUpdateProfile: (updates: Partial<UserProfile>) => void;
}

export function AccountSettings({ isOpen, onClose, userProfile, onUpdateProfile }: AccountSettingsProps) {
  const [name, setName] = useState(userProfile.name);
  const [email, setEmail] = useState(userProfile.email || '');
  const [phoneNumber, setPhoneNumber] = useState(userProfile.phoneNumber || '');
  const [birthday, setBirthday] = useState<Date | undefined>(userProfile.birthday);
  const [appLanguage, setAppLanguage] = useState<AppLanguage>(userProfile.appLanguage || 'english');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [photo, setPhoto] = useState(userProfile.photo);
  const [avatarZoom, setAvatarZoom] = useState(userProfile.avatarZoom || 1);
  const [avatarRotation, setAvatarRotation] = useState(userProfile.avatarRotation || 0);
  const [showQRCode, setShowQRCode] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState<string>('');
  const [birthdayPopoverOpen, setBirthdayPopoverOpen] = useState(false);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempImageUrl(reader.result as string);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleCropComplete = (imageUrl: string, settings: CropSettings) => {
    setPhoto(imageUrl);
    setAvatarZoom(settings.zoom);
    setAvatarRotation(settings.rotation);
    setShowCropper(false);
    setTempImageUrl('');
    toast.success('Photo updated!');
    // Reset file input
    if (avatarInputRef.current) {
      avatarInputRef.current.value = '';
    }
  };
  
  const handleCropCancel = () => {
    setShowCropper(false);
    setTempImageUrl('');
    // Reset file input
    if (avatarInputRef.current) {
      avatarInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = () => {
    setPhoto(undefined);
    setAvatarZoom(1);
    setAvatarRotation(0);
    if (avatarInputRef.current) {
      avatarInputRef.current.value = '';
    }
  };

  const handleAdjustPhoto = () => {
    if (photo) {
      setTempImageUrl(photo);
      setShowCropper(true);
    }
  };

  const handleSaveProfile = () => {
    onUpdateProfile({
      name,
      email,
      phoneNumber,
      birthday,
      photo,
      appLanguage,
      avatarZoom,
      avatarRotation
    });
    toast.success('Profile updated successfully!');
  };

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    // In a real app, this would call an API
    toast.success('Password updated successfully!');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl" style={{ fontFamily: 'Archivo' }}>Account Settings</DialogTitle>
          <DialogDescription>
            Manage your account information and preferences
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Profile Picture */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <User className="w-4 h-4" />
              Profile Picture
            </h3>
            <div className="flex items-center gap-6">
              <div className="relative">
                <SmartAvatar
                  src={photo}
                  zoom={avatarZoom}
                  rotation={avatarRotation}
                  className="w-24 h-24 ring-2 ring-primary/20"
                  fallback={name ? name[0].toUpperCase() : <Upload className="w-8 h-8" />}
                  fallbackClassName="bg-primary/10 text-primary text-2xl"
                />
                {photo && (
                  <button
                    onClick={handleRemoveAvatar}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors shadow-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="space-y-2">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  id="account-avatar-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => avatarInputRef.current?.click()}
                  className="w-full justify-center relative"
                >
                  <Upload className="w-4 h-4 absolute left-3" />
                  <span>{photo ? 'Change Photo' : 'Upload Photo'}</span>
                </Button>
                {photo && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAdjustPhoto}
                    className="w-full"
                  >
                    Adjust Photo
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">
                  JPG, PNG or GIF (max 5MB)
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <User className="w-4 h-4" />
              Personal Information
            </h3>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Enter your phone number"
                    className="pl-10"
                  />
                </div>
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
                      {birthday ? format(birthday, 'PPP') : 'Select your birthday'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={birthday}
                      onSelect={(date) => {
                        setBirthday(date);
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
            </div>
            <Button onClick={handleSaveProfile} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              Save Profile Changes
            </Button>
          </div>

          <Separator />

          {/* App Language */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Globe className="w-4 h-4" />
              App Language
            </h3>
            <div className="space-y-2">
              <Label htmlFor="appLanguage">Preferred Language</Label>
              <Select value={appLanguage} onValueChange={(value: AppLanguage) => setAppLanguage(value)}>
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
                This changes the language for the app interface. You can still view memories in all languages.
              </p>
            </div>
            <Button onClick={handleSaveProfile} className="w-full" variant="outline">
              <Save className="w-4 h-4 mr-2" />
              Save Language Preference
            </Button>
          </div>

          <Separator />

          {/* Payment */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Payment & Billing
            </h3>
            <div className="p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Free Plan</p>
                  <p className="text-sm text-muted-foreground">Currently on the free tier</p>
                </div>
                <Button variant="outline" size="sm">
                  Upgrade
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Button variant="ghost" className="w-full justify-start text-muted-foreground">
                View Billing History
              </Button>
              <Button variant="ghost" className="w-full justify-start text-muted-foreground">
                Manage Payment Methods
              </Button>
              <PWAInstallButton />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
      
      {/* Avatar Cropper Dialog */}
      <SimpleAvatarCropper
        imageUrl={tempImageUrl}
        open={showCropper}
        onSave={handleCropComplete}
        onCancel={handleCropCancel}
        initialZoom={avatarZoom}
        initialRotation={avatarRotation}
      />
    </Dialog>
  );
}
