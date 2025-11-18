/**
 * DeleteConnectionData Component
 * Secure deletion of all memories between users with export functionality
 * Requires typing partner's name to confirm
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Trash2, Download, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../utils/api/client';

interface DeleteConnectionDataProps {
  connectionId: string;
  partnerName: string;
  memoriesCount: number;
  onDeleted: () => void;
}

export function DeleteConnectionData({
  connectionId,
  partnerName,
  memoriesCount,
  onDeleted
}: DeleteConnectionDataProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await apiClient.exportConnectionData(connectionId);
      
      if (response.success && response.memories) {
        // Create JSON export
        const exportData = {
          exportDate: new Date().toISOString(),
          partnerName,
          memoriesCount: response.memories.length,
          memories: response.memories.map((memory: any) => ({
            id: memory.id,
            content: memory.content,
            media: memory.media,
            createdAt: memory.createdAt,
            createdBy: memory.createdBy,
            tags: memory.tags,
          }))
        };

        // Download as JSON
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `adoras-${partnerName.toLowerCase().replace(/\s+/g, '-')}-memories-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success('Data exported successfully');
      } else {
        toast.error(response.error || 'Failed to export data');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Network error during export');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmationMatches) {
      toast.error(`Please type "${partnerName}" to confirm`);
      return;
    }

    setIsDeleting(true);
    try {
      const response = await apiClient.deleteConnectionData(connectionId);
      
      if (response.success) {
        toast.success(`All memories with ${partnerName} have been deleted`);
        setIsDialogOpen(false);
        setConfirmationInput('');
        onDeleted();
      } else {
        toast.error(response.error || 'Failed to delete data');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Network error during deletion');
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmationMatches = confirmationInput.trim().toLowerCase() === partnerName.trim().toLowerCase();

  return (
    <>
      {/* Export Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        disabled={isExporting || memoriesCount === 0}
        className="h-9 gap-1.5 text-xs w-full sm:w-auto sm:flex-1 shrink-0"
        style={{ display: 'flex', minWidth: '0' }}
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">{isExporting ? 'Exporting...' : 'Export Data'}</span>
      </Button>

      {/* Delete Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsDialogOpen(true)}
        disabled={memoriesCount === 0}
        className="h-9 gap-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 w-full sm:w-auto sm:flex-1 shrink-0"
        style={{ display: 'flex', minWidth: '0' }}
      >
        <Trash2 className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">Delete All</span>
      </Button>

      {/* Confirmation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent 
          className="max-w-[min(calc(100vw-2rem),500px)] p-4 sm:p-6"
          style={{ overflowX: 'hidden', width: '100%' }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg" style={{ fontFamily: 'Archivo' }}>
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              <span className="truncate">Delete All Memories?</span>
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm" style={{ fontFamily: 'Inter' }}>
              This action cannot be undone. All memories with {partnerName} will be permanently deleted.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4" style={{ overflowX: 'hidden' }}>
            <Alert variant="destructive" className="border-red-200 bg-red-50/50">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <AlertDescription className="text-xs sm:text-sm" style={{ fontFamily: 'Inter' }}>
                <strong className="block mb-1">Warning:</strong>
                You are about to delete <strong>{memoriesCount} {memoriesCount === 1 ? 'memory' : 'memories'}</strong> between you and {partnerName}. 
                This will remove all photos, videos, audio recordings, and text from both users' accounts.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="confirmation" className="text-xs sm:text-sm" style={{ fontFamily: 'Inter' }}>
                Type <strong>{partnerName}</strong> to confirm:
              </Label>
              <Input
                id="confirmation"
                type="text"
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                placeholder={`Type "${partnerName}"`}
                disabled={isDeleting}
                className="text-sm"
                style={{ fontFamily: 'Inter' }}
              />
              {confirmationInput && !confirmationMatches && (
                <p className="text-xs text-red-600" style={{ fontFamily: 'Inter' }}>
                  Name doesn't match. Please type exactly: {partnerName}
                </p>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-900" style={{ fontFamily: 'Inter' }}>
                <strong>💡 Tip:</strong> Export your data first if you want to keep a backup.
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setConfirmationInput('');
              }}
              disabled={isDeleting}
              className="w-full sm:w-auto text-xs sm:text-sm h-9"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!confirmationMatches || isDeleting}
              className="w-full sm:w-auto gap-2 text-xs sm:text-sm h-9"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 shrink-0" />
                  Delete All Memories
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
