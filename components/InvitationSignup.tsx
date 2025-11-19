import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, Mail, Lock, UserCheck, ArrowRight } from 'lucide-react';
import { SmartAvatar } from './SmartAvatar';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface InvitationData {
  code: string;
  keeper: {
    name: string;
    photo?: string;
    avatarZoom?: number;
    avatarRotation?: number;
  };
  invitation: {
    tellerName?: string;
    tellerPhoto?: string;
    tellerRelationship?: string;
    tellerBio?: string;
    tellerBirthday?: string;
    tellerAvatarZoom?: number;
    tellerAvatarRotation?: number;
  };
}

interface InvitationSignupProps {
  inviteCode: string;
  onSignupComplete: () => void;
}

export function InvitationSignup({ inviteCode, onSignupComplete }: InvitationSignupProps) {
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    fetchInvitationData();
  }, [inviteCode]);

  const fetchInvitationData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-deded1eb/invitations/verify`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ code: inviteCode }),
        }
      );

      const data = await response.json();
      
      if (!data.success) {
        setError(data.error || 'Invalid or expired invitation code');
        return;
      }

      setInvitationData({
        code: inviteCode,
        keeper: {
          name: data.keeper?.name || 'Someone',
          photo: data.keeper?.photo,
          avatarZoom: data.keeper?.avatarZoom,
          avatarRotation: data.keeper?.avatarRotation,
        },
        invitation: {
          tellerName: data.invitation?.tellerName,
          tellerPhoto: data.invitation?.tellerPhoto,
          tellerRelationship: data.invitation?.tellerRelationship,
          tellerBio: data.invitation?.tellerBio,
          tellerBirthday: data.invitation?.tellerBirthday,
          tellerAvatarZoom: data.invitation?.tellerAvatarZoom,
          tellerAvatarRotation: data.invitation?.tellerAvatarRotation,
        },
      });
    } catch (error) {
      console.error('Error fetching invitation:', error);
      setError('Failed to load invitation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    if (!email || !email.includes('@')) {
      setValidationError('Please enter a valid email address');
      return false;
    }
    if (password.length < 8) {
      setValidationError('Password must be at least 8 characters');
      return false;
    }
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return false;
    }
    setValidationError('');
    return true;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    if (!invitationData) return;

    setIsSubmitting(true);
    setError('');

    try {
      // Step 1: Create teller account with pre-filled data
      const signupResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-deded1eb/auth/signup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            email,
            password,
            type: 'teller',
            name: invitationData.invitation.tellerName || 'Storyteller',
            relationship: invitationData.invitation.tellerRelationship || '',
            bio: invitationData.invitation.tellerBio || '',
            photo: invitationData.invitation.tellerPhoto || '',
            birthday: invitationData.invitation.tellerBirthday || '',
          }),
        }
      );

      const signupData = await signupResponse.json();

      if (!signupData.success) {
        setError(signupData.error || 'Failed to create account');
        return;
      }

      // Step 2: Sign in to get access token
      const signinResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-deded1eb/auth/signin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      const signinData = await signinResponse.json();

      if (!signinData.success || !signinData.session?.access_token) {
        console.error('Sign in after signup failed:', signinData.error);
        setError('Account created but sign in failed. Please try signing in manually.');
        return;
      }

      // Step 3: Accept the invitation automatically
      const acceptResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-deded1eb/invitations/accept`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${signinData.session.access_token}`,
          },
          body: JSON.stringify({
            code: inviteCode,
          }),
        }
      );

      const acceptData = await acceptResponse.json();

      if (!acceptData.success) {
        console.error('Failed to accept invitation:', acceptData.error);
        // Still proceed - they can manually connect later
      }

      // Step 4: Complete - trigger auth refresh
      onSignupComplete();
      
    } catch (error) {
      console.error('Signup error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#F5F9E9', fontFamily: 'Inter' }}>
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !invitationData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#F5F9E9', fontFamily: 'Inter' }}>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle style={{ fontFamily: 'Archivo' }}>Invalid Invitation</CardTitle>
            <CardDescription style={{ fontFamily: 'Inter' }}>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.location.href = '/'} 
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              style={{ fontFamily: 'Inter' }}
            >
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitationData) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#F5F9E9', fontFamily: 'Inter' }}>
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center space-y-4 pb-2">
          {/* Keeper Avatar */}
          <div className="flex justify-center">
            <SmartAvatar
              className="h-20 w-20 border-4 border-[#C1C1A5]"
              src={invitationData.keeper.photo}
              alt={invitationData.keeper.name}
              zoom={invitationData.keeper.avatarZoom || 1}
              rotation={invitationData.keeper.avatarRotation || 0}
              fallback={invitationData.keeper.name.charAt(0)}
              fallbackClassName="bg-[#ECF0E2] text-[#36453B]"
            />
          </div>

          <div>
            <CardTitle className="text-2xl mb-2" style={{ fontFamily: 'Archivo' }}>
              You're Invited! 🎉
            </CardTitle>
            <CardDescription className="text-base" style={{ fontFamily: 'Inter' }}>
              <span className="font-semibold text-[#36453B]">{invitationData.keeper.name}</span> invited you to join Adoras
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Pre-filled profile preview */}
          {invitationData.invitation.tellerName && (
            <div className="bg-[#ECF0E2] rounded-lg p-4 border border-[#C1C1A5]/50">
              <div className="flex items-start gap-3">
                <SmartAvatar
                  className="h-12 w-12 mt-1"
                  src={invitationData.invitation.tellerPhoto}
                  alt={invitationData.invitation.tellerName}
                  zoom={invitationData.invitation.tellerAvatarZoom || 1}
                  rotation={invitationData.invitation.tellerAvatarRotation || 0}
                  fallback={invitationData.invitation.tellerName.charAt(0)}
                  fallbackClassName="bg-[#C1C1A5] text-[#36453B]"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[#36453B]" style={{ fontFamily: 'Archivo' }}>
                      {invitationData.invitation.tellerName}
                    </p>
                    <UserCheck className="h-4 w-4 text-[#36453B]" />
                  </div>
                  {invitationData.invitation.tellerRelationship && (
                    <p className="text-sm text-[#596569]" style={{ fontFamily: 'Inter' }}>
                      {invitationData.invitation.tellerRelationship}
                    </p>
                  )}
                  {invitationData.invitation.tellerBio && (
                    <p className="text-sm text-[#596569] mt-1" style={{ fontFamily: 'Inter' }}>
                      {invitationData.invitation.tellerBio}
                    </p>
                  )}
                </div>
              </div>
              <p className="text-xs text-[#596569] mt-3 flex items-center gap-1" style={{ fontFamily: 'Inter' }}>
                <ArrowRight className="h-3 w-3" />
                Your profile has been pre-filled. Just add your email and password!
              </p>
            </div>
          )}

          {/* Signup Form */}
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" style={{ fontFamily: 'Inter' }}>
                <Mail className="inline h-4 w-4 mr-1" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                required
                style={{ fontFamily: 'Inter' }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" style={{ fontFamily: 'Inter' }}>
                <Lock className="inline h-4 w-4 mr-1" />
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                required
                style={{ fontFamily: 'Inter' }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password" style={{ fontFamily: 'Inter' }}>
                <Lock className="inline h-4 w-4 mr-1" />
                Confirm Password
              </Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isSubmitting}
                required
                style={{ fontFamily: 'Inter' }}
              />
            </div>

            {(validationError || error) && (
              <Alert variant="destructive">
                <AlertDescription style={{ fontFamily: 'Inter' }}>
                  {validationError || error}
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
              style={{ fontFamily: 'Inter' }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating your account...
                </>
              ) : (
                <>
                  Join Adoras & Connect
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground" style={{ fontFamily: 'Inter' }}>
            By signing up, you'll be automatically connected with {invitationData.keeper.name}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
