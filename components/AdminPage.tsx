/**
 * Admin Page - Database Inspection & Cleanup Tools
 * View and delete connection requests, invitations, and connections
 */

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Trash2, RefreshCw, AlertCircle, CheckCircle, X, Users, Mail, Clock, UserPlus, Search, Link2 } from 'lucide-react';
import { apiClient } from '../utils/api/client';
import { toast } from 'sonner';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface ConnectionRequest {
  id: string;
  sender_id: string;
  sender_email: string;
  sender_name: string;
  sender_type: 'keeper' | 'teller';
  receiver_id: string;
  receiver_email: string;
  receiver_name: string;
  receiver_type: 'keeper' | 'teller';
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  expires_at: string;
}

interface Invitation {
  id: string;
  code: string;
  sender_id: string;
  sender_name: string;
  sender_email?: string;
  partner_name: string;
  partner_relationship: string;
  phone_number?: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  created_at: string;
  expires_at: string;
}

interface Connection {
  id: string;
  keeper_id: string;
  keeper_name: string;
  keeper_email?: string;
  teller_id: string;
  teller_name: string;
  teller_email?: string;
  created_at: string;
  is_same_role: boolean;
}

export function AdminPage() {
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      // Load connection requests
      const requestsResponse = await fetch(
        `https://cyaaksjydpegofrldxbo.supabase.co/functions/v1/make-server-deded1eb/admin/connection-requests`,
        {
          headers: {
            'Authorization': `Bearer ${apiClient.getAccessToken()}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (requestsResponse.ok) {
        const requestsData = await requestsResponse.json();
        setConnectionRequests(requestsData.requests || []);
      }

      // Load invitations
      const invitationsResponse = await fetch(
        `https://cyaaksjydpegofrldxbo.supabase.co/functions/v1/make-server-deded1eb/admin/invitations`,
        {
          headers: {
            'Authorization': `Bearer ${apiClient.getAccessToken()}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (invitationsResponse.ok) {
        const invitationsData = await invitationsResponse.json();
        setInvitations(invitationsData.invitations || []);
      }

      // Load connections
      const connectionsResponse = await fetch(
        `https://cyaaksjydpegofrldxbo.supabase.co/functions/v1/make-server-deded1eb/admin/connections`,
        {
          headers: {
            'Authorization': `Bearer ${apiClient.getAccessToken()}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (connectionsResponse.ok) {
        const connectionsData = await connectionsResponse.json();
        setConnections(connectionsData.connections || []);
      }
    } catch (error) {
      console.error('Failed to load admin data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const deleteConnectionRequest = async (id: string) => {
    setDeleting(id);
    try {
      const response = await fetch(
        `https://cyaaksjydpegofrldxbo.supabase.co/functions/v1/make-server-deded1eb/admin/connection-requests/${id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${apiClient.getAccessToken()}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        toast.success('Connection request deleted');
        await loadData();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete');
      }
    } catch (error) {
      console.error('Failed to delete connection request:', error);
      toast.error('Failed to delete connection request');
    } finally {
      setDeleting(null);
    }
  };

  const deleteInvitation = async (code: string) => {
    setDeleting(code);
    try {
      const response = await fetch(
        `https://cyaaksjydpegofrldxbo.supabase.co/functions/v1/make-server-deded1eb/admin/invitations/${code}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${apiClient.getAccessToken()}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        toast.success('Invitation deleted');
        await loadData();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete');
      }
    } catch (error) {
      console.error('Failed to delete invitation:', error);
      toast.error('Failed to delete invitation');
    } finally {
      setDeleting(null);
    }
  };

  const deleteConnection = async (id: string) => {
    setDeleting(id);
    try {
      const response = await fetch(
        `https://cyaaksjydpegofrldxbo.supabase.co/functions/v1/make-server-deded1eb/admin/connections/${id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${apiClient.getAccessToken()}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        toast.success('Connection deleted');
        await loadData();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete');
      }
    } catch (error) {
      console.error('Failed to delete connection:', error);
      toast.error('Failed to delete connection');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'accepted':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'rejected':
      case 'expired':
      case 'cancelled':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f5f9e9] to-[#e8f3d6] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-lg">Loading admin data...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f5f9e9] to-[#e8f3d6] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#2d5016]">Admin Panel</h1>
            <p className="text-[#5a7c3e] mt-1">Database inspection and cleanup tools</p>
          </div>
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Connection Requests</p>
                  <p className="text-2xl font-bold">{connectionRequests.length}</p>
                </div>
                <UserPlus className="w-8 h-8 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">SMS Invitations</p>
                  <p className="text-2xl font-bold">{invitations.length}</p>
                </div>
                <Mail className="w-8 h-8 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Connections</p>
                  <p className="text-2xl font-bold">{connections.length}</p>
                </div>
                <Users className="w-8 h-8 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Fix Connections Tool */}
        <Card className="border-2 border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="flex items-center text-orange-800">
              <Link2 className="w-5 h-5 mr-2" />
              Fix Connections Tool
            </CardTitle>
            <CardDescription>
              Search for a user's connections by email and view detailed connection info
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <Label htmlFor="searchEmail">Search by Email</Label>
                <Input
                  id="searchEmail"
                  type="email"
                  placeholder="Enter user email (e.g., shanelong@gmail.com)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {searchTerm && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-orange-800">Connections for: {searchTerm}</p>
                {connections
                  .filter(conn => 
                    conn.keeper_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    conn.teller_email?.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map(conn => {
                    // Determine which side is the searched user
                    const isSearchedUserKeeper = conn.keeper_email?.toLowerCase().includes(searchTerm.toLowerCase());
                    const searchedUser = isSearchedUserKeeper 
                      ? { name: conn.keeper_name, email: conn.keeper_email, id: conn.keeper_id }
                      : { name: conn.teller_name, email: conn.teller_email, id: conn.teller_id };
                    const partnerUser = isSearchedUserKeeper
                      ? { name: conn.teller_name, email: conn.teller_email, id: conn.teller_id }
                      : { name: conn.keeper_name, email: conn.keeper_email, id: conn.keeper_id };

                    return (
                      <div key={conn.id} className="p-4 border-2 border-orange-200 rounded-lg bg-white">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded font-mono">
                              Connection ID: {conn.id}
                            </span>
                            {conn.is_same_role && (
                              <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
                                Same Role
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-blue-50 rounded">
                              <p className="text-xs text-blue-600 font-medium mb-1">Searched User</p>
                              <p className="font-medium">{searchedUser.name}</p>
                              <p className="text-sm text-muted-foreground">{searchedUser.email}</p>
                              <code className="text-xs text-blue-600 font-mono block mt-1">
                                ID: {searchedUser.id}
                              </code>
                            </div>

                            <div className="p-3 bg-green-50 rounded">
                              <p className="text-xs text-green-600 font-medium mb-1">Partner</p>
                              <p className="font-medium">{partnerUser.name || 'Unknown'}</p>
                              <p className="text-sm text-muted-foreground">{partnerUser.email || 'No email'}</p>
                              <code className="text-xs text-green-600 font-mono block mt-1">
                                ID: {partnerUser.id}
                              </code>
                            </div>
                          </div>

                          <div className="text-xs text-muted-foreground">
                            Created: {formatDate(conn.created_at)}
                          </div>

                          {(!partnerUser.email || partnerUser.name === 'Unknown') && (
                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                              <p className="text-sm font-medium text-yellow-800 mb-2">
                                ⚠️ Partner shows as "Unknown" - Use /admin.html to update partner_id
                              </p>
                              <p className="text-xs text-yellow-700">
                                1. Open /admin.html<br/>
                                2. Find the KV record: connection:{conn.id}<br/>
                                3. Update the partner_id field to the correct user ID<br/>
                                4. Save and refresh this page
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                
                {connections.filter(conn => 
                  conn.keeper_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  conn.teller_email?.toLowerCase().includes(searchTerm.toLowerCase())
                ).length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p>No connections found for this email</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Connection Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserPlus className="w-5 h-5 mr-2" />
              Connection Requests
            </CardTitle>
            <CardDescription>
              Email-based connection requests (same-role connections)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {connectionRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>No connection requests found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {connectionRequests.map((request) => (
                  <div
                    key={request.id}
                    className="p-4 border rounded-lg bg-white hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(request.status)}`}>
                            {request.status}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatDate(request.created_at)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Sender</p>
                            <p className="font-medium">{request.sender_name}</p>
                            <p className="text-sm text-muted-foreground">{request.sender_email}</p>
                            <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                              {request.sender_type}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Receiver</p>
                            <p className="font-medium">{request.receiver_name}</p>
                            <p className="text-sm text-muted-foreground">{request.receiver_email}</p>
                            <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">
                              {request.receiver_type}
                            </span>
                          </div>
                        </div>

                        {request.status === 'pending' && new Date(request.expires_at) < new Date() && (
                          <div className="flex items-center gap-1 text-xs text-red-600">
                            <AlertCircle className="w-3 h-3" />
                            Expired on {formatDate(request.expires_at)}
                          </div>
                        )}
                      </div>

                      <Button
                        onClick={() => deleteConnectionRequest(request.id)}
                        disabled={deleting === request.id}
                        variant="destructive"
                        size="sm"
                        className="ml-4"
                      >
                        {deleting === request.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* SMS Invitations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mail className="w-5 h-5 mr-2" />
              SMS Invitations
            </CardTitle>
            <CardDescription>
              Phone-based invitations for cross-role connections
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invitations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>No invitations found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="p-4 border rounded-lg bg-white hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(invitation.status)}`}>
                            {invitation.status}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatDate(invitation.created_at)}
                          </span>
                        </div>
                        
                        <div>
                          <p className="text-xs text-muted-foreground">From</p>
                          <p className="font-medium">{invitation.sender_name}</p>
                          {invitation.sender_email && (
                            <p className="text-sm text-muted-foreground">{invitation.sender_email}</p>
                          )}
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground">To</p>
                          <p className="font-medium">{invitation.partner_name}</p>
                          <p className="text-sm text-muted-foreground">{invitation.partner_relationship}</p>
                          {invitation.phone_number && (
                            <p className="text-sm text-muted-foreground">{invitation.phone_number}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {invitation.code}
                          </code>
                        </div>
                      </div>

                      <Button
                        onClick={() => deleteInvitation(invitation.code)}
                        disabled={deleting === invitation.code}
                        variant="destructive"
                        size="sm"
                        className="ml-4"
                      >
                        {deleting === invitation.code ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Connections */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Active Connections
            </CardTitle>
            <CardDescription>
              Established connections between users
            </CardDescription>
          </CardHeader>
          <CardContent>
            {connections.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>No active connections found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {connections.map((connection) => (
                  <div
                    key={connection.id}
                    className="p-4 border rounded-lg bg-white hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          {connection.is_same_role && (
                            <span className="px-2 py-1 rounded text-xs font-medium border bg-purple-50 text-purple-700 border-purple-200">
                              Same Role
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatDate(connection.created_at)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Keeper</p>
                            <p className="font-medium">{connection.keeper_name}</p>
                            {connection.keeper_email && (
                              <p className="text-sm text-muted-foreground">{connection.keeper_email}</p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Teller</p>
                            <p className="font-medium">{connection.teller_name}</p>
                            {connection.teller_email && (
                              <p className="text-sm text-muted-foreground">{connection.teller_email}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <Button
                        onClick={() => deleteConnection(connection.id)}
                        disabled={deleting === connection.id}
                        variant="destructive"
                        size="sm"
                        className="ml-4"
                      >
                        {deleting === connection.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
