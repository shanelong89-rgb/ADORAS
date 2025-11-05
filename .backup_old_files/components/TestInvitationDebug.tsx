/**
 * Test Invitation Debug Component
 * 
 * Utility component to setup and check the TESTCODE invitation code
 * connecting shanelong@gmail.com to allison.tam@hotmail.com
 */

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { CheckCircle, XCircle, Loader2, RefreshCw, Users } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface SetupResult {
  success: boolean;
  invitation?: {
    id: string;
    code: string;
    keeperId: string;
    tellerName: string;
    status: string;
    expiresAt: string;
  };
  keeper?: {
    id: string;
    name: string;
    email: string;
    type: string;
  };
  message?: string;
  error?: string;
}

interface ConnectionResult {
  success: boolean;
  shane?: {
    id: string;
    name: string;
    email: string;
    type: string;
  };
  allison?: {
    id: string;
    name: string;
    email: string;
    type: string;
  } | null;
  connected: boolean;
  connection?: {
    id: string;
    status: string;
    invitationCode: string;
    createdAt: string;
  };
  error?: string;
}

export function TestInvitationDebug() {
  const [setupResult, setSetupResult] = useState<SetupResult | null>(null);
  const [connectionResult, setConnectionResult] = useState<ConnectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  const handleDeleteUser = async (email: string) => {
    if (!confirm(`Are you sure you want to completely delete ${email} and all their data?`)) {
      return;
    }

    setDeleting(true);
    setSetupResult(null);
    setConnectionResult(null);
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-deded1eb/test/delete-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ email }),
        }
      );

      const data = await response.json();
      console.log('Delete result:', data);
      
      if (data.success) {
        setSetupResult({
          success: true,
          message: `✅ User deleted successfully!\n- Name: ${data.deletedUser.name}\n- Email: ${data.deletedUser.email}\n- Connections: ${data.deletedCount.connections}\n- Invitations: ${data.deletedCount.invitations}\n- Memories: ${data.deletedCount.memories}`,
        });
      } else {
        setSetupResult({
          success: false,
          error: data.error,
        });
      }
    } catch (error) {
      console.error('Delete error:', error);
      setSetupResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleResetInvitation = async () => {
    setResetting(true);
    setSetupResult(null);
    setConnectionResult(null);
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-deded1eb/test/reset-invitation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      const data = await response.json();
      console.log('Reset result:', data);
      
      if (data.success) {
        setSetupResult({
          success: true,
          message: `✅ Reset successful! ${data.deletedConnections} connection(s) deleted. You can now setup the invitation again.`,
        });
      } else {
        setSetupResult({
          success: false,
          error: data.error,
        });
      }
    } catch (error) {
      console.error('Reset error:', error);
      setSetupResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setResetting(false);
    }
  };

  const handleCleanupAndFix = async () => {
    setCleaning(true);
    setSetupResult(null);
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-deded1eb/test/ensure-connected`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      const data = await response.json();
      setSetupResult(data);
      console.log('Setup result:', data);
    } catch (error) {
      console.error('Setup error:', error);
      setSetupResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setCleaning(false);
    }
  };

  const handleFullCleanup = async () => {
    if (!confirm('This will remove ALL connections for Shane and Allison, delete any test keeper users, and create a fresh direct connection. Continue?')) {
      return;
    }

    setCleaning(true);
    setSetupResult(null);
    setConnectionResult(null);
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-deded1eb/test/cleanup-connect-shane-allison`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      const data = await response.json();
      console.log('Cleanup result:', data);
      
      if (data.success) {
        setSetupResult({
          success: true,
          message: `✅ ${data.message}\n\n🔗 Connection ID: ${data.connection?.id}\n✨ Status: ${data.connection?.status}`,
        });
      } else {
        setSetupResult({
          success: false,
          error: data.error,
        });
      }
    } catch (error) {
      console.error('Cleanup error:', error);
      setSetupResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setCleaning(false);
    }
  };

  const handleCheckConnection = async () => {
    setLoading(true);
    setConnectionResult(null);
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-deded1eb/test/check-connection`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      const data = await response.json();
      setConnectionResult(data);
      console.log('Connection result:', data);
    } catch (error) {
      console.error('Check connection error:', error);
      setConnectionResult({
        success: false,
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Test Invitation Setup</CardTitle>
          <CardDescription>
            Setup and verify invitation code TESTCODE connecting Shane Long to Allison Tam
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Deep Cleanup Section - Most Important */}
          <div className="p-4 bg-gradient-to-r from-primary/20 to-primary/10 border-2 border-primary/30 rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-primary">🧹 Deep Clean & Connect</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Click this to completely clean up all connections and create a fresh, direct connection between Shane and Allison. This will:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Remove ALL existing connections for Shane and Allison</li>
              <li>Delete any "test keeper" users</li>
              <li>Create a brand new direct connection with status 'active'</li>
            </ul>
            <Button 
              onClick={handleFullCleanup} 
              disabled={cleaning}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold"
              size="lg"
            >
              {cleaning ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Cleaning & Connecting...
                </>
              ) : (
                <>
                  🧹 Deep Clean & Connect Shane → Allison
                </>
              )}
            </Button>
          </div>

          <Separator />

          {/* Setup Invitation Section */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Quick Actions</h4>
            <div className="flex gap-2">
              <Button 
                onClick={handleResetInvitation} 
                disabled={resetting}
                variant="outline"
                className="flex-1"
              >
                {resetting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reset Invitation
                  </>
                )}
              </Button>
              
              <Button 
                onClick={handleCleanupAndFix} 
                disabled={cleaning}
                className="flex-1"
              >
                {cleaning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Users className="mr-2 h-4 w-4" />
                    ✨ Ensure Connected
                  </>
                )}
              </Button>
              
              <Button 
                onClick={handleCheckConnection} 
                disabled={loading}
                variant="outline"
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <Users className="mr-2 h-4 w-4" />
                    Check Connection
                  </>
                )}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Setup Result */}
          {setupResult && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {setupResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span className="font-medium">
                  {setupResult.success ? 'Setup Successful' : 'Setup Failed'}
                </span>
              </div>

              {setupResult.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                  {setupResult.error}
                </div>
              )}

              {setupResult.message && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">
                  {setupResult.message}
                </div>
              )}

              {setupResult.keeper && (
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Keeper:</span>
                  </div>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{setupResult.keeper.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {setupResult.keeper.type}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600">{setupResult.keeper.email}</div>
                    <div className="text-xs text-gray-500">ID: {setupResult.keeper.id}</div>
                  </div>
                </div>
              )}

              {setupResult.invitation && (
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Invitation:</span>
                  </div>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-mono font-medium">
                        {setupResult.invitation.code}
                      </span>
                      <Badge 
                        variant={setupResult.invitation.status === 'sent' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {setupResult.invitation.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      Expected Teller: {setupResult.invitation.tellerName}
                    </div>
                    <div className="text-xs text-gray-500">
                      Expires: {new Date(setupResult.invitation.expiresAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Connection Result */}
          {connectionResult && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {connectionResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span className="font-medium">Connection Status</span>
                </div>

                {connectionResult.error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                    {connectionResult.error}
                  </div>
                )}

                {connectionResult.shane && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Shane Long</div>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{connectionResult.shane.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {connectionResult.shane.type}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600">{connectionResult.shane.email}</div>
                    </div>
                  </div>
                )}

                {connectionResult.allison ? (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Allison Tam</div>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{connectionResult.allison.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {connectionResult.allison.type}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600">{connectionResult.allison.email}</div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
                    ⚠️ Allison Tam has not signed up yet
                  </div>
                )}

                <div className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    {connectionResult.connected ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="font-medium text-green-600">Connected</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-orange-600" />
                        <span className="font-medium text-orange-600">Not Connected</span>
                      </>
                    )}
                  </div>

                  {connectionResult.connection && (
                    <div className="mt-2 space-y-1">
                      <div className="text-sm text-gray-600">
                        Invitation Code: {connectionResult.connection.invitationCode}
                      </div>
                      <div className="text-sm text-gray-600">
                        Status: <Badge variant="default" className="text-xs">
                          {connectionResult.connection.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500">
                        Created: {new Date(connectionResult.connection.createdAt).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Instructions */}
          {!setupResult && !connectionResult && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
              <div className="font-medium text-blue-900">Instructions:</div>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                <li>Click "🧹 Cleanup & Fix" to create the TESTCODE invitation</li>
                <li>Shane Long (shanelong@gmail.com) should already be signed up</li>
                <li>Allison Tam can now sign up as a Teller using this code</li>
                <li>Click "Check Connection" to verify the connection status</li>
              </ol>
              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                <strong>Note:</strong> First request may take 5-8 seconds due to server cold start. This is normal.
              </div>
            </div>
          )}

          <Separator />

          {/* Delete User Section */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Delete Users</div>
            <div className="flex gap-2">
              <Button 
                onClick={() => handleDeleteUser('shanelong@gmail.com')} 
                disabled={deleting}
                variant="destructive"
                className="flex-1"
              >
                {deleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Shane Long'
                )}
              </Button>
              
              <Button 
                onClick={() => handleDeleteUser('allison.tam@hotmail.com')} 
                disabled={deleting}
                variant="destructive"
                className="flex-1"
              >
                {deleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Allison Tam'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}