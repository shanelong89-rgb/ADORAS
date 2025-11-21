/**
 * TellerConnections Component
 * Unified page for Tellers showing both connection requests and active connections
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { 
  UserX, 
  Users, 
  Calendar, 
  MessageCircle, 
  Loader2, 
  UserCheck, 
  X, 
  Check, 
  Mail,
  Clock,
  AlertCircle,
  UserPlus
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../utils/api/client';
import { DisconnectConfirmDialog } from './DisconnectConfirmDialog';
import { format, isValid, parseISO } from 'date-fns';

interface ConnectionRequest {
  id: string;
  sender: {
    id: string;
    name: string;
    email: string;
    photo?: string;
    relationship?: string;
  };
  createdAt: string;
  message?: string;
}

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

interface TellerConnectionsProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectionsChanged?: () => void;
  pendingCount?: number;
}

export function TellerConnections({ 
  isOpen, 
  onClose, 
  onConnectionsChanged,
  pendingCount = 0 
}: TellerConnectionsProps) {
  const [activeTab, setActiveTab] = useState<'requests' | 'connections'>('requests');
  
  // Connection Requests State
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  
  // Active Connections State
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoadingConnections, setIsLoadingConnections] = useState(true);
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
      loadRequests();
      loadConnections();
      // Auto-switch to requests tab if there are pending requests
      if (pendingCount > 0) {
        setActiveTab('requests');
      }
    }
  }, [isOpen, pendingCount]);

  // Load Connection Requests
  const loadRequests = async () => {
    setIsLoadingRequests(true);
    try {
      const response = await apiClient.getConnectionRequests();
      
      if (response.success && response.receivedRequests) {
        // Map the backend format to our component format
        const mappedRequests = response.receivedRequests.map((req: any) => ({
          id: req.id,
          sender: {
            id: req.requesterId,
            name: req.requesterName,
            email: req.requesterEmail,
            photo: req.requesterPhoto,
            relationship: req.requesterRelationship,
          },
          createdAt: req.createdAt,
          message: req.message,
        }));
        setRequests(mappedRequests);
      } else {
        console.error('Failed to load requests:', response.error);
        toast.error('Failed to load connection requests');
      }
    } catch (error) {
      console.error('Error loading requests:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoadingRequests(false);
    }
  };

  // Load Active Connections
  const loadConnections = async () => {
    setIsLoadingConnections(true);
    try {
      const response = await apiClient.getConnections();
      
      if (response.success && response.connections) {
        // Map the backend format to our component format
        // Backend returns: { connection: Connection, partner: UserProfile }[]
        
        // Fetch all memories counts in parallel for better performance
        const memoriesPromises = response.connections.map((conn: any) =>
          apiClient.getMemories(conn.connection.id)
            .then(memoriesResponse => ({
              connectionId: conn.connection.id,
              count: memoriesResponse.success && memoriesResponse.memories 
                ? memoriesResponse.memories.length 
                : 0
            }))
            .catch(error => {
              console.error('Error loading memories count for connection:', conn.connection.id, error);
              return { connectionId: conn.connection.id, count: 0 };
            })
        );

        // Wait for all memories counts to load
        const memoriesCounts = await Promise.all(memoriesPromises);
        const memoriesMap = new Map(
          memoriesCounts.map(m => [m.connectionId, m.count])
        );

        const mappedConnections = response.connections.map((conn: any) => ({
          id: conn.connection.id,
          partner: {
            id: conn.partner?.id || '',
            name: conn.partner?.name || 'Unknown',
            email: conn.partner?.email || '',
            photo: conn.partner?.photo,
            relationship: conn.partner?.relationship,
          },
          memoriesCount: memoriesMap.get(conn.connection.id) || 0,
          createdAt: conn.connection.createdAt,
          acceptedAt: conn.connection.acceptedAt,
        }));
        
        setConnections(mappedConnections);
      } else {
        console.error('Failed to load connections:', response.error);
        toast.error('Failed to load connections');
      }
    } catch (error) {
      console.error('Error loading connections:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoadingConnections(false);
    }
  };

  // Accept Connection Request
  const handleAccept = async (requestId: string) => {
    setProcessingRequestId(requestId);
    try {
      const response = await apiClient.acceptConnectionRequest(requestId);
      
      if (response.success) {
        toast.success('Connection request accepted!');
        // Remove from requests list immediately
        setRequests(prev => prev.filter(r => r.id !== requestId));
        
        // Reload connections to show the new accepted connection
        await loadConnections();
        
        // Switch to Active tab to show the newly accepted connection
        setActiveTab('connections');
        
        // Notify parent and reload
        if (onConnectionsChanged) {
          setTimeout(() => {
            onConnectionsChanged();
          }, 1000);
        }
      } else {
        toast.error(response.error || 'Failed to accept request');
      }
    } catch (error) {
      console.error('Error accepting request:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setProcessingRequestId(null);
    }
  };

  // Decline Connection Request
  const handleDecline = async (requestId: string) => {
    setProcessingRequestId(requestId);
    try {
      const response = await apiClient.declineConnectionRequest(requestId);
      
      if (response.success) {
        toast.success('Connection request declined');
        setRequests(prev => prev.filter(r => r.id !== requestId));
      } else {
        toast.error(response.error || 'Failed to decline request');
      }
    } catch (error) {
      console.error('Error declining request:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setProcessingRequestId(null);
    }
  };

  // Disconnect from Connection
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
        
        setConnections(prev => prev.filter(c => c.id !== selectedConnection.id));
        setShowDisconnectDialog(false);
        setSelectedConnection(null);
        
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
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Archivo', letterSpacing: '-0.05em' }}>
              Connections
            </DialogTitle>
            <DialogDescription style={{ fontFamily: 'Inter' }}>
              Manage your connection requests and active connections
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'requests' | 'connections')} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="requests" className="relative">
                Requests
                {requests.length > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 min-w-5 px-1.5 text-xs">
                    {requests.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="connections">
                Active ({connections.length})
              </TabsTrigger>
            </TabsList>

            {/* CONNECTION REQUESTS TAB */}
            <TabsContent value="requests" className="flex-1 flex flex-col mt-4">
              {isLoadingRequests ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : requests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <Mail className="w-16 h-16 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'Archivo' }}>
                    No Pending Requests
                  </h3>
                  <p className="text-sm text-muted-foreground text-center" style={{ fontFamily: 'Inter' }}>
                    You don't have any pending connection requests
                  </p>
                </div>
              ) : (
                <ScrollArea className="flex-1 pr-4">
                  <div className="space-y-4">
                    {requests.map((request, index) => (
                      <div key={request.id}>
                        {index > 0 && <Separator className="my-4" />}
                        
                        <div className="p-4 rounded-lg border bg-card">
                          {/* Header */}
                          <div className="flex items-start gap-4 mb-4">
                            <Avatar className="w-16 h-16 ring-2 ring-primary/20">
                              <AvatarImage src={request.sender.photo} />
                              <AvatarFallback className="bg-primary/10 text-primary text-lg">
                                {request.sender.name[0]?.toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-lg break-words" style={{ fontFamily: 'Archivo' }}>
                                {request.sender.name}
                              </h3>
                              <p className="text-sm text-muted-foreground break-all" style={{ fontFamily: 'Inter' }}>
                                {request.sender.email}
                              </p>
                              {request.sender.relationship && (
                                <Badge variant="outline" className="mt-2">
                                  {request.sender.relationship}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Message */}
                          {request.message && (
                            <Alert className="mb-4 bg-muted/50 border-muted">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription style={{ fontFamily: 'Inter' }}>
                                "{request.message}"
                              </AlertDescription>
                            </Alert>
                          )}

                          {/* Timestamp */}
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
                            <Clock className="w-3 h-3" />
                            <span>
                              Received {formatSafeDate(request.createdAt, 'MMM d, yyyy \'at\' h:mm a', 'recently')}
                            </span>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleAccept(request.id)}
                              disabled={processingRequestId === request.id}
                              className="flex-1"
                            >
                              {processingRequestId === request.id ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Accepting...
                                </>
                              ) : (
                                <>
                                  <Check className="w-4 h-4 mr-2" />
                                  Accept
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDecline(request.id)}
                              disabled={processingRequestId === request.id}
                              className="flex-1"
                            >
                              {processingRequestId === request.id ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Declining...
                                </>
                              ) : (
                                <>
                                  <X className="w-4 h-4 mr-2" />
                                  Decline
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            {/* ACTIVE CONNECTIONS TAB */}
            <TabsContent value="connections" className="flex-1 flex flex-col mt-4">
              {isLoadingConnections ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : connections.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <Users className="w-16 h-16 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'Archivo' }}>
                    No Active Connections
                  </h3>
                  <p className="text-sm text-muted-foreground text-center" style={{ fontFamily: 'Inter' }}>
                    Accept connection requests to start sharing memories
                  </p>
                </div>
              ) : (
                <ScrollArea className="flex-1 pr-4">
                  <div className="space-y-4">
                    {connections.map((connection, index) => (
                      <div key={connection.id}>
                        {index > 0 && <Separator className="my-4" />}
                        
                        <div className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                          <Avatar className="w-16 h-16 ring-2 ring-primary/20">
                            <AvatarImage src={connection.partner.photo} />
                            <AvatarFallback className="bg-primary/10 text-primary text-lg">
                              {connection.partner.name[0]?.toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-lg break-words" style={{ fontFamily: 'Archivo' }}>
                                  {connection.partner.name}
                                </h3>
                                {connection.partner.relationship && (
                                  <Badge variant="outline" className="mt-1">
                                    {connection.partner.relationship}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <p className="text-sm text-muted-foreground mb-3 break-all" style={{ fontFamily: 'Inter' }}>
                              {connection.partner.email}
                            </p>

                            {/* Stats */}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                              <div className="flex items-center gap-1">
                                <MessageCircle className="w-3 h-3" />
                                <span>{connection.memoriesCount} {connection.memoriesCount === 1 ? 'memory' : 'memories'}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>
                                  Connected {formatSafeDate(connection.acceptedAt || connection.createdAt, 'MMM d, yyyy', 'recently')}
                                </span>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDisconnectClick(connection)}
                                className="h-8 text-xs"
                              >
                                <UserX className="w-3 h-3 mr-1" />
                                Disconnect
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
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
