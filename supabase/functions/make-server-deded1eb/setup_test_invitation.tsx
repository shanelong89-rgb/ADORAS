import * as kv from './kv_store.ts';
import { Keys, UserProfile, Invitation, Connection, generateId, Validators } from './database.ts';

/**
 * Ensure Shane and Allison are connected for testing
 * Creates users if they don't exist, creates connection
 */
export async function ensureTestUsersConnected() {
  try {
    console.log('🔧 Ensuring Shane Long and Allison Tam are connected...');

    // Step 1: Ensure Shane Long exists as Keeper
    console.log('\n📋 Step 1: Checking Shane Long...');
    let allUsers = await kv.getByPrefix<UserProfile>(Keys.prefixes.users);
    let shaneProfile = allUsers.find(u => u.email === 'shanelong@gmail.com');
    
    if (!shaneProfile) {
      console.log('Creating Shane Long as Legacy Keeper...');
      shaneProfile = {
        id: generateId(),
        email: 'shanelong@gmail.com',
        name: 'Shane Long',
        type: 'keeper',
        phoneNumber: '+11234567890',
        birthday: '1975-06-15',
        avatar: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await kv.set(Keys.user(shaneProfile.id), shaneProfile);
      console.log('✅ Shane Long created:', shaneProfile.id);
    } else {
      console.log('✅ Shane Long exists:', shaneProfile.id);
    }

    // Step 2: Ensure Allison Tam exists as Teller
    console.log('\n Step 2: Checking Allison Tam...');
    allUsers = await kv.getByPrefix<UserProfile>(Keys.prefixes.users);
    let allisonProfile = allUsers.find(u => u.email === 'allison.tam@hotmail.com');
    
    if (!allisonProfile) {
      console.log('Creating Allison Tam as Storyteller...');
      allisonProfile = {
        id: generateId(),
        email: 'allison.tam@hotmail.com',
        name: 'Allison Tam',
        type: 'teller',
        phoneNumber: '+11234567891',
        birthday: '1948-03-22',
        avatar: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await kv.set(Keys.user(allisonProfile.id), allisonProfile);
      console.log('✅ Allison Tam created:', allisonProfile.id);
    } else {
      console.log('✅ Allison Tam exists:', allisonProfile.id);
    }

    // Step 3: Ensure TESTCODE invitation exists
    console.log('\n📋 Step 3: Checking TESTCODE invitation...');
    const invitationCode = 'TESTCODE';
    let invitation = await kv.get<Invitation>(Keys.invitation(invitationCode));
    
    if (!invitation) {
      console.log('Creating TESTCODE invitation...');
      invitation = {
        id: generateId(),
        code: invitationCode,
        keeperId: shaneProfile.id,
        tellerPhoneNumber: allisonProfile.phoneNumber,
        tellerName: allisonProfile.name,
        status: 'sent',
        sentAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
      };
      await kv.set(Keys.invitation(invitationCode), invitation);
      
      // Add to Shane's invitations
      const shaneInvitations = await kv.get<string[]>(Keys.userInvitations(shaneProfile.id)) || [];
      if (!shaneInvitations.includes(invitationCode)) {
        shaneInvitations.push(invitationCode);
        await kv.set(Keys.userInvitations(shaneProfile.id), shaneInvitations);
      }
      
      console.log('✅ TESTCODE invitation created');
    } else {
      console.log('✅ TESTCODE invitation exists');
    }

    // Step 4: Ensure connection exists
    console.log('\n📋 Step 4: Checking connection...');
    const shaneConnections = await kv.get<string[]>(Keys.userConnections(shaneProfile.id)) || [];
    const allisonConnections = await kv.get<string[]>(Keys.userConnections(allisonProfile.id)) || [];
    
    // Check if they already have a connection
    let existingConnection: Connection | null = null;
    for (const connId of shaneConnections) {
      const conn = await kv.get<Connection>(Keys.connection(connId));
      if (conn && (conn.keeperId === shaneProfile.id && conn.tellerId === allisonProfile.id)) {
        existingConnection = conn;
        break;
      }
    }
    
    if (!existingConnection) {
      console.log('Creating connection between Shane and Allison...');
      
      const connectionId = generateId();
      const connection: Connection = {
        id: connectionId,
        keeperId: shaneProfile.id,
        tellerId: allisonProfile.id,
        invitationCode: invitationCode,
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      
      await kv.set(Keys.connection(connectionId), connection);
      
      // Update Shane's connections
      if (!shaneConnections.includes(connectionId)) {
        shaneConnections.push(connectionId);
        await kv.set(Keys.userConnections(shaneProfile.id), shaneConnections);
      }
      
      // Update Allison's connections
      if (!allisonConnections.includes(connectionId)) {
        allisonConnections.push(connectionId);
        await kv.set(Keys.userConnections(allisonProfile.id), allisonConnections);
      }
      
      // Mark invitation as accepted
      invitation.status = 'accepted';
      invitation.acceptedAt = new Date().toISOString();
      invitation.tellerId = allisonProfile.id;
      await kv.set(Keys.invitation(invitationCode), invitation);
      
      console.log('✅ Connection created:', connectionId);
    } else {
      console.log('✅ Connection already exists:', existingConnection.id);
      
      // Ensure existing connection is active
      if (existingConnection.status !== 'active') {
        console.log('   ⚠️ Connection was not active, updating to active...');
        existingConnection.status = 'active';
        await kv.set(Keys.connection(existingConnection.id), existingConnection);
        console.log('   ✅ Connection status updated to active');
      }
    }

    console.log('\n🎉 Setup complete!');
    console.log('📝 Summary:');
    console.log(`   - Shane Long: ${shaneProfile.name} (${shaneProfile.email})`);
    console.log(`   - Allison Tam: ${allisonProfile.name} (${allisonProfile.email})`);
    console.log(`   - Invitation Code: ${invitationCode}`);
    console.log(`   - Status: Connected and ready for testing`);

    return {
      success: true,
      shane: shaneProfile,
      allison: allisonProfile,
      invitation,
      connection: existingConnection || await kv.get<Connection>(Keys.connection(shaneConnections[shaneConnections.length - 1])),
    };
  } catch (error) {
    console.error('❌ Error ensuring test users connected:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Clean up and properly connect Shane and Allison
 * Removes any test keeper or incorrect connections from Allison
 * Creates a direct, clean connection between Shane (keeper) and Allison (teller)
 */
export async function cleanUpAndConnectShaneAllison() {
  try {
    console.log('🧹 Starting comprehensive cleanup and connection setup...');
    console.log('='.repeat(80));

    // Step 1: Find Shane and Allison
    console.log('\n📋 Step 1: Finding user profiles...');
    const allUsers = await kv.getByPrefix<UserProfile>(Keys.prefixes.users);
    const shaneProfile = allUsers.find(u => u.email === 'shanelong@gmail.com');
    const allisonProfile = allUsers.find(u => u.email === 'allison.tam@hotmail.com');

    if (!shaneProfile || !allisonProfile) {
      console.error('❌ Required users not found!');
      return {
        success: false,
        error: `Missing users: Shane=${!!shaneProfile}, Allison=${!!allisonProfile}`,
      };
    }

    console.log(`✅ Found Shane: ${shaneProfile.name} (${shaneProfile.id})`);
    console.log(`✅ Found Allison: ${allisonProfile.name} (${allisonProfile.id})`);

    // Step 2: Clean up Allison's connections - Remove ALL connections
    console.log('\n🧹 Step 2: Cleaning up Allison\'s connections...');
    const allisonConnections = await kv.get<string[]>(Keys.userConnections(allisonProfile.id)) || [];
    console.log(`   Found ${allisonConnections.length} connection(s) for Allison`);

    for (const connId of allisonConnections) {
      const conn = await kv.get<Connection>(Keys.connection(connId));
      if (conn) {
        console.log(`   🗑️  Removing connection ${connId}: keeper=${conn.keeperId}, teller=${conn.tellerId}`);
        
        // Remove from keeper's connections list
        const keeperConnections = await kv.get<string[]>(Keys.userConnections(conn.keeperId)) || [];
        const updatedKeeperConnections = keeperConnections.filter(id => id !== connId);
        await kv.set(Keys.userConnections(conn.keeperId), updatedKeeperConnections);
        
        // Delete the connection
        await kv.del(Keys.connection(connId));
        console.log(`   ✅ Connection ${connId} deleted`);
      }
    }

    // Clear Allison's connections array
    await kv.set(Keys.userConnections(allisonProfile.id), []);
    console.log('   ✅ Allison\'s connections cleared');

    // Step 3: Clean up Shane's connections - Remove ALL connections
    console.log('\n🧹 Step 3: Cleaning up Shane\'s connections...');
    const shaneConnections = await kv.get<string[]>(Keys.userConnections(shaneProfile.id)) || [];
    console.log(`   Found ${shaneConnections.length} connection(s) for Shane`);

    for (const connId of shaneConnections) {
      const conn = await kv.get<Connection>(Keys.connection(connId));
      if (conn) {
        console.log(`   🗑️  Removing connection ${connId}: keeper=${conn.keeperId}, teller=${conn.tellerId}`);
        
        // Remove from teller's connections list (if not already removed)
        const tellerConnections = await kv.get<string[]>(Keys.userConnections(conn.tellerId)) || [];
        const updatedTellerConnections = tellerConnections.filter(id => id !== connId);
        await kv.set(Keys.userConnections(conn.tellerId), updatedTellerConnections);
        
        // Delete the connection
        await kv.del(Keys.connection(connId));
        console.log(`   ✅ Connection ${connId} deleted`);
      }
    }

    // Clear Shane's connections array
    await kv.set(Keys.userConnections(shaneProfile.id), []);
    console.log('   ✅ Shane\'s connections cleared');

    // Step 4: Remove any test keeper users
    console.log('\n🧹 Step 4: Removing test keeper users...');
    const testKeeperUsers = allUsers.filter(u => 
      u.email && u.email.toLowerCase().includes('testkeeper') ||
      u.name && u.name.toLowerCase().includes('test keeper') ||
      u.name && u.name.toLowerCase().includes('testkeeper')
    );
    
    for (const testUser of testKeeperUsers) {
      console.log(`   🗑️  Removing test user: ${testUser.name} (${testUser.email})`);
      await kv.del(Keys.user(testUser.id));
      await kv.del(Keys.userConnections(testUser.id));
      await kv.del(Keys.userInvitations(testUser.id));
      console.log(`   ✅ Test user ${testUser.name} deleted`);
    }

    // Step 5: Ensure TESTCODE invitation exists and is configured correctly
    console.log('\n📋 Step 5: Setting up TESTCODE invitation...');
    const invitationCode = 'TESTCODE';
    let invitation = await kv.get<Invitation>(Keys.invitation(invitationCode));
    
    if (!invitation) {
      console.log('   Creating new TESTCODE invitation...');
      invitation = {
        id: generateId(),
        code: invitationCode,
        keeperId: shaneProfile.id,
        tellerPhoneNumber: allisonProfile.phoneNumber,
        tellerName: allisonProfile.name,
        status: 'accepted',
        tellerId: allisonProfile.id,
        sentAt: new Date().toISOString(),
        acceptedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      };
      await kv.set(Keys.invitation(invitationCode), invitation);
      console.log('   ✅ TESTCODE invitation created');
    } else {
      console.log('   Updating existing TESTCODE invitation...');
      invitation.keeperId = shaneProfile.id;
      invitation.tellerId = allisonProfile.id;
      invitation.tellerPhoneNumber = allisonProfile.phoneNumber;
      invitation.tellerName = allisonProfile.name;
      invitation.status = 'accepted';
      invitation.acceptedAt = invitation.acceptedAt || new Date().toISOString();
      await kv.set(Keys.invitation(invitationCode), invitation);
      console.log('   ✅ TESTCODE invitation updated');
    }

    // Add to Shane's invitations
    const shaneInvitations = await kv.get<string[]>(Keys.userInvitations(shaneProfile.id)) || [];
    if (!shaneInvitations.includes(invitationCode)) {
      shaneInvitations.push(invitationCode);
      await kv.set(Keys.userInvitations(shaneProfile.id), shaneInvitations);
      console.log('   ✅ TESTCODE added to Shane\'s invitations');
    }

    // Step 6: Create NEW clean connection between Shane and Allison
    console.log('\n🔗 Step 6: Creating clean connection between Shane and Allison...');
    const connectionId = generateId();
    const connection: Connection = {
      id: connectionId,
      keeperId: shaneProfile.id,
      tellerId: allisonProfile.id,
      invitationCode: invitationCode,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    await kv.set(Keys.connection(connectionId), connection);
    console.log(`   ✅ Connection created: ${connectionId}`);

    // Add to Shane's connections
    await kv.set(Keys.userConnections(shaneProfile.id), [connectionId]);
    console.log('   ✅ Connection added to Shane\'s list');

    // Add to Allison's connections
    await kv.set(Keys.userConnections(allisonProfile.id), [connectionId]);
    console.log('   ✅ Connection added to Allison\'s list');

    // Final verification
    console.log('\n✅ Step 7: Verification...');
    const finalShaneConnections = await kv.get<string[]>(Keys.userConnections(shaneProfile.id));
    const finalAllisonConnections = await kv.get<string[]>(Keys.userConnections(allisonProfile.id));
    const finalConnection = await kv.get<Connection>(Keys.connection(connectionId));

    console.log(`   Shane connections: ${finalShaneConnections?.length || 0}`);
    console.log(`   Allison connections: ${finalAllisonConnections?.length || 0}`);
    console.log(`   Connection status: ${finalConnection?.status}`);

    console.log('\n🎉 CLEANUP AND CONNECTION COMPLETE!');
    console.log('='.repeat(80));
    console.log('📝 Final Summary:');
    console.log(`   ✅ Shane Long (Keeper): ${shaneProfile.email}`);
    console.log(`   ✅ Allison Tam (Storyteller): ${allisonProfile.email}`);
    console.log(`   ✅ Connection ID: ${connectionId}`);
    console.log(`   ✅ Connection Status: ${connection.status}`);
    console.log(`   ✅ Invitation Code: ${invitationCode}`);
    console.log('='.repeat(80));

    return {
      success: true,
      shane: shaneProfile,
      allison: allisonProfile,
      invitation,
      connection,
      message: 'Shane and Allison are now cleanly connected with no test keepers',
    };
  } catch (error) {
    console.error('❌ Error during cleanup and connection:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check connection status between Shane and Allison
 */
export async function checkConnection() {
  try {
    console.log('🔍 Checking connection between Shane and Allison...');

    // Find users
    const allUsers = await kv.getByPrefix<UserProfile>(Keys.prefixes.users);
    const shaneProfile = allUsers.find(u => u.email === 'shanelong@gmail.com');
    const allisonProfile = allUsers.find(u => u.email === 'allison.tam@hotmail.com');

    if (!shaneProfile) {
      return {
        success: false,
        connected: false,
        error: 'Shane Long not found',
      };
    }

    const result: any = {
      success: true,
      shane: {
        id: shaneProfile.id,
        name: shaneProfile.name,
        email: shaneProfile.email,
        type: shaneProfile.type,
      },
      allison: allisonProfile ? {
        id: allisonProfile.id,
        name: allisonProfile.name,
        email: allisonProfile.email,
        type: allisonProfile.type,
      } : null,
      connected: false,
    };

    if (!allisonProfile) {
      result.error = 'Allison Tam has not signed up yet';
      return result;
    }

    // Check if they have a connection
    const shaneConnections = await kv.get<string[]>(Keys.userConnections(shaneProfile.id)) || [];
    
    for (const connId of shaneConnections) {
      const conn = await kv.get<Connection>(Keys.connection(connId));
      if (conn && conn.keeperId === shaneProfile.id && conn.tellerId === allisonProfile.id) {
        result.connected = true;
        result.connection = {
          id: conn.id,
          status: conn.status,
          invitationCode: conn.invitationCode,
          createdAt: conn.createdAt,
        };
        console.log(`✅ Connection found: ${conn.id} (${conn.status})`);
        break;
      }
    }

    if (!result.connected) {
      console.log('❌ No connection found between Shane and Allison');
    }

    return result;
  } catch (error) {
    console.error('❌ Error checking connection:', error);
    return {
      success: false,
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Reset test invitation - delete connection between Shane and Allison
 */
export async function resetTestInvitation() {
  try {
    console.log('🔄 Resetting test invitation...');

    // Find users
    const allUsers = await kv.getByPrefix<UserProfile>(Keys.prefixes.users);
    const shaneProfile = allUsers.find(u => u.email === 'shanelong@gmail.com');
    const allisonProfile = allUsers.find(u => u.email === 'allison.tam@hotmail.com');

    if (!shaneProfile) {
      return {
        success: false,
        error: 'Shane Long not found',
      };
    }

    let deletedConnections = 0;

    // Delete Shane's connections
    const shaneConnections = await kv.get<string[]>(Keys.userConnections(shaneProfile.id)) || [];
    for (const connId of shaneConnections) {
      await kv.del(Keys.connection(connId));
      deletedConnections++;
      console.log(`   Deleted connection: ${connId}`);
    }
    await kv.set(Keys.userConnections(shaneProfile.id), []);

    // Delete Allison's connections if she exists
    if (allisonProfile) {
      const allisonConnections = await kv.get<string[]>(Keys.userConnections(allisonProfile.id)) || [];
      for (const connId of allisonConnections) {
        await kv.del(Keys.connection(connId));
        console.log(`   Deleted connection: ${connId}`);
      }
      await kv.set(Keys.userConnections(allisonProfile.id), []);
    }

    // Update invitation status to 'sent'
    const invitationCode = 'TESTCODE';
    const invitation = await kv.get<Invitation>(Keys.invitation(invitationCode));
    if (invitation) {
      invitation.status = 'sent';
      invitation.tellerId = undefined;
      invitation.acceptedAt = undefined;
      await kv.set(Keys.invitation(invitationCode), invitation);
      console.log('   Invitation reset to "sent" status');
    }

    console.log(`✅ Reset complete. Deleted ${deletedConnections} connection(s)`);

    return {
      success: true,
      deletedConnections,
      message: 'Test invitation reset successfully',
    };
  } catch (error) {
    console.error('❌ Error resetting invitation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete a user completely (for testing)
 */
export async function deleteUser(email: string) {
  try {
    console.log(`🗑️  Deleting user: ${email}`);

    // Find the user
    const allUsers = await kv.getByPrefix<UserProfile>(Keys.prefixes.users);
    const userProfile = allUsers.find(u => u.email === email);

    if (!userProfile) {
      return {
        success: false,
        error: `User not found: ${email}`,
      };
    }

    const userId = userProfile.id;
    const deletedCount = {
      connections: 0,
      invitations: 0,
      memories: 0,
    };

    // Delete connections
    const connections = await kv.get<string[]>(Keys.userConnections(userId)) || [];
    for (const connId of connections) {
      const conn = await kv.get<Connection>(Keys.connection(connId));
      if (conn) {
        // Remove from the other user's connections list
        const otherUserId = conn.keeperId === userId ? conn.tellerId : conn.keeperId;
        const otherConnections = await kv.get<string[]>(Keys.userConnections(otherUserId)) || [];
        const updatedOtherConnections = otherConnections.filter(id => id !== connId);
        await kv.set(Keys.userConnections(otherUserId), updatedOtherConnections);
      }
      await kv.del(Keys.connection(connId));
      deletedCount.connections++;
      console.log(`   Deleted connection: ${connId}`);
    }
    await kv.del(Keys.userConnections(userId));

    // Delete invitations
    const invitations = await kv.get<string[]>(Keys.userInvitations(userId)) || [];
    for (const code of invitations) {
      await kv.del(Keys.invitation(code));
      deletedCount.invitations++;
      console.log(`   Deleted invitation: ${code}`);
    }
    await kv.del(Keys.userInvitations(userId));

    // Delete memories (get all memories and filter by userId)
    const allMemories = await kv.getByPrefix(Keys.prefixes.memories);
    for (const memory of allMemories) {
      if (memory.userId === userId) {
        await kv.del(Keys.memory(memory.id));
        deletedCount.memories++;
        console.log(`   Deleted memory: ${memory.id}`);
      }
    }

    // Delete the user profile
    await kv.del(Keys.user(userId));
    console.log(`   Deleted user profile: ${userId}`);

    console.log(`✅ User deleted: ${userProfile.name} (${email})`);
    console.log(`   - Connections: ${deletedCount.connections}`);
    console.log(`   - Invitations: ${deletedCount.invitations}`);
    console.log(`   - Memories: ${deletedCount.memories}`);

    return {
      success: true,
      deletedUser: {
        id: userId,
        name: userProfile.name,
        email: userProfile.email,
      },
      deletedCount,
    };
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
