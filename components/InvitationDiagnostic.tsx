/**
 * Invitation Diagnostic Tool
 * 
 * Checks what invitations, users, and connections exist in the database
 */

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { CheckCircle, XCircle, Loader2, Search, Users, Mail, Link } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface DiagnosticResult {
  success: boolean;
  totalInvitations?: number;
  invitations?: Array<{
    code: string;
    keeperId: string;
    tellerName: string;
    tellerPhoneNumber: string;
    status: string;
    sentAt: string;
    expiresAt: string;
  }>;
  totalUsers?: number;
  users?: Array<{
    id: string;
    name: string;
    email: string;
    type: string;
    phoneNumber: string;
    createdAt: string;
  }>;
  totalConnections?: number;
  connections?: Array<{
    id: string;
    keeper: { id: string; name: string; email: string } | null;
    teller: { id: string; name: string; email: string } | null;
    status: string;
    invitationCode: string;
    createdAt: string;
  }>;
  error?: string;
}

export function InvitationDiagnostic() {
  const [invitationsResult, setInvitationsResult] = useState<DiagnosticResult | null>(null);
  const [usersResult, setUsersResult] = useState<DiagnosticResult | null>(null);
  const [connectionsResult, setConnectionsResult] = useState<DiagnosticResult | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const checkInvitations = async () => {
    setLoading('invitations');
    setInvitationsResult(null);
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-deded1eb/diagnostic/invitations`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      const data = await response.json();
      setInvitationsResult(data);
      console.log('Invitations:', data);
    } catch (error) {
      console.error('Check invitations error:', error);
      setInvitationsResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(null);
    }
  };

  const checkUsers = async () => {
    setLoading('users');
    setUsersResult(null);
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-deded1eb/diagnostic/users`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      const data = await response.json();
      setUsersResult(data);
      console.log('Users:', data);
    } catch (error) {
      console.error('Check users error:', error);
      setUsersResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(null);
    }
  };

  const checkConnections = async () => {
    setLoading('connections');
    setConnectionsResult(null);
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-deded1eb/diagnostic/connections`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      const data = await response.json();
      setConnectionsResult(data);
      console.log('Connections:', data);
    } catch (error) {
      console.error('Check connections error:', error);
      setConnectionsResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(null);
    }
  };

  const checkAll = async () => {
    await checkInvitations();
    await checkUsers();
    await checkConnections();
  };

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>🔍 Database Diagnostic</CardTitle>
          <CardDescription>
            Check what invitations, users, and connections exist in the database
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button 
              onClick={checkAll} 
              disabled={loading !== null}
              className="flex-1"
            >
              {loading !== null ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Check All
                </>
              )}
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button 
              onClick={checkInvitations} 
              disabled={loading !== null}
              variant="outline"
              size="sm"
            >
              {loading === 'invitations' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Mail className="mr-1 h-3 w-3" />
                  Invitations
                </>
              )}
            </Button>
            
            <Button 
              onClick={checkUsers} 
              disabled={loading !== null}
              variant="outline"
              size="sm"
            >
              {loading === 'users' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Users className="mr-1 h-3 w-3" />
                  Users
                </>
              )}
            </Button>
            
            <Button 
              onClick={checkConnections} 
              disabled={loading !== null}
              variant="outline"
              size="sm"
            >
              {loading === 'connections' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Link className="mr-1 h-3 w-3" />
                  Connections
                </>
              )}
            </Button>
          </div>

          {/* Invitations Result */}
          {invitationsResult && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span className="font-medium">Invitations ({invitationsResult.totalInvitations || 0})</span>
                </div>

                {invitationsResult.error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                    {invitationsResult.error}
                  </div>
                )}

                {invitationsResult.invitations && invitationsResult.invitations.length === 0 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
                    ⚠️ No invitations found in database. A Legacy Keeper needs to create one first.
                  </div>
                )}

                {invitationsResult.invitations && invitationsResult.invitations.map((inv) => (
                  <div key={inv.code} className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-lg">{inv.code}</span>
                      <Badge 
                        variant={inv.status === 'sent' ? 'default' : inv.status === 'accepted' ? 'secondary' : 'outline'}
                      >
                        {inv.status}
                      </Badge>
                    </div>
                    <div className="text-sm space-y-1">
                      <div><span className="font-medium">Teller:</span> {inv.tellerName} ({inv.tellerPhoneNumber})</div>
                      <div><span className="font-medium">Keeper ID:</span> {inv.keeperId.substring(0, 20)}...</div>
                      <div className="text-xs text-gray-500">
                        Sent: {new Date(inv.sentAt).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        Expires: {new Date(inv.expiresAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Users Result */}
          {usersResult && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span className="font-medium">Users ({usersResult.totalUsers || 0})</span>
                </div>

                {usersResult.error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                    {usersResult.error}
                  </div>
                )}

                {usersResult.users && usersResult.users.map((user) => (
                  <div key={user.id} className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{user.name}</span>
                      <Badge variant={user.type === 'keeper' ? 'default' : 'secondary'}>
                        {user.type}
                      </Badge>
                    </div>
                    <div className="text-sm space-y-1">
                      <div><span className="font-medium">Email:</span> {user.email}</div>
                      {user.phoneNumber !== 'Not specified' && (
                        <div><span className="font-medium">Phone:</span> {user.phoneNumber}</div>
                      )}
                      <div className="text-xs text-gray-500">
                        ID: {user.id.substring(0, 30)}...
                      </div>
                      <div className="text-xs text-gray-500">
                        Created: {new Date(user.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Connections Result */}
          {connectionsResult && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Link className="h-4 w-4" />
                  <span className="font-medium">Connections ({connectionsResult.totalConnections || 0})</span>
                </div>

                {connectionsResult.error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                    {connectionsResult.error}
                  </div>
                )}

                {connectionsResult.connections && connectionsResult.connections.length === 0 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
                    ℹ️ No connections found. Connections are created when a Storyteller accepts an invitation.
                  </div>
                )}

                {connectionsResult.connections && connectionsResult.connections.map((conn) => (
                  <div key={conn.id} className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="default">{conn.status}</Badge>
                      {conn.invitationCode && (
                        <span className="text-xs font-mono text-gray-600">
                          Code: {conn.invitationCode}
                        </span>
                      )}
                    </div>
                    <div className="text-sm space-y-1">
                      {conn.keeper ? (
                        <div>
                          <span className="font-medium">Keeper:</span> {conn.keeper.name} ({conn.keeper.email})
                        </div>
                      ) : (
                        <div className="text-red-600">Keeper: [DELETED]</div>
                      )}
                      {conn.teller ? (
                        <div>
                          <span className="font-medium">Teller:</span> {conn.teller.name} ({conn.teller.email})
                        </div>
                      ) : (
                        <div className="text-red-600">Teller: [DELETED]</div>
                      )}
                      <div className="text-xs text-gray-500">
                        Created: {new Date(conn.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Instructions */}
          {!invitationsResult && !usersResult && !connectionsResult && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
              <div className="font-medium text-blue-900">What This Does:</div>
              <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
                <li><strong>Invitations:</strong> Shows all invitation codes created by Keepers</li>
                <li><strong>Users:</strong> Shows all registered users (both Keepers and Tellers)</li>
                <li><strong>Connections:</strong> Shows active connections between Keepers and Tellers</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
