/**
 * Adoras Invitation & Connection Management
 * 
 * Handles SMS invitations, connection creation, and multi-user relationships
 */

import * as kv from './kv_store.tsx';
import {
  Invitation,
  Connection,
  ConnectionRequest,
  UserProfile,
  Keys,
  generateId,
  generateInvitationCode,
  Validators,
} from './database.tsx';

/**
 * Create and send SMS invitation
 * 
 * Note: Actual SMS sending requires Twilio API key
 * User must configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
 */
export async function createInvitation(params: {
  keeperId: string;
  tellerPhoneNumber: string;
  tellerName?: string;
  tellerBirthday?: string;
  tellerRelationship?: string;
  tellerBio?: string;
  tellerPhoto?: string;
  code?: string; // Optional: Use provided code or generate new one
}) {
  try {
    // Validate phone number
    if (!Validators.phoneNumber(params.tellerPhoneNumber)) {
      throw new Error('Invalid phone number format');
    }

    // Get keeper profile
    const keeper = await kv.get<UserProfile>(Keys.user(params.keeperId));
    if (!keeper) {
      throw new Error('Keeper not found');
    }

    // Use provided code or generate new one
    const code = params.code || generateInvitationCode();
    const invitationId = generateId();
    
    console.log('📝 Creating invitation with code:', code, 'for keeper:', keeper.name);

    // Create invitation with storyteller pre-fill data
    const invitation: Invitation = {
      id: invitationId,
      code,
      keeperId: params.keeperId,
      tellerPhoneNumber: params.tellerPhoneNumber,
      tellerName: params.tellerName,
      tellerBirthday: params.tellerBirthday,
      tellerRelationship: params.tellerRelationship,
      tellerBio: params.tellerBio,
      tellerPhoto: params.tellerPhoto,
      status: 'sent',
      sentAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    };

    // Store invitation
    await kv.set(Keys.invitation(code), invitation);

    // Add to keeper's invitations list
    const keeperInvitations = await kv.get<string[]>(Keys.userInvitations(params.keeperId)) || [];
    keeperInvitations.push(code);
    await kv.set(Keys.userInvitations(params.keeperId), keeperInvitations);

    console.log('✅ Invitation created and stored successfully');

    // Send SMS (if Twilio is configured) - Non-blocking, errors are acceptable
    let smsResult = { success: false, error: 'SMS not attempted' };
    try {
      smsResult = await sendInvitationSMS({
        phoneNumber: params.tellerPhoneNumber,
        code,
        keeperName: keeper.name,
      });
      
      if (smsResult.success) {
        console.log('✅ SMS sent successfully');
      } else {
        console.log('ℹ️ SMS not sent:', smsResult.error);
      }
    } catch (smsError) {
      console.log('ℹ️ SMS sending failed (non-critical):', smsError instanceof Error ? smsError.message : 'Unknown error');
      smsResult = {
        success: false,
        error: 'SMS sending failed - invitation still valid',
      };
    }

    return {
      success: true,
      invitation,
      smsSent: smsResult.success,
      smsError: smsResult.error,
    };
  } catch (error) {
    console.error('Error creating invitation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send SMS invitation using Twilio
 */
async function sendInvitationSMS(params: {
  phoneNumber: string;
  code: string;
  keeperName: string;
}) {
  try {
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const fromPhone = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!accountSid || !authToken || !fromPhone) {
      console.warn('⚠️ Twilio credentials not configured. SMS not sent. User can manually share the code:', params.code);
      return {
        success: false,
        error: 'SMS service not configured - share code manually',
      };
    }

    // Validate credentials format
    if (!accountSid.startsWith('AC') || accountSid.length !== 34) {
      console.warn('⚠️ Invalid Twilio Account SID format. Expected AC followed by 32 characters.');
      return {
        success: false,
        error: 'Invalid Twilio Account SID - share code manually',
      };
    }

    const message = `${params.keeperName} invited you to share memories on Adoras! 📸\n\nYour code: ${params.code}\n\nDownload: https://whole-works-409347.framer.app/`;

    // Twilio API call
    const auth = btoa(`${accountSid}:${authToken}`);
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: fromPhone,
          To: params.phoneNumber,
          Body: message,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorObj;
      try {
        errorObj = JSON.parse(errorText);
      } catch {
        errorObj = { message: errorText };
      }
      
      // Log detailed error but return user-friendly message
      console.error('❌ Twilio API error:', errorObj);
      
      if (errorObj.code === 20003) {
        console.error('💡 Twilio Authentication Error: Please verify your TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in Supabase environment variables.');
        return {
          success: false,
          error: 'SMS service authentication failed - share code manually',
        };
      }
      
      return {
        success: false,
        error: `SMS service error (${errorObj.code || 'unknown'}) - share code manually`,
      };
    }

    const result = await response.json();
    console.log('✅ SMS sent successfully to', params.phoneNumber, 'with message ID:', result.sid);

    return {
      success: true,
      messageId: result.sid,
    };
  } catch (error) {
    console.error('❌ Error sending SMS:', error);
    return {
      success: false,
      error: 'SMS service unavailable - share code manually',
    };
  }
}

/**
 * Verify invitation code
 */
export async function verifyInvitationCode(code: string) {
  try {
    console.log('🔍 Verifying invitation code:', code);

    if (!Validators.invitationCode(code)) {
      console.error('❌ Invalid invitation code format:', code);
      throw new Error('Invalid invitation code format');
    }

    console.log('✅ Code format valid');

    const kvKey = Keys.invitation(code);
    console.log('🔑 Looking up KV key:', kvKey);

    const invitation = await kv.get<Invitation>(kvKey);

    if (!invitation) {
      console.error('❌ Invitation not found in KV store for code:', code);
      console.log('💡 Tip: Make sure an invitation was created first by a Keeper');
      
      // Debug: List all invitation keys
      try {
        const allInvitations = await kv.getByPrefix<Invitation>(Keys.prefixes.invitations);
        console.log('📋 Total invitations in database:', allInvitations.length);
        if (allInvitations.length > 0) {
          console.log('📋 Available invitation codes:', allInvitations.map(inv => inv.code).join(', '));
        } else {
          console.log('📋 No invitations in database. A keeper needs to create one first.');
        }
      } catch (debugError) {
        console.error('Debug error listing invitations:', debugError);
      }

      // SPECIAL HANDLING: Auto-create test invitation for TESTCODE
      // ⚠️ DEVELOPMENT/TESTING ONLY: Auto-create test invitation for TESTCODE
      // This code should NOT appear in production. Real invitations use unique codes.
      if (code === 'TESTCODE') {
        console.log('🧪 TEST MODE: Auto-creating TESTCODE invitation...');
        
        // Find Shane Long's user profile
        const allUsers = await kv.getByPrefix<UserProfile>(Keys.prefixes.users);
        const shaneProfile = allUsers.find(u => u.email === 'shanelong@gmail.com');
        
        if (!shaneProfile) {
          throw new Error('Cannot create test invitation: Shane Long (shanelong@gmail.com) not found. Please sign up first.');
        }
        
        console.log('✅ Found Shane Long, creating test invitation');
        
        // Create test invitation
        const testInvitation: Invitation = {
          id: generateId(),
          code: code,
          keeperId: shaneProfile.id,
          tellerPhoneNumber: '+1234567890',
          tellerName: 'Allison Tam',
          status: 'sent',
          sentAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
        };
        
        await kv.set(Keys.invitation(code), testInvitation);
        
        // Add to Shane's invitations list
        const shaneInvitations = await kv.get<string[]>(Keys.userInvitations(shaneProfile.id)) || [];
        if (!shaneInvitations.includes(code)) {
          shaneInvitations.push(code);
          await kv.set(Keys.userInvitations(shaneProfile.id), shaneInvitations);
        }
        
        console.log('✅ Test invitation TESTCODE created successfully');
        
        return {
          success: true,
          invitation: testInvitation,
          keeper: shaneProfile,
          autoCreated: true,
        };
      }

      throw new Error('Invitation code not found');
    }

    console.log('✅ Invitation found:', {
      id: invitation.id,
      code: invitation.code,
      keeperId: invitation.keeperId,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
    });

    // Check if expired
    if (new Date(invitation.expiresAt) < new Date()) {
      console.error('❌ Invitation expired:', invitation.expiresAt);
      return {
        success: false,
        error: 'Invitation code has expired',
      };
    }

    // SPECIAL HANDLING: Auto-reset test invitation TESTCODE if already accepted
    if (invitation.status === 'accepted' && code === 'TESTCODE') {
      console.log('🧪 TEST MODE: TESTCODE already accepted, auto-resetting...');
      
      // Import the reset function (we'll need to create a helper)
      const allUsers = await kv.getByPrefix<UserProfile>(Keys.prefixes.users);
      const shaneProfile = allUsers.find(u => u.email === 'shanelong@gmail.com');
      const allisonProfile = allUsers.find(u => u.email === 'allison.tam@hotmail.com');
      
      // Delete existing connections
      if (shaneProfile) {
        const shaneConnections = await kv.get<string[]>(Keys.userConnections(shaneProfile.id)) || [];
        for (const connId of shaneConnections) {
          const conn = await kv.get<Connection>(Keys.connection(connId));
          if (conn && conn.invitationCode === code) {
            await kv.del(Keys.connection(connId));
            await kv.del(Keys.connectionMemories(connId));
          }
        }
        const updatedShaneConnections = [];
        for (const connId of shaneConnections) {
          const conn = await kv.get<Connection>(Keys.connection(connId));
          if (conn) updatedShaneConnections.push(connId);
        }
        await kv.set(Keys.userConnections(shaneProfile.id), updatedShaneConnections);
      }
      
      if (allisonProfile) {
        const allisonConnections = await kv.get<string[]>(Keys.userConnections(allisonProfile.id)) || [];
        for (const connId of allisonConnections) {
          const conn = await kv.get<Connection>(Keys.connection(connId));
          if (conn && conn.invitationCode === code) {
            await kv.del(Keys.connection(connId));
            await kv.del(Keys.connectionMemories(connId));
          }
        }
        const updatedAllisonConnections = [];
        for (const connId of allisonConnections) {
          const conn = await kv.get<Connection>(Keys.connection(connId));
          if (conn) updatedAllisonConnections.push(connId);
        }
        await kv.set(Keys.userConnections(allisonProfile.id), updatedAllisonConnections);
      }
      
      // Reset invitation status
      invitation.status = 'sent';
      delete invitation.acceptedAt;
      await kv.set(Keys.invitation(code), invitation);
      
      console.log('✅ Test invitation reset successfully, now status:', invitation.status);
      
      // Get keeper info
      const keeper = await kv.get<UserProfile>(Keys.user(invitation.keeperId));
      
      return {
        success: true,
        invitation,
        keeper,
        autoReset: true,
      };
    }

    // Check if already accepted (for non-test invitations)
    if (invitation.status === 'accepted') {
      console.error('❌ Invitation already accepted');
      return {
        success: false,
        error: 'Invitation code has already been used',
      };
    }

    console.log('✅ Invitation is valid, fetching keeper profile');

    // Get keeper info
    const keeper = await kv.get<UserProfile>(Keys.user(invitation.keeperId));

    if (!keeper) {
      console.error('❌ Keeper profile not found for ID:', invitation.keeperId);
    } else {
      console.log('✅ Keeper found:', keeper.name);
    }

    return {
      success: true,
      invitation,
      keeper,
    };
  } catch (error) {
    console.error('❌ Error verifying invitation code:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Accept invitation and create connection
 */
export async function acceptInvitation(params: {
  code: string;
  tellerId: string;
}) {
  try {
    // Verify invitation
    const verifyResult = await verifyInvitationCode(params.code);
    if (!verifyResult.success || !verifyResult.invitation) {
      throw new Error(verifyResult.error || 'Invalid invitation');
    }

    const invitation = verifyResult.invitation;

    // Create connection
    const connectionId = generateId();
    const connection: Connection = {
      id: connectionId,
      keeperId: invitation.keeperId,
      tellerId: params.tellerId,
      status: 'active',
      invitationCode: params.code,
      createdAt: new Date().toISOString(),
      acceptedAt: new Date().toISOString(),
    };

    // Store connection
    await kv.set(Keys.connection(connectionId), connection);

    // Update invitation status
    invitation.status = 'accepted';
    invitation.acceptedAt = new Date().toISOString();
    await kv.set(Keys.invitation(params.code), invitation);

    // Add connection to both users' connection lists
    const keeperConnections = await kv.get<string[]>(Keys.userConnections(invitation.keeperId)) || [];
    keeperConnections.push(connectionId);
    await kv.set(Keys.userConnections(invitation.keeperId), keeperConnections);

    const tellerConnections = await kv.get<string[]>(Keys.userConnections(params.tellerId)) || [];
    tellerConnections.push(connectionId);
    await kv.set(Keys.userConnections(params.tellerId), tellerConnections);

    // Initialize empty memories list for connection
    await kv.set(Keys.connectionMemories(connectionId), []);

    return {
      success: true,
      connection,
    };
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get user's connections
 */
export async function getUserConnections(userId: string) {
  try {
    const connectionIds = await kv.get<string[]>(Keys.userConnections(userId)) || [];

    console.log(`📋 Found ${connectionIds.length} connection IDs for user ${userId}`);

    // Fetch all connections
    const connectionsData = await Promise.all(
      connectionIds.map(async (id) => ({
        id,
        connection: await kv.get<Connection>(Keys.connection(id))
      }))
    );

    console.log(`📋 Fetched ${connectionsData.length} connections, filtering out null values...`);

    // Filter out null/undefined connections and validate they have required properties
    const validConnections: Connection[] = [];
    const invalidConnectionIds: string[] = [];

    for (const data of connectionsData) {
      if (!data.connection) {
        console.warn(`⚠️ Connection not found for ID: ${data.id}, marking for cleanup`);
        invalidConnectionIds.push(data.id);
        continue;
      }
      if (!data.connection.keeperId || !data.connection.tellerId) {
        console.warn('⚠️ Found connection missing keeperId or tellerId:', data.connection);
        invalidConnectionIds.push(data.id);
        continue;
      }
      validConnections.push(data.connection);
    }

    // Clean up orphaned connection IDs if any found
    if (invalidConnectionIds.length > 0) {
      console.log(`🧹 Cleaning up ${invalidConnectionIds.length} orphaned connection IDs`);
      const updatedConnectionIds = connectionIds.filter(id => !invalidConnectionIds.includes(id));
      await kv.set(Keys.userConnections(userId), updatedConnectionIds);
    }

    console.log(`✅ Found ${validConnections.length} valid connections`);

    // Get partner profiles
    const connectionsWithProfiles = await Promise.all(
      validConnections.map(async (connection) => {
        try {
          const partnerId = connection.keeperId === userId 
            ? connection.tellerId 
            : connection.keeperId;
          
          const partner = await kv.get<UserProfile>(Keys.user(partnerId));
          
          if (!partner) {
            console.warn(`⚠️ Partner profile not found for ID: ${partnerId}`);
          }
          
          return {
            connection,
            partner,
          };
        } catch (error) {
          console.error('Error fetching partner profile for connection:', connection.id, error);
          return {
            connection,
            partner: null,
          };
        }
      })
    );

    return {
      success: true,
      connections: connectionsWithProfiles,
    };
  } catch (error) {
    console.error('Error getting user connections:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get user's pending invitations
 */
export async function getUserInvitations(userId: string) {
  try {
    const invitationCodes = await kv.get<string[]>(Keys.userInvitations(userId)) || [];

    // Fetch all invitations
    const invitations = await Promise.all(
      invitationCodes.map(code => kv.get<Invitation>(Keys.invitation(code)))
    );

    // Filter out null invitations
    const validInvitations = invitations.filter((inv): inv is Invitation => inv !== null);

    return {
      success: true,
      invitations: validInvitations,
    };
  } catch (error) {
    console.error('Error getting user invitations:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete/cancel an invitation
 * Only works for 'sent' invitations
 */
export async function deleteInvitation(params: {
  userId: string;
  code: string;
}) {
  try {
    console.log('🗑️ Deleting invitation:', params.code);

    // Get invitation
    const invitation = await kv.get<Invitation>(Keys.invitation(params.code));
    
    if (!invitation) {
      return {
        success: false,
        error: 'Invitation not found',
      };
    }

    // Verify ownership
    if (invitation.keeperId !== params.userId) {
      return {
        success: false,
        error: 'Unauthorized: You can only delete your own invitations',
      };
    }

    // Only allow deleting sent or expired invitations, not accepted ones
    if (invitation.status === 'accepted') {
      return {
        success: false,
        error: 'Cannot delete accepted invitations. The connection is already established.',
      };
    }

    // Delete invitation
    await kv.del(Keys.invitation(params.code));

    // Remove from keeper's invitation list
    const keeperInvitations = await kv.get<string[]>(Keys.userInvitations(params.userId)) || [];
    const updatedInvitations = keeperInvitations.filter(c => c !== params.code);
    await kv.set(Keys.userInvitations(params.userId), updatedInvitations);

    console.log('✅ Invitation deleted successfully');

    return {
      success: true,
      message: 'Invitation deleted successfully',
    };
  } catch (error) {
    console.error('Error deleting invitation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Connect with existing user via email
 * Creates a direct connection without requiring invitation codes
 */
export async function connectViaEmail(params: {
  requesterId: string;
  partnerEmail: string;
}) {
  try {
    console.log('📧 Connecting users via email:', params.partnerEmail);

    // Validate email
    if (!params.partnerEmail.includes('@')) {
      throw new Error('Invalid email address');
    }

    // Get requester profile
    const requester = await kv.get<UserProfile>(Keys.user(params.requesterId));
    if (!requester) {
      throw new Error('Requester not found');
    }

    // Find partner by email
    const allUsers = await kv.getByPrefix<UserProfile>(Keys.prefixes.users);
    const partner = allUsers.find(u => u.email.toLowerCase() === params.partnerEmail.toLowerCase());

    if (!partner) {
      console.error('❌ User not found with email:', params.partnerEmail);
      return {
        success: false,
        error: 'No Adoras user found with this email address. Please check the email or invite them to join.',
      };
    }

    // Check if they're the same user
    if (partner.id === params.requesterId) {
      return {
        success: false,
        error: 'You cannot connect with yourself.',
      };
    }

    // Check if connection already exists
    const existingConnections = await getUserConnections(params.requesterId);
    if (existingConnections.success && existingConnections.connections) {
      const alreadyConnected = existingConnections.connections.some(
        conn => conn.partner?.id === partner.id
      );
      
      if (alreadyConnected) {
        return {
          success: false,
          error: `You are already connected with ${partner.name}.`,
        };
      }
    }

    console.log('✅ Found partner:', partner.name, partner.email);

    // Check if there's already a pending connection request between these users
    const requesterConnectionRequests = await kv.get<string[]>(Keys.userConnectionRequests(params.requesterId)) || [];
    const partnerConnectionRequests = await kv.get<string[]>(Keys.userConnectionRequests(partner.id)) || [];
    
    // Check if request already exists in either direction
    for (const requestId of [...requesterConnectionRequests, ...partnerConnectionRequests]) {
      const existingRequest = await kv.get<ConnectionRequest>(Keys.connectionRequest(requestId));
      if (existingRequest && 
          ((existingRequest.requesterId === params.requesterId && existingRequest.recipientId === partner.id) ||
           (existingRequest.requesterId === partner.id && existingRequest.recipientId === params.requesterId))) {
        if (existingRequest.status === 'pending') {
          return {
            success: false,
            error: existingRequest.requesterId === params.requesterId 
              ? `You already sent a connection request to ${partner.name}.`
              : `${partner.name} already sent you a connection request. Please check your notifications.`,
          };
        }
      }
    }

    // Create connection request (requires recipient to accept)
    const requestId = generateId();
    const connectionRequest: ConnectionRequest = {
      id: requestId,
      requesterId: params.requesterId,
      requesterName: requester.name,
      requesterEmail: requester.email,
      requesterPhoto: requester.photo,
      recipientId: partner.id,
      recipientName: partner.name,
      recipientEmail: partner.email,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    // Store connection request
    await kv.set(Keys.connectionRequest(requestId), connectionRequest);

    // Add request to both users' request lists
    requesterConnectionRequests.push(requestId);
    await kv.set(Keys.userConnectionRequests(params.requesterId), requesterConnectionRequests);

    partnerConnectionRequests.push(requestId);
    await kv.set(Keys.userConnectionRequests(partner.id), partnerConnectionRequests);

    console.log('✅ Connection request sent successfully via email');

    return {
      success: true,
      connectionRequest,
      partner,
      message: `Connection request sent to ${partner.name}!`,
    };
  } catch (error) {
    console.error('Error connecting via email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get user's connection requests (both sent and received)
 */
export async function getConnectionRequests(userId: string) {
  try {
    const requestIds = await kv.get<string[]>(Keys.userConnectionRequests(userId)) || [];
    
    // Fetch all connection requests
    const requests = await Promise.all(
      requestIds.map(id => kv.get<ConnectionRequest>(Keys.connectionRequest(id)))
    );
    
    // Filter out null/undefined and separate into sent and received
    const validRequests = requests.filter(r => r !== null && r !== undefined) as ConnectionRequest[];
    
    const sentRequests = validRequests.filter(r => r.requesterId === userId);
    const receivedRequests = validRequests.filter(r => r.recipientId === userId);
    
    return {
      success: true,
      sentRequests,
      receivedRequests,
    };
  } catch (error) {
    console.error('Error getting connection requests:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Accept a connection request
 */
export async function acceptConnectionRequest(params: {
  userId: string;
  requestId: string;
}) {
  try {
    console.log('✅ Accepting connection request:', params.requestId);

    // Get the connection request
    const request = await kv.get<ConnectionRequest>(Keys.connectionRequest(params.requestId));
    
    if (!request) {
      return {
        success: false,
        error: 'Connection request not found',
      };
    }

    // Verify the user is the recipient
    if (request.recipientId !== params.userId) {
      return {
        success: false,
        error: 'Unauthorized: You can only accept requests sent to you',
      };
    }

    // Check if already responded
    if (request.status !== 'pending') {
      return {
        success: false,
        error: `This request has already been ${request.status}`,
      };
    }

    // Update request status
    request.status = 'accepted';
    request.respondedAt = new Date().toISOString();
    await kv.set(Keys.connectionRequest(params.requestId), request);

    // Create the actual connection
    const connectionId = generateId();
    const connection: Connection = {
      id: connectionId,
      keeperId: request.requesterId,
      tellerId: request.recipientId,
      status: 'active',
      invitationCode: `EMAIL-${Date.now()}`, // Dummy code for email connections
      createdAt: request.createdAt,
      acceptedAt: new Date().toISOString(),
    };

    // Store connection
    await kv.set(Keys.connection(connectionId), connection);

    // Add connection to both users' connection lists
    const requesterConnections = await kv.get<string[]>(Keys.userConnections(request.requesterId)) || [];
    requesterConnections.push(connectionId);
    await kv.set(Keys.userConnections(request.requesterId), requesterConnections);

    const recipientConnections = await kv.get<string[]>(Keys.userConnections(request.recipientId)) || [];
    recipientConnections.push(connectionId);
    await kv.set(Keys.userConnections(request.recipientId), recipientConnections);

    // Initialize empty memories list for connection
    await kv.set(Keys.connectionMemories(connectionId), []);

    // Get requester profile
    const requester = await kv.get<UserProfile>(Keys.user(request.requesterId));

    console.log('✅ Connection request accepted successfully');

    return {
      success: true,
      connection,
      partner: requester,
      message: `You are now connected with ${request.requesterName}!`,
    };
  } catch (error) {
    console.error('Error accepting connection request:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Decline a connection request
 */
export async function declineConnectionRequest(params: {
  userId: string;
  requestId: string;
}) {
  try {
    console.log('❌ Declining connection request:', params.requestId);

    // Get the connection request
    const request = await kv.get<ConnectionRequest>(Keys.connectionRequest(params.requestId));
    
    if (!request) {
      return {
        success: false,
        error: 'Connection request not found',
      };
    }

    // Verify the user is the recipient
    if (request.recipientId !== params.userId) {
      return {
        success: false,
        error: 'Unauthorized: You can only decline requests sent to you',
      };
    }

    // Check if already responded
    if (request.status !== 'pending') {
      return {
        success: false,
        error: `This request has already been ${request.status}`,
      };
    }

    // Update request status
    request.status = 'declined';
    request.respondedAt = new Date().toISOString();
    await kv.set(Keys.connectionRequest(params.requestId), request);

    console.log('✅ Connection request declined');

    return {
      success: true,
      message: 'Connection request declined',
    };
  } catch (error) {
    console.error('Error declining connection request:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Disconnect from a connection
 * Optionally delete all shared memories
 */
export async function disconnectConnection(params: {
  userId: string;
  connectionId: string;
  deleteMemories?: boolean;
}) {
  try {
    console.log('🔌 Disconnecting connection:', params.connectionId);

    // Get the connection
    const connection = await kv.get<Connection>(Keys.connection(params.connectionId));
    
    if (!connection) {
      return {
        success: false,
        error: 'Connection not found',
      };
    }

    // Verify the user is part of this connection
    if (connection.keeperId !== params.userId && connection.tellerId !== params.userId) {
      return {
        success: false,
        error: 'Unauthorized: You are not part of this connection',
      };
    }

    // Check if already disconnected
    if (connection.status === 'disconnected') {
      return {
        success: false,
        error: 'Connection is already disconnected',
      };
    }

    // Get partner info before disconnecting
    const partnerId = connection.keeperId === params.userId ? connection.tellerId : connection.keeperId;
    const partner = await kv.get<UserProfile>(Keys.user(partnerId));

    // Update connection status
    connection.status = 'disconnected';
    connection.disconnectedAt = new Date().toISOString();
    connection.disconnectedBy = params.userId;
    await kv.set(Keys.connection(params.connectionId), connection);

    // Remove connection from both users' connection lists
    const userConnections = await kv.get<string[]>(Keys.userConnections(params.userId)) || [];
    const updatedUserConnections = userConnections.filter(id => id !== params.connectionId);
    await kv.set(Keys.userConnections(params.userId), updatedUserConnections);

    const partnerConnections = await kv.get<string[]>(Keys.userConnections(partnerId)) || [];
    const updatedPartnerConnections = partnerConnections.filter(id => id !== params.connectionId);
    await kv.set(Keys.userConnections(partnerId), updatedPartnerConnections);

    // Optionally delete memories
    let deletedMemoriesCount = 0;
    if (params.deleteMemories) {
      const memoryIds = await kv.get<string[]>(Keys.connectionMemories(params.connectionId)) || [];
      
      // Delete each memory
      for (const memoryId of memoryIds) {
        await kv.del(Keys.memory(memoryId));
        deletedMemoriesCount++;
      }
      
      // Clear the memory list
      await kv.set(Keys.connectionMemories(params.connectionId), []);
      
      console.log(`🗑️ Deleted ${deletedMemoriesCount} memories`);
    }

    console.log('✅ Connection disconnected successfully');

    return {
      success: true,
      message: params.deleteMemories 
        ? `Disconnected from ${partner?.name || 'partner'} and deleted ${deletedMemoriesCount} shared memories`
        : `Disconnected from ${partner?.name || 'partner'}`,
      deletedMemoriesCount,
    };
  } catch (error) {
    console.error('Error disconnecting connection:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}