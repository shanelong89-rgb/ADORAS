/**
 * ConnectionRequests Component
 * Shows pending connection requests that need to be accepted/declined
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { Check, X, Loader2, UserPlus, Mail, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../utils/api/client';
import { format } from 'date-fns';

interface ConnectionRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhoto?: string;
  recipientId: string;
  recipientName: string;
  recipientEmail: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  respondedAt?: string;
}

interface ConnectionRequestsProps {
  isOpen: boolean;
  onClose: () => void;
  onAccepted?: () => void; // Callback to refresh connections after accepting
}

export function ConnectionRequests({ isOpen, onClose, onAccepted }: ConnectionRequestsProps) {
  const [receivedRequests, setReceivedRequests] = useState<ConnectionRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<ConnectionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadConnectionRequests();
    }
  }, [isOpen]);

  const loadConnectionRequests = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.getConnectionRequests();
      
      if (response.success) {
        setReceivedRequests(response.receivedRequests || []);
        setSentRequests(response.sentRequests || []);
      } else {
        console.error('Failed to load connection requests:', response.error);
        toast.error('Failed to load connection requests');
      }
    } catch (error) {
      console.error('Error loading connection requests:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (requestId: string, requesterName: string) => {
    setProcessingId(requestId);
    try {
      const response = await apiClient.acceptConnectionRequest(requestId);
      
      if (response.success) {
        toast.success(`You are now connected with ${requesterName}!`);
        // Remove from received requests
        setReceivedRequests(prev => prev.filter(r => r.id !== requestId));
        // Trigger parent callback to refresh connections
        if (onAccepted) {
          setTimeout(() => {
            onAccepted();
          }, 1000); // Small delay to let backend process
        }
      } else {
        toast.error(response.error || 'Failed to accept request');
      }
    } catch (error) {
      console.error('Error accepting request:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (requestId: string, requesterName: string) => {
    if (!confirm(`Decline connection request from ${requesterName}?`)) {
      return;
    }

    setProcessingId(requestId);
    try {
      const response = await apiClient.declineConnectionRequest(requestId);
      
      if (response.success) {
        toast.success('Connection request declined');
        // Remove from received requests
        setReceivedRequests(prev => prev.filter(r => r.id !== requestId));
      } else {
        toast.error(response.error || 'Failed to decline request');
      }
    } catch (error) {
      console.error('Error declining request:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const pendingReceived = receivedRequests.filter(r => r && r.status === 'pending');
  const pendingSent = sentRequests.filter(r => r && r.status === 'pending');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'Archivo', letterSpacing: '-0.05em' }}>
            Connection Requests
          </DialogTitle>
          <DialogDescription style={{ fontFamily: 'Inter' }}>
            Manage your pending connection requests
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (pendingReceived.length === 0 && pendingSent.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <UserPlus className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'Archivo' }}>
              No Pending Requests
            </h3>
            <p className="text-sm text-muted-foreground text-center" style={{ fontFamily: 'Inter' }}>
              You don't have any pending connection requests at the moment.
            </p>
          </div>
        ) : (
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6">
              {/* Received Requests (Need Action) */}
              {pendingReceived.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3" style={{ fontFamily: 'Inter' }}>
                    Received ({pendingReceived.length})
                  </h3>
                  <div className="space-y-3">
                    {pendingReceived.map((request) => (
                      <div key={request.id} className="border rounded-lg p-4 bg-card">
                        <div className="flex items-start gap-3">
                          <Avatar className="w-12 h-12 ring-2 ring-primary/20">
                            <AvatarImage src={request.requesterPhoto} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {request.requesterName[0]?.toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold truncate" style={{ fontFamily: 'Archivo' }}>
                              {request.requesterName}
                            </h4>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                              <Mail className="w-3 h-3" />
                              <span className="truncate" style={{ fontFamily: 'Inter' }}>
                                {request.requesterEmail}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground" style={{ fontFamily: 'Inter' }}>
                              <Clock className="w-3 h-3 inline mr-1" />
                              Sent {format(new Date(request.createdAt), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2 mt-4">
                          <Button
                            onClick={() => handleAccept(request.id, request.requesterName)}
                            disabled={processingId === request.id}
                            className="flex-1 bg-primary hover:bg-primary/90"
                          >
                            {processingId === request.id ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4 mr-2" />
                            )}
                            Accept
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleDecline(request.id, request.requesterName)}
                            disabled={processingId === request.id}
                            className="flex-1"
                          >
                            {processingId === request.id ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <X className="w-4 h-4 mr-2" />
                            )}
                            Decline
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sent Requests (Waiting) */}
              {pendingSent.length > 0 && (
                <div>
                  {pendingReceived.length > 0 && <Separator className="my-4" />}
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3" style={{ fontFamily: 'Inter' }}>
                    Sent ({pendingSent.length})
                  </h3>
                  <div className="space-y-3">
                    {pendingSent.map((request) => (
                      <div key={request.id} className="border rounded-lg p-4 bg-card/50">
                        <div className="flex items-start gap-3">
                          <Avatar className="w-12 h-12 ring-2 ring-muted">
                            <AvatarFallback className="bg-muted text-muted-foreground">
                              {request.recipientName[0]?.toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold truncate" style={{ fontFamily: 'Archivo' }}>
                                {request.recipientName}
                              </h4>
                              <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-200">
                                <Clock className="w-3 h-3 mr-1" />
                                Pending
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                              <Mail className="w-3 h-3" />
                              <span className="truncate" style={{ fontFamily: 'Inter' }}>
                                {request.recipientEmail}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground" style={{ fontFamily: 'Inter' }}>
                              Sent {format(new Date(request.createdAt), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
