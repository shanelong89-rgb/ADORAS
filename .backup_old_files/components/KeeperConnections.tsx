/**
 * KeeperConnections Component
 * Unified page for Keepers showing both connection requests and active connections
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

interface KeeperConnectionsProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectionsChanged?: () => void;
  pendingCount?: number;
}

export function KeeperConnections({ 
  isOpen, 
  onClose, 
  onConnectionsChanged,
  pendingCount = 0 
}: KeeperConnectionsProps) {
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
      }
    } catch (error) {
      console.error('Error loading connections:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoadingConnections(false);
    }
  };

  // Accept Connection Request
  const handleAccept = async (requestId: string, senderName: string) => {
    setProcessingRequestId(requestId);
    try {
      const response = await apiClient.acceptConnectionRequest(requestId);
      
      if (response.success) {
        toast.success(`You are now connected with ${senderName}! 🎉`);
        // Refresh both lists
        await loadRequests();
        await loadConnections();
        // Notify parent to refresh connections
        if (onConnectionsChanged) {
          onConnectionsChanged();
        }
        // Switch to connections tab to show the new connection
        setActiveTab('connections');
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
  const handleDecline = async (requestId: string, senderName: string) => {
    if (!confirm(`Decline connection request from ${senderName}?`)) {
      return;
    }

    setProcessingRequestId(requestId);
    try {
      const response = await apiClient.declineConnectionRequest(requestId);
      
      if (response.success) {
        toast.success(`Declined request from ${senderName}`);
        // Remove from list
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
  const handleDisconnect = async () => {
    if (!selectedConnection) return;

    setIsDisconnecting(true);
    try {
      const response = await apiClient.disconnectConnection(selectedConnection.id);
      
      if (response.success) {
        toast.success(`Disconnected from ${selectedConnection.partner.name}`);
        setShowDisconnectDialog(false);
        setSelectedConnection(null);
        // Refresh connections list
        await loadConnections();
        // Notify parent to refresh
        if (onConnectionsChanged) {
          onConnectionsChanged();
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
        <DialogContent className="max-w-2xl max-h-[90vh] p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="text-2xl" style={{ fontFamily: 'Archivo' }}>
              Connections
            </DialogTitle>
            <DialogDescription>
              Manage your storyteller connections and pending requests
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'requests' | 'connections')} className="flex-1">
            <div className="px-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="requests" className="relative">
                  Requests
                  {requests.length > 0 && (
                    <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                      {requests.length > 9 ? '9+' : requests.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="connections">
                  Active ({connections.length})
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Connection Requests Tab */}
            <TabsContent value="requests" className="m-0 flex-1">
              <ScrollArea className="h-[calc(90vh-200px)] px-6">
                {isLoadingRequests ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : requests.length === 0 ? (
                  <Alert className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No pending connection requests
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4 py-4">
                    {requests.map((request) => (
                      <div
                        key={request.id}
                        className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <Avatar className="w-12 h-12 border-2 border-primary/20">
                          <AvatarImage src={request.sender.photo} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {request.sender.name[0]}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate" style={{ fontFamily: 'Archivo' }}>
                                {request.sender.name}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Mail className="w-3 h-3 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground truncate">
                                  {request.sender.email}
                                </span>
                              </div>
                              {request.sender.relationship && (
                                <Badge variant="secondary" className="mt-2">
                                  {request.sender.relationship}
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>Requested {formatSafeDate(request.createdAt, 'MMM d, yyyy', 'Recently')}</span>
                          </div>

                          {request.message && (
                            <p className="mt-2 text-sm text-muted-foreground italic">
                              "{request.message}"
                            </p>
                          )}

                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              onClick={() => handleAccept(request.id, request.sender.name)}
                              disabled={processingRequestId === request.id}
                              className="flex-1"
                            >
                              {processingRequestId === request.id ? (
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              ) : (
                                <Check className="w-3 h-3 mr-1" />
                              )}
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDecline(request.id, request.sender.name)}
                              disabled={processingRequestId === request.id}
                              className="flex-1"
                            >
                              <X className="w-3 h-3 mr-1" />
                              Decline
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Active Connections Tab */}
            <TabsContent value="connections" className="m-0 flex-1">
              <ScrollArea className="h-[calc(90vh-200px)] px-6">
                {isLoadingConnections ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : connections.length === 0 ? (
                  <Alert className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No active connections yet. Accept connection requests or create invitations to get started.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4 py-4">
                    {connections.map((connection) => (
                      <div
                        key={connection.id}
                        className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <Avatar className="w-12 h-12 border-2 border-primary/20">
                          <AvatarImage src={connection.partner.photo} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {connection.partner.name[0]}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate" style={{ fontFamily: 'Archivo' }}>
                                {connection.partner.name}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Mail className="w-3 h-3 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground truncate">
                                  {connection.partner.email}
                                </span>
                              </div>
                              {connection.partner.relationship && (
                                <Badge variant="secondary" className="mt-2">
                                  {connection.partner.relationship}
                                </Badge>
                              )}
                            </div>
                            <Badge variant="default" className="bg-green-100 text-green-800 border-green-300">
                              <UserCheck className="w-3 h-3 mr-1" />
                              Connected
                            </Badge>
                          </div>

                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <MessageCircle className="w-3 h-3" />
                              <span>{connection.memoriesCount} memories</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>Since {formatSafeDate(connection.acceptedAt || connection.createdAt, 'MMM yyyy', 'Recently')}</span>
                            </div>
                          </div>

                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedConnection(connection);
                              setShowDisconnectDialog(true);
                            }}
                            className="mt-3"
                          >
                            <UserX className="w-3 h-3 mr-1" />
                            Disconnect
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
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
          onConfirm={handleDisconnect}
          partnerName={selectedConnection.partner.name}
          memoriesCount={selectedConnection.memoriesCount}
          isDisconnecting={isDisconnecting}
        />
      )}
    </>
  );
}
