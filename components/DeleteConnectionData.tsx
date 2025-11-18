/**
 * DeleteConnectionData Component
 * Secure deletion of all memories between users with export functionality
 * Requires typing partner's name to confirm
 * Includes ZIP export with all media files
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { Trash2, Download, AlertTriangle, Loader2, FileArchive, Image, Video, Mic } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../utils/api/client';
import JSZip from 'jszip';

interface DeleteConnectionDataProps {
  connectionId: string;
  partnerName: string;
  memoriesCount: number;
  onDeleted: () => void;
}

interface ExportProgress {
  phase: 'loading' | 'downloading' | 'creating' | 'complete';
  current: number;
  total: number;
  fileName?: string;
  fileType?: 'photo' | 'video' | 'audio';
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
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [showProgressDialog, setShowProgressDialog] = useState(false);

  const downloadMediaFile = async (url: string, fileName: string, retries = 2): Promise<Blob | null> => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          cache: 'no-cache', // Don't use cached expired URLs
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return await response.blob();
      } catch (error) {
        console.error(`Failed to download ${fileName} (attempt ${attempt + 1}/${retries + 1}):`, error);
        if (attempt === retries) {
          return null; // Failed after all retries
        }
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
    return null;
  };

  const getFileExtension = (url: string): string => {
    if (!url) return '';
    const match = url.match(/\.([a-zA-Z0-9]+)(\?|$)/);
    return match ? match[1] : '';
  };

  const handleExport = async () => {
    setIsExporting(true);
    setShowProgressDialog(true);
    setExportProgress({ phase: 'loading', current: 0, total: 0 });

    try {
      // Phase 1: Load memory data from backend
      const response = await apiClient.exportConnectionData(connectionId);
      
      if (!response.success || !response.data) {
        toast.error(response.error || 'Failed to export data');
        return;
      }

      const { connection, memories, exportedAt } = response.data;

      // Create ZIP file
      const zip = new JSZip();

      // Prepare clean memory data for JSON (without URLs, we'll reference local files)
      const memoryMetadata = memories.map((memory: any) => ({
        id: memory.id,
        type: memory.type,
        content: memory.content,
        sender: memory.sender,
        category: memory.category,
        tags: memory.tags,
        location: memory.location,
        estimatedDate: memory.estimatedDate,
        notes: memory.notes,
        promptQuestion: memory.promptQuestion,
        timestamp: memory.timestamp,
        createdAt: memory.createdAt,
        updatedAt: memory.updatedAt,
        // Reference local files in ZIP
        files: {
          photo: memory.photoUrl ? `media/photos/${memory.id}.${getFileExtension(memory.photoUrl)}` : null,
          video: memory.videoUrl ? `media/videos/${memory.id}.${getFileExtension(memory.videoUrl)}` : null,
          videoThumbnail: memory.videoThumbnail ? `media/videos/${memory.id}_thumb.${getFileExtension(memory.videoThumbnail)}` : null,
          audio: memory.audioUrl ? `media/audio/${memory.id}.${getFileExtension(memory.audioUrl)}` : null,
          document: memory.documentUrl ? `media/documents/${memory.id}.${getFileExtension(memory.documentUrl)}` : null,
        },
        // Also include original URLs as backup
        originalUrls: {
          photoUrl: memory.photoUrl,
          videoUrl: memory.videoUrl,
          videoThumbnail: memory.videoThumbnail,
          audioUrl: memory.audioUrl,
          documentUrl: memory.documentUrl,
        }
      }));

      // Add metadata JSON
      const exportData = {
        exportedAt,
        connection: {
          keeperName: connection.keeperName,
          tellerName: connection.tellerName,
          relationship: connection.relationship,
          createdAt: connection.createdAt,
        },
        totalMemories: memories.length,
        memories: memoryMetadata,
      };

      zip.file('memories.json', JSON.stringify(exportData, null, 2));
      zip.file('README.txt', 
`ADORAS Memory Export
====================
Exported: ${new Date(exportedAt).toLocaleString()}
Connection: ${connection.keeperName} ↔️ ${connection.tellerName}
Relationship: ${connection.relationship || 'Not specified'}
Total Memories: ${memories.length}

Structure:
- memories.json: All memory metadata and text content
- media/photos/: Photo attachments
- media/videos/: Video attachments (with thumbnails)
- media/audio/: Audio recordings
- media/documents/: Document attachments

Note: Each memory ID corresponds to its media files.
Example: Memory "abc123" → media/photos/abc123.jpg
`);

      // Count media files
      let totalMediaFiles = 0;
      const mediaFiles: Array<{ url: string; path: string; type: 'photo' | 'video' | 'audio' }> = [];

      memories.forEach((memory: any) => {
        if (memory.photoUrl) {
          mediaFiles.push({
            url: memory.photoUrl,
            path: `media/photos/${memory.id}.${getFileExtension(memory.photoUrl)}`,
            type: 'photo'
          });
          totalMediaFiles++;
        }
        if (memory.videoUrl) {
          mediaFiles.push({
            url: memory.videoUrl,
            path: `media/videos/${memory.id}.${getFileExtension(memory.videoUrl)}`,
            type: 'video'
          });
          totalMediaFiles++;
        }
        if (memory.videoThumbnail) {
          mediaFiles.push({
            url: memory.videoThumbnail,
            path: `media/videos/${memory.id}_thumb.${getFileExtension(memory.videoThumbnail)}`,
            type: 'video'
          });
          totalMediaFiles++;
        }
        if (memory.audioUrl) {
          mediaFiles.push({
            url: memory.audioUrl,
            path: `media/audio/${memory.id}.${getFileExtension(memory.audioUrl)}`,
            type: 'audio'
          });
          totalMediaFiles++;
        }
        if (memory.documentUrl) {
          mediaFiles.push({
            url: memory.documentUrl,
            path: `media/documents/${memory.id}.${getFileExtension(memory.documentUrl)}`,
            type: 'audio'
          });
          totalMediaFiles++;
        }
      });

      // Phase 2: Download media files
      setExportProgress({ phase: 'downloading', current: 0, total: totalMediaFiles });

      let downloaded = 0;
      let successful = 0;
      let failed = 0;
      const CONCURRENT_DOWNLOADS = 5; // Download 5 files at a time

      for (let i = 0; i < mediaFiles.length; i += CONCURRENT_DOWNLOADS) {
        const batch = mediaFiles.slice(i, i + CONCURRENT_DOWNLOADS);
        
        await Promise.all(
          batch.map(async (file) => {
            const blob = await downloadMediaFile(file.url, file.path);
            if (blob) {
              zip.file(file.path, blob);
              successful++;
            } else {
              failed++;
            }
            downloaded++;
            setExportProgress({ 
              phase: 'downloading', 
              current: downloaded, 
              total: totalMediaFiles,
              fileName: file.path.split('/').pop(),
              fileType: file.type
            });
          })
        );
      }

      console.log(`📦 Download complete: ${successful} successful, ${failed} failed out of ${totalMediaFiles} total`);

      // Phase 3: Create ZIP
      setExportProgress({ phase: 'creating', current: 0, total: 100 });
      
      const zipBlob = await zip.generateAsync(
        { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
        (metadata) => {
          setExportProgress({ 
            phase: 'creating', 
            current: Math.round(metadata.percent), 
            total: 100 
          });
        }
      );

      // Phase 4: Download
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `adoras-${partnerName.toLowerCase().replace(/\s+/g, '-')}-memories-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportProgress({ phase: 'complete', current: 100, total: 100 });
      
      setTimeout(() => {
        setShowProgressDialog(false);
        if (failed > 0) {
          toast.warning(`Exported ${memories.length} memories. ${successful} of ${totalMediaFiles} media files downloaded successfully (${failed} failed).`);
        } else {
          toast.success(`Exported ${memories.length} memories with all ${successful} media files!`);
        }
      }, 1500);

    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to create export. Please try again.');
      setShowProgressDialog(false);
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
        <FileArchive className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">{isExporting ? 'Exporting...' : 'Export ZIP'}</span>
      </Button>

      {/* Export Progress Dialog */}
      <Dialog open={showProgressDialog} onOpenChange={setShowProgressDialog}>
        <DialogContent 
          className="max-w-[min(calc(100vw-2rem),400px)] p-4 sm:p-6"
          style={{ overflowX: 'hidden', width: '100%' }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg" style={{ fontFamily: 'Archivo' }}>
              <FileArchive className="w-5 h-5 text-blue-600 shrink-0" />
              <span className="truncate">Exporting Memories</span>
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm" style={{ fontFamily: 'Inter' }}>
              {exportProgress?.phase === 'loading' && 'Loading memory data...'}
              {exportProgress?.phase === 'downloading' && 'Downloading media files...'}
              {exportProgress?.phase === 'creating' && 'Creating ZIP archive...'}
              {exportProgress?.phase === 'complete' && '✅ Export complete!'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs sm:text-sm" style={{ fontFamily: 'Inter' }}>
                <span className="text-gray-600">
                  {exportProgress?.phase === 'downloading' && (
                    <>
                      {exportProgress.fileType === 'photo' && <Image className="w-3.5 h-3.5 inline mr-1" />}
                      {exportProgress.fileType === 'video' && <Video className="w-3.5 h-3.5 inline mr-1" />}
                      {exportProgress.fileType === 'audio' && <Mic className="w-3.5 h-3.5 inline mr-1" />}
                      {exportProgress.fileName}
                    </>
                  )}
                  {exportProgress?.phase === 'creating' && 'Compressing files...'}
                  {exportProgress?.phase === 'complete' && 'Download started!'}
                </span>
                <span className="font-medium">
                  {exportProgress?.current || 0}/{exportProgress?.total || 0}
                </span>
              </div>
              <Progress 
                value={exportProgress ? (exportProgress.current / exportProgress.total) * 100 : 0} 
                className="h-2"
              />
            </div>

            {/* Info */}
            {exportProgress?.phase === 'downloading' && exportProgress.total > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-900" style={{ fontFamily: 'Inter' }}>
                  📦 Downloading {exportProgress.total} media files. This may take a few minutes...
                </p>
              </div>
            )}

            {exportProgress?.phase === 'complete' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs text-green-900" style={{ fontFamily: 'Inter' }}>
                  ✅ ZIP file has been downloaded to your device's Downloads folder!
                </p>
              </div>
            )}
          </div>

          {exportProgress?.phase === 'complete' && (
            <DialogFooter>
              <Button
                onClick={() => setShowProgressDialog(false)}
                className="w-full text-xs sm:text-sm h-9"
              >
                Done
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

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
