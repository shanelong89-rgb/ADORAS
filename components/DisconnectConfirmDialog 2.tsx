/**
 * DisconnectConfirmDialog Component
 * Confirms disconnection from a connection with option to delete memories
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { UserX, Trash2, AlertTriangle, Loader2 } from 'lucide-react';

interface DisconnectConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (deleteMemories: boolean) => Promise<void>;
  partnerName: string;
  memoriesCount?: number;
  isLoading?: boolean;
}

export function DisconnectConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  partnerName,
  memoriesCount = 0,
  isLoading = false,
}: DisconnectConfirmDialogProps) {
  const [deleteMemories, setDeleteMemories] = useState(false);

  const handleClose = () => {
    if (!isLoading) {
      setDeleteMemories(false);
      onClose();
    }
  };

  const handleConfirm = async () => {
    await onConfirm(deleteMemories);
    setDeleteMemories(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-full bg-destructive/10">
              <UserX className="w-6 h-6 text-destructive" />
            </div>
            <DialogTitle style={{ fontFamily: 'Archivo', letterSpacing: '-0.05em' }}>
              Disconnect from {partnerName}?
            </DialogTitle>
          </div>
          <DialogDescription style={{ fontFamily: 'Inter' }}>
            This will end your connection with {partnerName}. You will no longer be able to share memories together.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning Alert */}
          <Alert variant="destructive" className="bg-destructive/10 border-destructive/20">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription style={{ fontFamily: 'Inter' }}>
              <strong>This action cannot be undone.</strong> {partnerName} will also lose access to this connection.
            </AlertDescription>
          </Alert>

          {/* Delete Memories Option */}
          {memoriesCount > 0 && (
            <div className="space-y-3 p-4 rounded-lg border bg-card">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="delete-memories"
                  checked={deleteMemories}
                  onCheckedChange={(checked) => setDeleteMemories(checked === true)}
                  disabled={isLoading}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <Label
                    htmlFor="delete-memories"
                    className="cursor-pointer font-semibold flex items-center gap-2"
                    style={{ fontFamily: 'Archivo' }}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                    Delete all shared memories
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1" style={{ fontFamily: 'Inter' }}>
                    Permanently delete all {memoriesCount} {memoriesCount === 1 ? 'memory' : 'memories'} shared with {partnerName}. 
                    This includes photos, videos, voice notes, and messages.
                  </p>
                </div>
              </div>

              {deleteMemories && (
                <Alert className="bg-destructive/5 border-destructive/20 mt-3">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <AlertDescription className="text-sm" style={{ fontFamily: 'Inter' }}>
                    <strong className="text-destructive">Warning:</strong> Deleting {memoriesCount} {memoriesCount === 1 ? 'memory' : 'memories'} is permanent and cannot be recovered.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* What Happens */}
          <div className="space-y-2 text-sm text-muted-foreground" style={{ fontFamily: 'Inter' }}>
            <p className="font-semibold text-foreground">What happens when you disconnect:</p>
            <ul className="space-y-1 ml-5 list-disc">
              <li>Connection will be removed from both your accounts</li>
              <li>{partnerName} can no longer see or add to your shared memories</li>
              {!deleteMemories && memoriesCount > 0 && (
                <li className="text-foreground">Your {memoriesCount} shared {memoriesCount === 1 ? 'memory' : 'memories'} will be preserved but inaccessible</li>
              )}
              {deleteMemories && memoriesCount > 0 && (
                <li className="text-destructive font-semibold">All {memoriesCount} shared {memoriesCount === 1 ? 'memory' : 'memories'} will be permanently deleted</li>
              )}
              <li>You can send a new connection request in the future if you change your mind</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Disconnecting...
              </>
            ) : (
              <>
                <UserX className="w-4 h-4 mr-2" />
                {deleteMemories ? 'Disconnect & Delete' : 'Disconnect'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
