import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Bell } from 'lucide-react';
import { NotificationSettings } from './NotificationSettings';

interface NotificationsProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
}

export function Notifications({ isOpen, onClose, userId }: NotificationsProps) {
  console.log('🔔 Notifications Dialog Rendering:', { 
    isOpen, 
    userId,
    hasUserId: !!userId,
    userIdType: typeof userId 
  });
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ fontFamily: 'Archivo' }}>
            <Bell className="w-5 h-5 text-primary" />
            Notification Settings
          </DialogTitle>
          <DialogDescription style={{ fontFamily: 'Inter' }}>
            Manage how you receive notifications about new memories and updates
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {userId ? (
            <NotificationSettings userId={userId} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Please log in to configure notifications</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
