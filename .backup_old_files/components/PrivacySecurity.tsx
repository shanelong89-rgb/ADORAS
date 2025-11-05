import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Shield, Lock, Eye, Users, Download, Trash2, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { toast } from 'sonner';
import { apiClient } from '../utils/api';
import { UserProfile } from '../App';

interface PrivacySecurityProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  onUpdateProfile: (updates: Partial<UserProfile>) => void;
  onLogout: () => void;
}

export function PrivacySecurity({ isOpen, onClose, userProfile, onUpdateProfile, onLogout }: PrivacySecurityProps) {
  // Privacy Settings
  const [privateProfile, setPrivateProfile] = useState(userProfile.privacySettings?.privateProfile || false);
  const [shareLocation, setShareLocation] = useState(userProfile.privacySettings?.shareLocationData !== false);
  
  // Change Password Dialog
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Delete Account Dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Sync privacy settings with userProfile
  useEffect(() => {
    setPrivateProfile(userProfile.privacySettings?.privateProfile || false);
    setShareLocation(userProfile.privacySettings?.shareLocationData !== false);
  }, [userProfile]);

  // Save privacy settings when they change
  const handlePrivacySettingChange = async (setting: 'privateProfile' | 'shareLocationData', value: boolean) => {
    const newSettings = {
      ...userProfile.privacySettings,
      [setting]: value,
    };

    // Update local state immediately
    if (setting === 'privateProfile') {
      setPrivateProfile(value);
    } else {
      setShareLocation(value);
    }

    // Save to backend
    onUpdateProfile({
      privacySettings: newSettings,
    });

    toast.success('Privacy settings updated');
  };

  // Change Password Handler
  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setPasswordLoading(true);
    try {
      const result = await apiClient.changePassword(currentPassword, newPassword);
      
      if (result.success) {
        toast.success('Password changed successfully!');
        setShowPasswordDialog(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(result.error || 'Failed to change password');
      }
    } catch (error) {
      console.error('Password change error:', error);
      toast.error('Failed to change password. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Download Data Handler
  const handleDownloadData = async () => {
    try {
      toast.info('Preparing your data export...');
      
      const result = await apiClient.exportUserData();
      
      if (result.success && result.data) {
        // Create a downloadable JSON file
        const dataStr = JSON.stringify(result.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        // Create download link
        const link = document.createElement('a');
        link.href = url;
        link.download = `adoras-data-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast.success('Data exported successfully!');
      } else {
        toast.error(result.error || 'Failed to export data');
      }
    } catch (error) {
      console.error('Data export error:', error);
      toast.error('Failed to export data. Please try again.');
    }
  };

  // Delete Account Handler
  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast.error('Please enter your password to confirm');
      return;
    }

    setDeleteLoading(true);
    try {
      const result = await apiClient.deleteAccount(deletePassword);
      
      if (result.success) {
        toast.success('Account deleted successfully');
        setShowDeleteDialog(false);
        
        // Sign out and redirect to welcome
        setTimeout(() => {
          onLogout();
        }, 1000);
      } else {
        toast.error(result.error || 'Failed to delete account');
      }
    } catch (error) {
      console.error('Account deletion error:', error);
      toast.error('Failed to delete account. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ fontFamily: 'Archivo' }}>
              <Shield className="w-5 h-5 text-primary" />
              Privacy & Security
            </DialogTitle>
            <DialogDescription style={{ fontFamily: 'Inter' }}>
              Control your privacy settings and account security
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Security */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2" style={{ fontFamily: 'Inter' }}>
                <Lock className="w-4 h-4" />
                SECURITY
              </h4>

              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => setShowPasswordDialog(true)}
              >
                <Lock className="w-4 h-4 mr-2" />
                Change Password
              </Button>
            </div>

            <Separator />

            {/* Privacy */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2" style={{ fontFamily: 'Inter' }}>
                <Eye className="w-4 h-4" />
                PRIVACY
              </h4>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium" style={{ fontFamily: 'Inter' }}>Private Profile</Label>
                  <p className="text-sm text-muted-foreground">Only invited people can see your memories</p>
                </div>
                <Switch 
                  checked={privateProfile} 
                  onCheckedChange={(checked) => handlePrivacySettingChange('privateProfile', checked)} 
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium" style={{ fontFamily: 'Inter' }}>Share Location Data</Label>
                  <p className="text-sm text-muted-foreground">Allow memories to include location information</p>
                </div>
                <Switch 
                  checked={shareLocation} 
                  onCheckedChange={(checked) => handlePrivacySettingChange('shareLocationData', checked)} 
                />
              </div>
            </div>

            <Separator />

            {/* Data & Privacy */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2" style={{ fontFamily: 'Inter' }}>
                <FileText className="w-4 h-4" />
                DATA & PRIVACY
              </h4>

              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={handleDownloadData}
              >
                <Download className="w-4 h-4 mr-2" />
                Download My Data
              </Button>

              <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground" style={{ fontFamily: 'Inter' }}>
                <p className="mb-2">
                  <strong>Your Privacy Matters:</strong> Adoras is committed to protecting your data.
                </p>
                <ul className="space-y-1 ml-4 list-disc">
                  <li>We never share your data with third parties</li>
                  <li>All memories are encrypted in transit and at rest</li>
                  <li>You have full control over your data</li>
                  <li>You can export or delete your data anytime</li>
                </ul>
              </div>
            </div>

            <Separator />

            {/* Danger Zone */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-destructive flex items-center gap-2" style={{ fontFamily: 'Inter' }}>
                <Trash2 className="w-4 h-4" />
                DANGER ZONE
              </h4>

              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium" style={{ fontFamily: 'Inter' }}>Delete Account</p>
                    <p className="text-xs text-muted-foreground" style={{ fontFamily: 'Inter' }}>
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                  </div>
                </div>

                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Account
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <AlertDialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Change Password
            </AlertDialogTitle>
            <AlertDialogDescription>
              Enter your current password and choose a new one.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                disabled={passwordLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                disabled={passwordLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                disabled={passwordLoading}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={passwordLoading}>Cancel</AlertDialogCancel>
            <Button 
              onClick={handleChangePassword}
              disabled={passwordLoading}
            >
              {passwordLoading ? 'Changing...' : 'Change Password'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Delete Account Permanently?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action <strong>cannot be undone</strong>. This will permanently delete your account and remove all your memories, photos, voice notes, and data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium" style={{ fontFamily: 'Inter' }}>What will be deleted:</p>
              <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc" style={{ fontFamily: 'Inter' }}>
                <li>Your profile and account information</li>
                <li>All memories (photos, voice notes, videos, documents)</li>
                <li>All connections with keepers/storytellers</li>
                <li>All conversation history</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label htmlFor="delete-password">Enter your password to confirm</Label>
              <Input
                id="delete-password"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Password"
                disabled={deleteLoading}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <Button 
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleteLoading}
            >
              {deleteLoading ? 'Deleting...' : 'Delete Account Forever'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
