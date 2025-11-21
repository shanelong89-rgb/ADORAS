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

  const storageByType = [
    { type: 'Photos', icon: Image, size: storageStats.photoSize, color: 'text-blue-500' },
    { type: 'Videos', icon: Video, size: storageStats.videoSize, color: 'text-purple-500' },
    { type: 'Voice Notes', icon: Mic, size: storageStats.audioSize, color: 'text-green-500' },
    { type: 'Documents', icon: FileText, size: storageStats.documentSize, color: 'text-orange-500' },
  ];

  return (
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
              onClick={() => {
                toast.info('Export feature coming soon! You can download individual memories from the Media Library.');
              }}
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
  );
}
