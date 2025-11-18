/**
 * ConnectionManagement Component
 * View and manage all connections with disconnect option
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { UserX, Users, Calendar, MessageCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../utils/api/client';
import { DisconnectConfirmDialog } from './DisconnectConfirmDialog';
import { DeleteConnectionData } from './DeleteConnectionData';
import { format, isValid, parseISO } from 'date-fns';

interface Connection {
  id: string;
  partner: {
    id: string;
    name: string;
    email: string;
    photo?: string;
    relationship?: string;
  };
  memoriesCount: number;
  createdAt: string;
  acceptedAt?: string;
}

interface ConnectionManagementProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectionsChanged?: () => void;
}

export function ConnectionManagement({ isOpen, onClose, onConnectionsChanged }: ConnectionManagementProps) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Safe date formatter helper
  const formatSafeDate = (dateString: string | undefined, formatStr: string, fallback: string = 'N/A'): string => {
    if (!dateString) return fallback;
    
    try {
      const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
      if (!isValid(date)) return fallback;
      return format(date, formatStr);
    } catch (error) {
      console.error('Date formatting error:', error, dateString);
      return fallback;
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadConnections();
    }
  }, [isOpen]);

  const loadConnections = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.getConnections();
      
      if (response.success && response.connections) {
        // Map the backend format to our component format
        // Backend returns: { connection: Connection, partner: UserProfile }[]
        const mappedConnections = await Promise.all(
          response.connections.map(async (conn: any) => {
            // Get memories count for this connection
            let memoriesCount = 0;
            try {
              const memoriesResponse = await apiClient.getMemories(conn.connection.id);
              if (memoriesResponse.success && memoriesResponse.memories) {
                memoriesCount = memoriesResponse.memories.length;
              }
            } catch (error) {
              console.error('Error loading memories count:', error);
            }

            return {
              id: conn.connection.id,
              partner: {
                id: conn.partner?.id || '',
                name: conn.partner?.name || 'Unknown',
                email: conn.partner?.email || '',
                photo: conn.partner?.photo,
                relationship: conn.partner?.relationship,
              },
              memoriesCount,
              createdAt: conn.connection.createdAt,
              acceptedAt: conn.connection.acceptedAt,
            };
          })
        );
        setConnections(mappedConnections);
      } else {
        console.error('Failed to load connections:', response.error);
        toast.error('Failed to load connections');
      }
    } catch (error) {
      console.error('Error loading connections:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnectClick = (connection: Connection) => {
    setSelectedConnection(connection);
    setShowDisconnectDialog(true);
  };

  const handleDisconnectConfirm = async (deleteMemories: boolean) => {
    if (!selectedConnection) return;

    setIsDisconnecting(true);
    try {
      const response = await apiClient.disconnectConnection(
        selectedConnection.id,
        deleteMemories
      );
      
      if (response.success) {
        toast.success(response.message || 'Disconnected successfully');
        
        // Remove from list
        setConnections(prev => prev.filter(c => c.id !== selectedConnection.id));
        
        // Close dialogs
        setShowDisconnectDialog(false);
        setSelectedConnection(null);
        
        // Notify parent to refresh
        if (onConnectionsChanged) {
          setTimeout(() => {
            onConnectionsChanged();
          }, 1000);
        }
      } else {
        toast.error(response.error || 'Failed to disconnect');
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent 
          className="max-w-[min(calc(100vw-1rem),640px)] max-h-[90vh] flex flex-col p-0 gap-0"
          style={{ overflowX: 'hidden', width: '100%' }}
        >
          {/* Header */}
          <div className="px-4 sm:px-6 pt-6 shrink-0" style={{ overflowX: 'hidden' }}>
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg truncate" style={{ fontFamily: 'Archivo', letterSpacing: '-0.05em' }}>
                Manage Connections
              </DialogTitle>
              <DialogDescription style={{ fontFamily: 'Inter' }}>
                View and manage your family connections
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : connections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Users className="w-16 h-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'Archivo' }}>
                No Connections Yet
              </h3>
              <p className="text-sm text-muted-foreground text-center" style={{ fontFamily: 'Inter' }}>
                You don't have any active connections. Send an invitation to get started!
              </p>
            </div>
          ) : (
            <div className="flex-1 min-h-0" style={{ overflowX: 'hidden' }}>
              <ScrollArea className="h-full" style={{ overflowX: 'hidden' }}>
                <div className="space-y-4 pb-4 px-4 sm:px-6" style={{ overflowX: 'hidden', maxWidth: '100%' }}>
                  {connections.map((connection, index) => (
                    <div key={connection.id} style={{ overflowX: 'hidden', maxWidth: '100%' }}>
                      {index > 0 && <Separator className="my-4" />}
                      
                      <div className="flex flex-col gap-3 p-3 sm:p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors" style={{ overflowX: 'hidden', maxWidth: '100%' }}>
                        {/* Avatar */}
                        <div className="flex items-center gap-3">
                          <Avatar className="w-16 h-16 ring-2 ring-primary/20 shrink-0">
                            <AvatarImage src={connection.partner.photo} />
                            <AvatarFallback className="bg-primary/10 text-primary text-lg">
                              {connection.partner.name[0]?.toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          
                          {/* Name & Relationship */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base sm:text-lg truncate" style={{ fontFamily: 'Archivo' }}>
                              {connection.partner.name}
                            </h3>
                            {connection.partner.relationship && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                {connection.partner.relationship}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Email */}
                        <p className="text-xs sm:text-sm text-muted-foreground truncate" style={{ fontFamily: 'Inter' }}>
                          {connection.partner.email}
                        </p>

                        {/* Stats */}
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1 shrink-0">
                            <MessageCircle className="w-3 h-3 shrink-0" />
                            <span>{connection.memoriesCount} {connection.memoriesCount === 1 ? 'memory' : 'memories'}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Calendar className="w-3 h-3 shrink-0" />
                            <span className="truncate">
                              Connected {formatSafeDate(connection.acceptedAt || connection.createdAt, 'MMM d, yyyy', 'recently')}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-2 w-full" style={{ overflowX: 'hidden' }}>
                          <DeleteConnectionData
                            connectionId={connection.id}
                            partnerName={connection.partner.name}
                            memoriesCount={connection.memoriesCount}
                            onDeleted={() => {
                              // Reload connections after deletion
                              loadConnections();
                              if (onConnectionsChanged) {
                                onConnectionsChanged();
                              }
                            }}
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDisconnectClick(connection)}
                            className="h-9 text-xs w-full sm:w-auto shrink-0"
                            style={{ minWidth: '0' }}
                          >
                            <UserX className="w-3 h-3 mr-1 shrink-0" />
                            Disconnect
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end px-4 sm:px-6 py-4 border-t mt-auto shrink-0" style={{ overflowX: 'hidden' }}>
            <Button variant="outline" size="sm" onClick={onClose} className="h-9">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Disconnect Confirmation Dialog */}
      {selectedConnection && (
        <DisconnectConfirmDialog
          isOpen={showDisconnectDialog}
          onClose={() => {
            setShowDisconnectDialog(false);
            setSelectedConnection(null);
          }}
          onConfirm={handleDisconnectConfirm}
          partnerName={selectedConnection.partner.name}
          memoriesCount={selectedConnection.memoriesCount}
          isLoading={isDisconnecting}
        />
      )}
    </>
  );
}
