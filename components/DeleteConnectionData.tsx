/**
 * Delete Connection Data Component
 * 
 * Allows Keeper to:
 * 1. Export all memories as JSON
 * 2. Delete all memories for a connection (with GitHub-style confirmation)
 * 
 * CRITICAL: This is a destructive operation that cannot be undone
 */

import { useState } from 'react';
import { AlertTriangle, Download, Trash2, X } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { apiClient } from '../utils/api/client';
import { toast } from 'sonner@2.0.3';

interface DeleteConnectionDataProps {
  connectionId: string;
  partnerName: string;
  memoriesCount: number;
  onDeleted?: () => void;
}

export function DeleteConnectionData({
  connectionId,
  partnerName,
  memoriesCount,
  onDeleted,
}: DeleteConnectionDataProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);

  // Download memories as JSON
  const handleExport = async () => {
    setIsExporting(true);
    try {
      console.log(`📦 Exporting memories for connection: ${connectionId}`);
      
      const result = await apiClient.exportConnectionMemories(connectionId);
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to export memories');
      }

      // Convert data to JSON string
      const jsonString = JSON.stringify(result.data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `adoras-memories-${partnerName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Exported ${result.memoriesCount || 0} memories`, {
        description: 'Your data has been downloaded successfully',
      });
      
      console.log(`✅ Exported ${result.memoriesCount || 0} memories`);
    } catch (error) {
      console.error('❌ Export error:', error);
      toast.error('Failed to export memories', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Delete all memories (with confirmation)
  const handleDelete = async () => {
    if (confirmationInput.trim().toLowerCase() !== partnerName.trim().toLowerCase()) {
      toast.error('Confirmation does not match', {
        description: `Please type "${partnerName}" exactly to confirm`,
      });
      return;
    }

    setIsDeleting(true);
    setDeleteProgress(0);

    try {
      console.log(`🗑️ Deleting all memories for connection: ${connectionId}`);
      
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setDeleteProgress(prev => Math.min(prev + 10, 90));
      }, 200);
      
      const result = await apiClient.deleteAllConnectionMemories(
        connectionId,
        confirmationInput
      );
      
      clearInterval(progressInterval);
      setDeleteProgress(100);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete memories');
      }

      console.log(`✅ Deleted ${result.deletedCount || 0} memories and ${result.mediaFilesDeleted || 0} media files`);
      
      toast.success('All memories deleted', {
        description: `Deleted ${result.deletedCount || 0} memories and ${result.mediaFilesDeleted || 0} media files`,
      });
      
      // Close dialog and notify parent
      setIsDialogOpen(false);
      setConfirmationInput('');
      
      // Wait a bit for toast to show
      setTimeout(() => {
        if (onDeleted) {
          onDeleted();
        }
      }, 1000);
      
    } catch (error) {
      console.error('❌ Delete error:', error);
      toast.error('Failed to delete memories', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      setDeleteProgress(0);
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
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        {isExporting ? 'Exporting...' : 'Export Data'}
      </Button>

      {/* Delete Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsDialogOpen(true)}
        disabled={memoriesCount === 0}
        className="h-9 gap-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 w-full sm:w-auto sm:flex-1 shrink-0"
      >
        <Trash2 className="w-3.5 h-3.5 shrink-0" />
        Delete All
      </Button>

      {/* Confirmation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Delete All Memories
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-2">
              <p>
                This will permanently delete <strong>{memoriesCount} {memoriesCount === 1 ? 'memory' : 'memories'}</strong> from your connection with <strong>{partnerName}</strong>.
              </p>
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>This action cannot be undone.</strong> All photos, videos, voice notes, and text memories will be permanently deleted from both you and {partnerName}'s accounts.
                </AlertDescription>
              </Alert>
              <p className="text-sm">
                We recommend exporting your data first using the "Export Data" button.
              </p>
            </DialogDescription>
          </DialogHeader>

          {/* Confirmation Input */}
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="confirmation" className="text-sm font-medium">
                Please type <strong>{partnerName}</strong> to confirm:
              </Label>
              <Input
                id="confirmation"
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                placeholder={partnerName}
                disabled={isDeleting}
                className={confirmationMatches ? 'border-green-500' : ''}
                autoComplete="off"
              />
            </div>

            {isDeleting && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Deleting...</span>
                  <span>{deleteProgress}%</span>
                </div>
                <Progress value={deleteProgress} className="h-2" />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setConfirmationInput('');
              }}
              disabled={isDeleting}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!confirmationMatches || isDeleting}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {isDeleting ? 'Deleting...' : 'Delete All Memories'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
