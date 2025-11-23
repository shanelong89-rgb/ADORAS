/**
 * InvitationDialog Component
 * Handles invitation creation (for Legacy Keepers) and acceptance (for Storytellers)
 * Supports both NEW users (via phone/SMS) and EXISTING users (via email)
 * Phase 2c Part 3 - Enhanced
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { UserPlus, Check, X, Loader2, Mail, Phone } from 'lucide-react';
import type { UserType } from '../App';

interface InvitationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userType: UserType;
  onCreateInvitation?: (partnerName: string, partnerRelationship: string, phoneNumber: string) => Promise<{ success: boolean; invitationId?: string; message?: string; error?: string }>;
  onConnectViaEmail?: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  onAcceptInvitation?: (invitationCode: string) => Promise<{ success: boolean; message?: string; error?: string }>;
}

export function InvitationDialog({
  isOpen,
  onClose,
  userType,
  onCreateInvitation,
  onConnectViaEmail,
  onAcceptInvitation,
}: InvitationDialogProps) {
  // Connection type selection (for Keepers only)
  const [connectionType, setConnectionType] = useState<'new' | 'existing'>('new');
  
  // Create Invitation for NEW user (for Legacy Keepers)
  const [partnerName, setPartnerName] = useState('');
  const [partnerRelationship, setPartnerRelationship] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  // Connect with EXISTING user (for Legacy Keepers)
  const [partnerEmail, setPartnerEmail] = useState('');
  
  // Accept Invitation (for Storytellers)
  const [invitationCode, setInvitationCode] = useState('');
  
  // UI States
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleCreateInvitation = async () => {
    if (!onCreateInvitation) return;

    // Validation
    if (!partnerName.trim()) {
      setError('Please enter their name');
      return;
    }
    if (!partnerRelationship.trim()) {
      setError('Please enter your relationship');
      return;
    }
    if (!phoneNumber.trim()) {
      setError('Please enter their phone number');
      return;
    }

    // Basic phone number validation
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await onCreateInvitation(
        partnerName.trim(),
        partnerRelationship.trim(),
        cleanPhone
      );

      if (result.success) {
        setSuccess(result.message || 'Invitation sent successfully!');
        
        // Clear form
        setPartnerName('');
        setPartnerRelationship('');
        setPhoneNumber('');
        
        // Close dialog after 2 seconds
        setTimeout(() => {
          onClose();
          setSuccess(null);
        }, 2000);
      } else {
        setError(result.error || 'Failed to send invitation');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectViaEmail = async () => {
    if (!onConnectViaEmail) return;

    // Validation
    if (!partnerEmail.trim()) {
      setError('Please enter their email address');
      return;
    }

    if (!partnerEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await onConnectViaEmail(partnerEmail.trim().toLowerCase());

      if (result.success) {
        setSuccess(result.message || 'Connection request sent!');
        
        // Clear form
        setPartnerEmail('');
        
        // Close dialog after 1.5 seconds (faster to prevent stuck overlay)
        setTimeout(() => {
          setSuccess(null);
          setError(null);
          setIsLoading(false);
          onClose();
        }, 1500);
      } else {
        setError(result.error || 'Failed to send connection request');
        setIsLoading(false);
      }
    } catch (err) {
      setError('Network error. Please try again.');
      setIsLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!onAcceptInvitation) return;

    // Validation
    if (!invitationCode.trim()) {
      setError('Please enter the invitation code');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await onAcceptInvitation(invitationCode.trim());

      if (result.success) {
        setSuccess(result.message || 'Connection established!');
        
        // Clear form
        setInvitationCode('');
        
        // Close dialog after 2 seconds
        setTimeout(() => {
          onClose();
          setSuccess(null);
        }, 2000);
      } else {
        setError(result.error || 'Invalid or expired invitation code');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setPartnerName('');
      setPartnerRelationship('');
      setPhoneNumber('');
      setPartnerEmail('');
      setInvitationCode('');
      setError(null);
      setSuccess(null);
      setConnectionType('new');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'Archivo', letterSpacing: '-0.05em' }}>
            {userType === 'keeper' ? 'Connect with Someone' : 'Join Connection'}
          </DialogTitle>
          <DialogDescription style={{ fontFamily: 'Inter' }}>
            {userType === 'keeper' 
              ? 'Invite someone new to join Adoras, or connect with an existing user.'
              : 'Enter the invitation code you received to connect with a Legacy Keeper.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Success Message */}
          {success && (
            <div className="flex items-center space-x-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <Check className="w-5 h-5 text-primary flex-shrink-0" />
              <p className="text-sm text-primary" style={{ fontFamily: 'Inter' }}>
                {success}
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center space-x-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <X className="w-5 h-5 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive" style={{ fontFamily: 'Inter' }}>
                {error}
              </p>
            </div>
          )}

          {/* Legacy Keeper Form (Create Invitation or Connect) */}
          {userType === 'keeper' && !success && (
            <Tabs value={connectionType} onValueChange={(v) => setConnectionType(v as 'new' | 'existing')} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="new" className="flex items-center gap-2" style={{ fontFamily: 'Inter' }}>
                  <Phone className="w-4 h-4" />
                  New User
                </TabsTrigger>
                <TabsTrigger value="existing" className="flex items-center gap-2" style={{ fontFamily: 'Inter' }}>
                  <Mail className="w-4 h-4" />
                  Existing User
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Invite New User via Phone/SMS */}
              <TabsContent value="new" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="partner-name" style={{ fontFamily: 'Inter' }}>
                    Their Name *
                  </Label>
                  <Input
                    id="partner-name"
                    placeholder="e.g., Dad, Grandma, Mom"
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    disabled={isLoading}
                    style={{ fontFamily: 'Inter' }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="partner-relationship" style={{ fontFamily: 'Inter' }}>
                    Relationship *
                  </Label>
                  <Input
                    id="partner-relationship"
                    placeholder="e.g., Father, Grandmother, Mother"
                    value={partnerRelationship}
                    onChange={(e) => setPartnerRelationship(e.target.value)}
                    disabled={isLoading}
                    style={{ fontFamily: 'Inter' }}>
                  </Input>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone-number" style={{ fontFamily: 'Inter' }}>
                    Phone Number *
                  </Label>
                  <Input
                    id="phone-number"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    disabled={isLoading}
                    style={{ fontFamily: 'Inter' }}
                  />
                  <p className="text-xs text-muted-foreground" style={{ fontFamily: 'Inter' }}>
                    They'll receive an SMS with an invitation code to join Adoras.
                  </p>
                </div>

                <div className="flex space-x-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={handleClose}
                    disabled={isLoading}
                    className="flex-1"
                    style={{ fontFamily: 'Inter' }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateInvitation}
                    disabled={isLoading}
                    className="flex-1 bg-primary hover:bg-primary/90"
                    style={{ fontFamily: 'Inter' }}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Send Invitation
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>

              {/* Tab 2: Connect with Existing User via Email */}
              <TabsContent value="existing" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="partner-email" style={{ fontFamily: 'Inter' }}>
                    Their Email Address *
                  </Label>
                  <Input
                    id="partner-email"
                    type="email"
                    placeholder="their.email@example.com"
                    value={partnerEmail}
                    onChange={(e) => setPartnerEmail(e.target.value)}
                    disabled={isLoading}
                    style={{ fontFamily: 'Inter' }}
                  />
                  <p className="text-xs text-muted-foreground" style={{ fontFamily: 'Inter' }}>
                    Connect with someone who already has an Adoras account. They'll receive a connection request.
                  </p>
                </div>

                <div className="flex space-x-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={handleClose}
                    disabled={isLoading}
                    className="flex-1"
                    style={{ fontFamily: 'Inter' }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConnectViaEmail}
                    disabled={isLoading}
                    className="flex-1 bg-primary hover:bg-primary/90"
                    style={{ fontFamily: 'Inter' }}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Send Request
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          )}

          {/* Storyteller Form (Accept Invitation) */}
          {userType === 'teller' && !success && (
            <>
              <div className="space-y-2">
                <Label htmlFor="invitation-code" style={{ fontFamily: 'Inter' }}>
                  Invitation Code *
                </Label>
                <Input
                  id="invitation-code"
                  placeholder="Enter the 6-digit code from SMS"
                  value={invitationCode}
                  onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                  disabled={isLoading}
                  className="text-center tracking-widest text-lg"
                  maxLength={6}
                  style={{ fontFamily: 'Archivo' }}
                />
                <p className="text-xs text-muted-foreground" style={{ fontFamily: 'Inter' }}>
                  You should have received this code via SMS from your Legacy Keeper.
                </p>
              </div>

              <div className="flex space-x-2 pt-2">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="flex-1"
                  style={{ fontFamily: 'Inter' }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAcceptInvitation}
                  disabled={isLoading}
                  className="flex-1 bg-primary hover:bg-primary/90"
                  style={{ fontFamily: 'Inter' }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Join Connection
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
