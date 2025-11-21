import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Database, HardDrive, Image, Video, Mic, FileText, Cloud, Download, Trash2, Settings, AlertTriangle, Loader2 } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { apiClient } from '../utils/api/client';
import JSZip from 'jszip';

interface StorageDataProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

interface StorageStats {
  totalSize: number;
  photoSize: number;
  videoSize: number;
  audioSize: number;
  documentSize: number;
  storageLimit: number;
  usagePercentage: number;
}

export function StorageData({ isOpen, onClose, userId }: StorageDataProps) {
  const [autoBackup, setAutoBackup] = useState(true);
  const [wifiOnly, setWifiOnly] = useState(true);
  const [compressPhotos, setCompressPhotos] = useState(false);
  const [compressVideos, setCompressVideos] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ phase: 'loading', current: 0, total: 0, fileName: '' });
  const [storageStats, setStorageStats] = useState<StorageStats>({
    totalSize: 0,
    photoSize: 0,
    videoSize: 0,
    audioSize: 0,
    documentSize: 0,
    storageLimit: 2,
    usagePercentage: 0,
  });

  useEffect(() => {
    if (isOpen) {
      fetchStorageStats();
    }
  }, [isOpen]);

  const fetchStorageStats = async () => {
    const accessToken = apiClient.getAccessToken();
    
    if (!accessToken) {
      console.error('❌ Storage stats fetch failed: No access token');
      toast.error('Please sign in to view storage stats');
      return;
    }

    try {
      setLoading(true);
      console.log('📊 Fetching storage stats...');
      console.log('🔑 Access token present:', !!accessToken);
      console.log('🔑 Token length:', accessToken.length);
      console.log('🔑 Token preview:', accessToken.substring(0, 20) + '...');
      
      // Test if the token works with a known-good endpoint first
      console.log('🧪 Testing token with /auth/me endpoint first...');
      try {
        const testResponse = await apiClient.getCurrentUser();
        console.log('✅ Token test passed - /auth/me worked:', testResponse.success);
      } catch (testError) {
        console.error('❌ Token test FAILED - /auth/me did not work:', testError);
        toast.error('Your session may have expired. Please sign out and back in.');
        setLoading(false);
        return;
      }
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-deded1eb/storage/stats`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('📊 Storage stats response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Storage stats fetch failed:', response.status, errorText);
        
        if (response.status === 401) {
          toast.error('Authentication failed. Please try signing out and back in.');
        } else {
          toast.error(`Failed to load storage stats: ${response.status}`);
        }
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log('📊 Storage stats data:', data);

      if (data.success) {
        setStorageStats({
          totalSize: data.totalSize || 0,
          photoSize: data.photoSize || 0,
          videoSize: data.videoSize || 0,
          audioSize: data.audioSize || 0,
          documentSize: data.documentSize || 0,
          storageLimit: data.storageLimit || 2,
          usagePercentage: data.usagePercentage || 0,
        });
        console.log('✅ Storage stats loaded successfully');
      } else {
        console.error('❌ Storage stats response error:', data.error);
        toast.error(data.error || 'Failed to load storage stats');
      }
    } catch (error) {
      console.error('❌ Error fetching storage stats:', error);
      toast.error('Failed to load storage stats. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (gb: number) => {
    if (gb < 0.01) {
      return `${(gb * 1024).toFixed(1)} MB`;
    }
    return `${gb.toFixed(2)} GB`;
  };

  // Helper to get file extension from URL
  const getFileExtension = (url: string): string => {
    const match = url.match(/\\.([a-z0-9]+)(?:[?#]|$)/i);
    return match ? match[1] : 'bin';
  };

  // Helper to download a media file
  const downloadMediaFile = async (url: string, path: string): Promise<Blob | null> => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`❌ Failed to download ${path}: ${response.status}`);
        return null;
      }
      return await response.blob();
    } catch (error) {
      console.error(`❌ Error downloading ${path}:`, error);
      return null;
    }
  };

  // Export all user data as ZIP
  const handleExportAllData = async () => {
    setIsExporting(true);
    setExportProgress({ phase: 'loading', current: 0, total: 100, fileName: '' });

    try {
      // Phase 1: Load all user data from backend
      console.log('🔄 Starting full user data export...');
      toast.info('Preparing your data export...');
      
      const response = await apiClient.exportUserData();
      console.log('📥 Export response:', response);
      
      if (!response.success || !response.data) {
        console.error('❌ Export failed:', response.error || 'No data returned');
        toast.error(response.error || 'Failed to export data');
        setIsExporting(false);
        return;
      }

      const { user, connections, memories, exportedAt } = response.data;

      // Create ZIP file
      const zip = new JSZip();

      // Prepare clean memory data for JSON
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
        connectionId: memory.connectionId,
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
        user: {
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
        },
        connections: connections.map((conn: any) => ({
          keeperName: conn.keeperName,
          tellerName: conn.tellerName,
          relationship: conn.relationship,
          createdAt: conn.createdAt,
        })),
        totalMemories: memories.length,
        memories: memoryMetadata,
      };

      zip.file('data.json', JSON.stringify(exportData, null, 2));
      zip.file('README.txt', 
`ADORAS Complete Data Export
============================
Exported: ${new Date(exportedAt).toLocaleString()}
User: ${user.name} (${user.email})
Role: ${user.role}
Total Connections: ${connections.length}
Total Memories: ${memories.length}

Structure:
- data.json: All user data, connections, and memory metadata
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

      console.log(`📦 Exporting ${memories.length} memories with ${totalMediaFiles} media files`);

      // Phase 2: Download media files
      setExportProgress({ phase: 'downloading', current: 0, total: totalMediaFiles, fileName: '' });
      toast.info(`Downloading ${totalMediaFiles} media files...`);

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
              fileName: file.path.split('/').pop() || ''
            });
          })
        );
      }

      console.log(`📦 Download complete: ${successful} successful, ${failed} failed out of ${totalMediaFiles} total`);

      // Phase 3: Create ZIP
      setExportProgress({ phase: 'creating', current: 0, total: 100, fileName: '' });
      toast.info('Creating ZIP file...');
      
      const zipBlob = await zip.generateAsync(
        { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
        (metadata) => {
          setExportProgress({ 
            phase: 'creating', 
            current: Math.round(metadata.percent), 
            total: 100,
            fileName: ''
          });
        }
      );

      // Phase 4: Download
      const filename = `adoras-complete-export-${new Date().toISOString().split('T')[0]}.zip`;
      console.log(`💾 Creating download: ${filename} (${(zipBlob.size / 1024 / 1024).toFixed(2)} MB)`);
      
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log(`✅ Download triggered: ${filename}`);
      setExportProgress({ phase: 'complete', current: 100, total: 100, fileName: '' });
      
      const sizeInfo = `(${(zipBlob.size / 1024 / 1024).toFixed(2)} MB)`;
      if (failed > 0) {
        toast.success(`Export complete ${sizeInfo}! Note: ${failed} media file(s) couldn't be downloaded.`);
      } else {
        toast.success(`Export complete ${sizeInfo}! All ${successful} media files included.`);
      }

      setTimeout(() => {
        setIsExporting(false);
      }, 1500);

    } catch (error) {
      console.error('❌ Export error:', error);
      toast.error(error instanceof Error ? error.message : 'Export failed');
      setIsExporting(false);
    }
  };

  const storageByType = [
    { type: 'Photos', icon: Image, size: storageStats.photoSize, color: 'text-blue-500' },
    { type: 'Videos', icon: Video, size: storageStats.videoSize, color: 'text-purple-500' },
    { type: 'Voice Notes', icon: Mic, size: storageStats.audioSize, color: 'text-green-500' },
    { type: 'Documents', icon: FileText, size: storageStats.documentSize, color: 'text-orange-500' },
  ];

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[550px] max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
              <DialogTitle className="flex items-center gap-2" style={{ fontFamily: 'Archivo' }}>
                <Database className="w-5 h-5 text-primary" />
                Storage & Data
              </DialogTitle>
              <Badge variant="outline" className="bg-primary/10 border-primary/30 text-primary font-medium">
                Free Tier
              </Badge>
            </div>
            <DialogDescription style={{ fontFamily: 'Inter' }}>
              Manage your storage usage and backup settings • {storageStats.storageLimit}GB limit
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}

            {!loading && (
              <>
                {/* Storage Overview */}
                <Card className={`bg-muted/50 ${storageStats.usagePercentage > 90 ? 'border-destructive border-2' : ''}`}>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <HardDrive className="w-5 h-5 text-primary" />
                          <div>
                            <p className="text-sm font-medium" style={{ fontFamily: 'Inter' }}>Storage Used</p>
                            <p className="text-xs text-muted-foreground">
                              {formatSize(storageStats.totalSize)} of {storageStats.storageLimit} GB
                            </p>
                          </div>
                        </div>
                        <Badge 
                          variant={storageStats.usagePercentage > 90 ? 'destructive' : 'secondary'}
                          className="flex items-center gap-1"
                        >
                          {storageStats.usagePercentage > 90 && <AlertTriangle className="w-3 h-3" />}
                          {Math.round(storageStats.usagePercentage)}%
                        </Badge>
                      </div>
                      <Progress 
                        value={Math.min(storageStats.usagePercentage, 100)} 
                        className={`h-2 ${storageStats.usagePercentage > 90 ? 'bg-destructive/20' : ''}`}
                      />
                      {storageStats.usagePercentage > 90 && (
                        <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                          <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                          <div className="text-xs">
                            <p className="font-medium text-destructive mb-1">Storage Almost Full</p>
                            <p className="text-muted-foreground">
                              You're using {Math.round(storageStats.usagePercentage)}% of your {storageStats.storageLimit}GB free storage. 
                              Consider deleting old memories or upgrade to a premium plan for more storage.
                            </p>
                          </div>
                        </div>
                      )}
                      {storageStats.usagePercentage > 70 && storageStats.usagePercentage <= 90 && (
                        <div className="text-xs text-muted-foreground">
                          <p>💡 Tip: Enable compression to save storage space</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Storage Breakdown */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm text-muted-foreground" style={{ fontFamily: 'Inter' }}>
                      STORAGE BREAKDOWN
                    </h4>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={fetchStorageStats}
                      className="h-7 text-xs"
                    >
                      Refresh
                    </Button>
                  </div>
                  {storageByType.map((item) => (
                    <div key={item.type} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <item.icon className={`w-4 h-4 ${item.color}`} />
                        <span className="text-sm" style={{ fontFamily: 'Inter' }}>{item.type}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">{formatSize(item.size)}</Badge>
                    </div>
                  ))}
                </div>
              </>
            )}

            <Separator />

            {/* Backup Settings */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2" style={{ fontFamily: 'Inter' }}>
                <Cloud className="w-4 h-4" />
                BACKUP SETTINGS
              </h4>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium" style={{ fontFamily: 'Inter' }}>Auto Backup</Label>
                  <p className="text-sm text-muted-foreground">Automatically backup to cloud</p>
                </div>
                <Switch checked={autoBackup} onCheckedChange={setAutoBackup} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium" style={{ fontFamily: 'Inter' }}>Backup on Wi-Fi Only</Label>
                  <p className="text-sm text-muted-foreground">Save mobile data usage</p>
                </div>
                <Switch checked={wifiOnly} onCheckedChange={setWifiOnly} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium" style={{ fontFamily: 'Inter' }}>Last Backup</Label>
                  <p className="text-sm text-muted-foreground">2 hours ago</p>
                </div>
                <Button variant="outline" size="sm">
                  Backup Now
                </Button>
              </div>
            </div>

            <Separator />

            {/* Data Optimization */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2" style={{ fontFamily: 'Inter' }}>
                <Settings className="w-4 h-4" />
                DATA OPTIMIZATION
              </h4>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium" style={{ fontFamily: 'Inter' }}>Compress Photos</Label>
                  <p className="text-sm text-muted-foreground">Reduce photo file sizes</p>
                </div>
                <Switch checked={compressPhotos} onCheckedChange={setCompressPhotos} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium" style={{ fontFamily: 'Inter' }}>Compress Videos</Label>
                  <p className="text-sm text-muted-foreground">Reduce video file sizes</p>
                </div>
                <Switch checked={compressVideos} onCheckedChange={setCompressVideos} />
              </div>
            </div>

            <Separator />

            {/* Storage Actions */}
            <div className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={handleExportAllData}
              >
                <Download className="w-4 h-4 mr-2" />
                Download All Data
              </Button>

              <Button 
                variant="outline" 
                className="w-full justify-start text-muted-foreground"
                onClick={() => {
                  if ('caches' in window) {
                    caches.keys().then((names) => {
                      names.forEach(name => caches.delete(name));
                    });
                    toast.success('App cache cleared successfully');
                    fetchStorageStats();
                  } else {
                    toast.info('Cache clearing not available');
                  }
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear App Cache
              </Button>
            </div>

            {/* Upgrade Prompt */}
            {!loading && storageStats.usagePercentage > 80 && (
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Cloud className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium mb-1" style={{ fontFamily: 'Archivo' }}>
                          Need More Space?
                        </h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          Upgrade to Premium for unlimited storage and exclusive features.
                        </p>
                        <Button 
                          size="sm" 
                          className="bg-primary hover:bg-primary/90"
                          onClick={() => toast.info('Premium plans coming soon!')}
                        >
                          Upgrade to Premium
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={onClose} className="bg-primary">
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Export Progress Dialog */}
      <Dialog open={isExporting} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-[450px]" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {exportProgress.phase === 'complete' ? (
                <>
                  <Download className="w-5 h-5 text-green-500" />
                  Export Complete
                </>
              ) : (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  Exporting Your Data
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {exportProgress.phase === 'loading' && 'Loading your data...'}
              {exportProgress.phase === 'downloading' && `Downloading media files (${exportProgress.current}/${exportProgress.total})...`}
              {exportProgress.phase === 'creating' && 'Creating ZIP file...'}
              {exportProgress.phase === 'complete' && 'Your data has been downloaded successfully!'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>
                  {exportProgress.phase === 'loading' && 'Preparing...'}
                  {exportProgress.phase === 'downloading' && 'Downloading media'}
                  {exportProgress.phase === 'creating' && 'Creating ZIP'}
                  {exportProgress.phase === 'complete' && 'Complete!'}
                </span>
                <span className="text-muted-foreground">
                  {exportProgress.phase === 'complete' ? '100%' : 
                   exportProgress.total > 0 ? 
                     `${Math.round((exportProgress.current / exportProgress.total) * 100)}%` : 
                     '0%'}
                </span>
              </div>
              <Progress 
                value={exportProgress.total > 0 ? (exportProgress.current / exportProgress.total) * 100 : 0} 
                className="h-2"
              />
              {exportProgress.fileName && (
                <p className="text-xs text-muted-foreground truncate">
                  {exportProgress.fileName}
                </p>
              )}
            </div>

            {/* Phase Icons */}
            <div className="flex justify-around py-4">
              <div className={`flex flex-col items-center gap-2 ${exportProgress.phase === 'loading' ? 'text-primary' : exportProgress.phase !== 'loading' ? 'text-green-500' : 'text-muted-foreground'}`}>
                <Database className="w-6 h-6" />
                <span className="text-xs">Load Data</span>
              </div>
              <div className={`flex flex-col items-center gap-2 ${exportProgress.phase === 'downloading' ? 'text-primary' : (exportProgress.phase === 'creating' || exportProgress.phase === 'complete') ? 'text-green-500' : 'text-muted-foreground'}`}>
                <Download className="w-6 h-6" />
                <span className="text-xs">Download</span>
              </div>
              <div className={`flex flex-col items-center gap-2 ${exportProgress.phase === 'creating' ? 'text-primary' : exportProgress.phase === 'complete' ? 'text-green-500' : 'text-muted-foreground'}`}>
                <Download className="w-6 h-6" />
                <span className="text-xs">Package</span>
              </div>
            </div>

            {exportProgress.phase !== 'complete' && (
              <div className="text-sm text-muted-foreground text-center">
                Please don't close this window...
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
