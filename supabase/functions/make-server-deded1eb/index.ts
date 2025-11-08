import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.ts";
import * as auth from "./auth.ts";
import * as invitations from "./invitations.ts";
import * as memories from "./memories.ts";
import ai from "./ai.ts";
import notifications from "./notifications.ts";
import icons from "./icons.ts";
import * as testSetup from "./setup_test_invitation.ts";

// Adoras Server - Ultra-responsive scroll detection update
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Initialize storage on startup
memories.initializeStorage();

// Health check endpoint
app.get("/make-server-deded1eb/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Test notification route (direct registration to verify routing works)
app.post("/make-server-deded1eb/notifications/new-memory-test", async (c) => {
  console.log('🧪 TEST ROUTE HIT: /new-memory-test');
  return c.json({
    success: true,
    message: 'Test route works - main /new-memory route should also work',
    timestamp: new Date().toISOString()
  });
});

// Test signin endpoint - returns detailed diagnostics
app.post("/make-server-deded1eb/test/signin-diagnostic", async (c) => {
  try {
    const body = await c.req.json();
    const { email } = body;
   
    const diagnostics = {
      timestamp: new Date().toISOString(),
      email: email,
      supabaseUrl: Deno.env.get('SUPABASE_URL'),
      hasServiceRoleKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      serviceRoleKeyLength: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.length || 0,
    };
   
    return c.json({ success: true, diagnostics });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// ============================================================================
// ICON ROUTES (PWA Touch Icons)
// ============================================================================
// Mount icon routes
app.route("/", icons);

// ============================================================================
// AI ROUTES (Phase 4a, 4b, 4c)
// ============================================================================
// Mount AI routes
app.route("/", ai);

// ============================================================================
// NOTIFICATION ROUTES (Phase 4d) - Force deploy 2025-11-07
// ============================================================================
// Mount notification routes at root (routes include full path)
app.route("/", notifications);

// ============================================================================
// AUTHENTICATION ROUTES
// ============================================================================
/**
 * POST /make-server-deded1eb/auth/signup
 * Create a new user account
 */
app.post("/make-server-deded1eb/auth/signup", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, type, name, phoneNumber, relationship, bio, photo, appLanguage, birthday } = body;
    if (!email || !password || !type || !name) {
      return c.json({ success: false, error: "Missing required fields" }, 400);
    }
    const result = await auth.createUser({
      email,
      password,
      type,
      name,
      phoneNumber,
      relationship,
      bio,
      photo,
      appLanguage,
      birthday,
    });
    return c.json(result, result.success ? 201 : 400);
  } catch (error) {
    console.error("Signup error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Signup failed"
    }, 500);
  }
});

/**
 * POST /make-server-deded1eb/auth/signin
 * Sign in a user
 */
app.post("/make-server-deded1eb/auth/signin", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;
    if (!email || !password) {
      return c.json({ success: false, error: "Missing email or password" }, 400);
    }
    const result = await auth.signIn(email, password);
    return c.json(result, result.success ? 200 : 401);
  } catch (error) {
    console.error("Signin error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Signin failed"
    }, 500);
  }
});

/**
 * POST /make-server-deded1eb/auth/signout
 * Sign out a user
 */
app.post("/make-server-deded1eb/auth/signout", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      return c.json({ success: false, error: "No access token provided" }, 401);
    }
    const result = await auth.signOut(accessToken);
    return c.json(result);
  } catch (error) {
    console.error("Signout error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Signout failed"
    }, 500);
  }
});

/**
 * GET /make-server-deded1eb/auth/me
 * Get current user profile
 */
app.get("/make-server-deded1eb/auth/me", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      return c.json({ success: false, error: "No access token provided" }, 401);
    }
    const result = await auth.getCurrentUser(accessToken);
    return c.json(result, result.success ? 200 : 401);
  } catch (error) {
    console.error("Get user error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to get user"
    }, 500);
  }
});

/**
 * PUT /make-server-deded1eb/auth/profile
 * Update user profile
 */
app.put("/make-server-deded1eb/auth/profile", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const verifyResult = await auth.verifyToken(accessToken);
    if (!verifyResult.success || !verifyResult.userId) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const body = await c.req.json();
    const result = await auth.updateProfile(verifyResult.userId, body);
   
    return c.json(result, result.success ? 200 : 400);
  } catch (error) {
    console.error("Update profile error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Update failed"
    }, 500);
  }
});

/**
 * POST /make-server-deded1eb/auth/change-password
 * Change user password
 */
app.post("/make-server-deded1eb/auth/change-password", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const verifyResult = await auth.verifyToken(accessToken);
    if (!verifyResult.success || !verifyResult.userId) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const body = await c.req.json();
    const { currentPassword, newPassword } = body;
    if (!currentPassword || !newPassword) {
      return c.json({ success: false, error: "Missing required fields" }, 400);
    }
    const result = await auth.changePassword(verifyResult.userId, currentPassword, newPassword);
   
    return c.json(result, result.success ? 200 : 400);
  } catch (error) {
    console.error("Change password error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Password change failed"
    }, 500);
  }
});

/**
 * GET /make-server-deded1eb/auth/export-data
 * Export all user data (GDPR compliance)
 */
app.get("/make-server-deded1eb/auth/export-data", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const verifyResult = await auth.verifyToken(accessToken);
    if (!verifyResult.success || !verifyResult.userId) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const result = await auth.exportUserData(verifyResult.userId);
   
    return c.json(result, result.success ? 200 : 500);
  } catch (error) {
    console.error("Export data error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Data export failed"
    }, 500);
  }
});

/**
 * POST /make-server-deded1eb/auth/delete-account
 * Delete user account and all associated data
 */
app.post("/make-server-deded1eb/auth/delete-account", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const verifyResult = await auth.verifyToken(accessToken);
    if (!verifyResult.success || !verifyResult.userId) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const body = await c.req.json();
    const { password } = body;
    if (!password) {
      return c.json({ success: false, error: "Password required for account deletion" }, 400);
    }
    const result = await auth.deleteUserAccount(verifyResult.userId, password);
   
    return c.json(result, result.success ? 200 : 400);
  } catch (error) {
    console.error("Delete account error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Account deletion failed"
    }, 500);
  }
});

// ============================================================================
// INVITATION & CONNECTION ROUTES
// ============================================================================
/**
 * POST /make-server-deded1eb/invitations/create
 * Create and send SMS invitation with pre-filled storyteller info
 */
app.post("/make-server-deded1eb/invitations/create", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const verifyResult = await auth.verifyToken(accessToken);
    if (!verifyResult.success || !verifyResult.userId) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const body = await c.req.json();
    const { tellerPhoneNumber, tellerName, tellerBirthday, tellerRelationship, tellerBio, tellerPhoto, code } = body;
    if (!tellerPhoneNumber) {
      return c.json({ success: false, error: "Missing phone number" }, 400);
    }
    const result = await invitations.createInvitation({
      keeperId: verifyResult.userId,
      tellerPhoneNumber,
      tellerName,
      tellerBirthday,
      tellerRelationship,
      tellerBio,
      tellerPhoto,
      code,
    });
    return c.json(result, result.success ? 201 : 400);
  } catch (error) {
    console.error("Create invitation error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to create invitation"
    }, 500);
  }
});

/**
 * POST /make-server-deded1eb/invitations/verify
 * Verify invitation code
 */
app.post("/make-server-deded1eb/invitations/verify", async (c) => {
  try {
    const body = await c.req.json();
    const { code } = body;
    if (!code) {
      return c.json({ success: false, error: "Missing invitation code" }, 400);
    }
    const result = await invitations.verifyInvitationCode(code);
    return c.json(result, result.success ? 200 : 400);
  } catch (error) {
    console.error("Verify invitation error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to verify invitation"
    }, 500);
  }
});

/**
 * POST /make-server-deded1eb/invitations/accept
 * Accept invitation and create connection
 */
app.post("/make-server-deded1eb/invitations/accept", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const verifyResult = await auth.verifyToken(accessToken);
    if (!verifyResult.success || !verifyResult.userId) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const body = await c.req.json();
    const { code } = body;
    if (!code) {
      return c.json({ success: false, error: "Missing invitation code" }, 400);
    }
    const result = await invitations.acceptInvitation({
      code,
      tellerId: verifyResult.userId,
    });
    return c.json(result, result.success ? 200 : 400);
  } catch (error) {
    console.error("Accept invitation error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to accept invitation"
    }, 500);
  }
});

/**
 * POST /make-server-deded1eb/invitations/connect-email
 * Connect with existing user via email (no invitation code needed)
 */
app.post("/make-server-deded1eb/invitations/connect-email", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const verifyResult = await auth.verifyToken(accessToken);
    if (!verifyResult.success || !verifyResult.userId) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const body = await c.req.json();
    const { email } = body;
    if (!email) {
      return c.json({ success: false, error: "Missing email address" }, 400);
    }
    const result = await invitations.connectViaEmail({
      requesterId: verifyResult.userId,
      partnerEmail: email,
    });
    return c.json(result, result.success ? 200 : 400);
  } catch (error) {
    console.error("Connect via email error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to connect via email"
    }, 500);
  }
});

/**
 * DELETE /make-server-deded1eb/invitations/:code
 * Delete/cancel an invitation
 */
app.delete("/make-server-deded1eb/invitations/:code", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    ifúng: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Initialize storage on startup
memories.initializeStorage();

// Health check endpoint
app.get("/make-server-deded1eb/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Test notification route (direct registration to verify routing works)
app.post("/make-server-deded1eb/notifications/new-memory-test", async (c) => {
  console.log('🧪 TEST ROUTE HIT: /new-memory-test');
  return c.json({
    success: true,
    message: 'Test route works - main /new-memory route should also work',
    timestamp: new Date().toISOString()
  });
});

// Test signin endpoint - returns detailed diagnostics
app.post("/make-server-deded1eb/test/signin-diagnostic", async (c) => {
  try {
    const body = await c.req.json();
    const { email } = body;
   
    const diagnostics = {
      timestamp: new Date().toISOString(),
      email: email,
      supabaseUrl: Deno.env.get('SUPABASE_URL'),
      hasServiceRoleKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      serviceRoleKeyLength: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.length || 0,
    };
   
    return c.json({ success: true, diagnostics });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// ============================================================================
// ICON ROUTES (PWA Touch Icons)
// ============================================================================
// Mount icon routes
app.route("/", icons);

// ============================================================================
// AI ROUTES (Phase 4a, 4b, 4c)
// ============================================================================
// Mount AI routes
app.route("/", ai);

// ============================================================================
// NOTIFICATION ROUTES (Phase 4d) - Force deploy 2025-11-07
// ============================================================================
// Mount notification routes at root (routes include full path)
app.route("/", notifications);

// ============================================================================
// AUTHENTICATION ROUTES
// ============================================================================
/**
 * POST /make-server-deded1eb/auth/signup
 * Create a new user account
 */
app.post("/make-server-deded1eb/auth/signup", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, type, name, phoneNumber, relationship, bio, photo, appLanguage, birthday } = body;
    if (!email || !password || !type || !name) {
      return c.json({ success: false, error: "Missing required fields" }, 400);
    }
    const result = await auth.createUser({
      email,
      password,
      type,
      name,
      phoneNumber,
      relationship,
      bio,
      photo,
      appLanguage,
      birthday,
    });
    return c.json(result, result.success ? 201 : 400);
  } catch (error) {
    console.error("Signup error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Signup failed"
    }, 500);
  }
});

/**
 * POST /make-server-deded1eb/auth/signin
 * Sign in a user
 */
app.post("/make-server-deded1eb/auth/signin", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;
    if (!email || !password) {
      return c.json({ success: false, error: "Missing email or password" }, 400);
    }
    const result = await auth.signIn(email, password);
    return c.json(result, result.success ? 200 : 401);
  } catch (error) {
    console.error("Signin error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Signin failed"
    }, 500);
  }
});

/**
 * POST /make-server-deded1eb/auth/signout
 * Sign out a user
 */
app.post("/make-server-deded1eb/auth/signout", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      return c.json({ success: false, error: "No access token provided" }, 401);
    }
    const result = await auth.signOut(accessToken);
    return c.json(result);
  } catch (error) {
    console.error("Signout error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Signout failed"
    }, 500);
  }
});

/**
 * GET /make-server-deded1eb/auth/me
 * Get current user profile
 */
app.get("/make-server-deded1eb/auth/me", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      return c.json({ success: false, error: "No access token provided" }, 401);
    }
    const result = await auth.getCurrentUser(accessToken);
    return c.json(result, result.success ? 200 : 401);
  } catch (error) {
    console.error("Get user error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to get user"
    }, 500);
  }
});

/**
 * PUT /make-server-deded1eb/auth/profile
 * Update user profile
 */
app.put("/make-server-deded1eb/auth/profile", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const verifyResult = await auth.verifyToken(accessToken);
    if (!verifyResult.success || !verifyResult.userId) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const body = await c.req.json();
    const result = await auth.updateProfile(verifyResult.userId, body);
   
    return c.json(result, result.success ? 200 : 400);
  } catch (error) {
    console.error("Update profile error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Update failed"
    }, 500);
  }
});

/**
 * POST /make-server-deded1eb/auth/change-password
 * Change user password
 */
app.post("/make-server-deded1eb/auth/change-password", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const verifyResult = await auth.verifyToken(accessToken);
    if (!verifyResult.success || !verifyResult.userId) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const body = await c.req.json();
    const { currentPassword, newPassword } = body;
    if (!currentPassword || !newPassword) {
      return c.json({ success: false, error: "Missing required fields" }, 400);
    }
    const result = await auth.changePassword(verifyResult.userId, currentPassword, newPassword);
   
    return c.json(result, result.success ? 200 : 400);
  } catch (error) {
    console.error("Change password error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Password change failed"
    }, 500);
  }
});

/**
 * GET /make-server-deded1eb/auth/export-data
 * Export all user data (GDPR compliance)
 */
app.get("/make-server-deded1eb/auth/export-data", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const verifyResult = await auth.verifyToken(accessToken);
    if (!verifyResult.success || !verifyResult.userId) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const result = await auth.exportUserData(verifyResult.userId);
   
    return c.json(result, result.success ? 200 : 500);
  } catch (error) {
    console.error("Export data error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Data export failed"
    }, 500);
  }
});

/**
 * POST /make-server-deded1eb/auth/delete-account
 * Delete user account and all associated data
 */
app.post("/make-server-deded1eb/auth/delete-account", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const verifyResult = await auth.verifyToken(accessToken);
    if (!verifyResult.success || !verifyResult.userId) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const body = await c.req.json();
    const { password } = body;
    if (!password) {
      return c.json({ success: false, error: "Password required for account deletion" }, 400);
    }
    const result = await auth.deleteUserAccount(verifyResult.userId, password);
   
    return c.json(result, result.success ? 200 : 400);
  } catch (error) {
    console.error("Delete account error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Account deletion failed"
    }, 500);
  }
});

// ============================================================================
// INVITATION & CONNECTION ROUTES
// ============================================================================
/**
 * POST /make-server-deded1eb/invitations/create
 * Create and send SMS invitation with pre-filled storyteller info
 */
app.post("/make-server-deded1eb/invitations/create", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const verifyResult = await auth.verifyToken(accessToken);
    if (!verifyResult.success || !verifyResult.userId) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const body = await c.req.json();
    const { tellerPhoneNumber, tellerName, tellerBirthday, tellerRelationship, tellerBio, tellerPhoto, code } = body;
    if (!tellerPhoneNumber) {
      return c.json({ success: false, error: "Missing phone number" }, 400);
    }
    const result = await invitations.createInvitation({
      keeperId: verifyResult.userId,
      tellerPhoneNumber,
      tellerName,
      tellerBirthday,
      tellerRelationship,
      tellerBio,
      tellerPhoto,
      code,
    });
    return c.json(result, result.success ? 201 : 400);
  } catch (error) {
    console.error("Create invitation error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to create invitation"
    }, 500);
  }
});

/**
 * POST /make-server-deded1eb/invitations/verify
 * Verify invitation code
 */
app.post("/make-server-deded1eb/invitations/verify", async (c) => {
  try {
    const body = await c.req.json();
    const { code } = body;
    if (!code) {
      return c.json({ success: false, error: "Missing invitation code" }, 400);
    }
    const result = await invitations.verifyInvitationCode(code);
    return c.json(result, result.success ? 200 : 400);
  } catch (error) {
    console.error("Verify invitation error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to verify invitation"
    }, 500);
  }
});

/**
 * POST /make-server-deded1eb/invitations/accept
 * Accept invitation and create connection
 */
app.post("/make-server-deded1eb/invitations/accept", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const verifyResult = await auth.verifyToken(accessToken);
    if (!verifyResult.success || !verifyResult.userId) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const body = await c.req.json();
    const { code } = body;
    if (!code) {
      return c.json({ success: false, error: "Missing invitation code" }, 400);
    }
    const result = await invitations.acceptInvitation({
      code,
      tellerId: verifyResult.userId,
    });
    return c.json(result, result.success ? 200 : 400);
  } catch (error) {
    console.error("Accept invitation error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to accept invitation"
    }, 500);
  }
});

/**
 * POST /make-server-deded1eb/invitations/connect-email
 * Connect with existing user via email (no invitation code needed)
 */
app.post("/make-server-deded1eb/invitations/connect-email", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const verifyResult = await auth.verifyToken(accessToken);
    if (!verifyResult.success || !verifyResult.userId) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const body = await c.req.json();
    const { email } = body;
    if (!email) {
      return c.json({ success: false, error: "Missing email address" }, 400);
    }
    const result = await invitations.connectViaEmail({
      requesterId: verifyResult.userId,
      partnerEmail: email,
    });
    return c.json(result, result.success ? 200 : 400);
  } catch (error) {
    console.error("Connect via email error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to connect via email"
    }, 500);
  }
});

/**
 * DELETE /make-server-deded1eb/invitations/:code
 * Delete/cancel an invitation
 */
app.delete("/make-server-deded1eb/invitations/:code", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const verifyResult = await auth.verifyToken(accessToken);
    if (!verifyResult.success || !verifyResult.userId) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const code = c.req.param("code");
    if (!code) {
      return c.json({ success: false, error: "Missing invitation code" }, 400);
    }
    const result = await invitations.deleteInvitation({
      userId: verifyResult.userId,
      code,
    });
    return c.json(result, result.success ? 200 : 400);
  } catch (error) {
    console.error("Delete invitation error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete invitation"
    }, 500);
  }
});

/**
 * GET /make-server-deded1eb/connection-requests
 * Get user's connection requests (sent and received)
 */
app.get("/make-server-deded1eb/connection-requests", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    console.log("[connection-requests] Auth header present:", !!authHeader);
   
    const accessToken = authHeader?.split(" ")[1];
    if (!accessToken) {
      console.log("[connection-requests] No access token in header");
      return c.json({ success: false, error: "Unauthorized - No token" }, 401);
    }
    console.log("[connection-requests] Verifying token...");
    const verifyResult = await auth.verifyToken(accessToken);
    console.log("[connection-requests] Verify result:", {
      success: verifyResult.success,
      hasUserId: !!verifyResult.userId,
      error: verifyResult.error
    });
   
    if (!verifyResult.success || !verifyResult.userId) {
      console.log("[connection-requests] Token verification failed:", verifyResult.error);
      return c.json({ success: false, error: verifyResult.error || "Unauthorized" }, 401);
    }
    console.log("[connection-requests] Getting requests for user:", verifyResult.userId);
    const result = await invitations.getConnectionRequests(verifyResult.userId);
    return c.json(result, result.success ? 200 : 400);
  } catch (error) {
    console.error("[connection-requests] Unexpected error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to get connection requests"
    }, 500);
  }
});

/**
 * POST /make-server-deded1eb/connection-requests/:requestId/accept
 * Accept a connection request
 */
app.post("/make-server-deded1eb/connection-requests/:requestId/accept", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const verifyResult = await auth.verifyToken(accessToken);
    if (!verifyResult.success || !verifyResult.userId) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const requestId = c.req.param("requestId");
    if (!requestId) {
      return c.json({ success: false, error: "Missing request ID" }, 400);
    }
    const result = await invitations.acceptConnectionRequest({
      userId: verifyResult.userId,
      requestId,
    });
    return c.json(result, result.success ? 200 : 400);
  } catch (error) {
    console.error("Accept connection request error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to accept connection request"
    }, 500);
  }
});

/**
 * POST /make-server-deded1eb/connection-requests/:requestId/decline
 * Decline a connection request
 */
app.post("/make-server-deded1eb/connection-requests/:requestId/decline", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const verifyResult = await auth.verifyToken(accessToken);
    if (!verifyResult.success || !verifyResult.userId) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const requestId = c.req.param("requestId");
    if (!requestId) {
      return c.json({ success: false, error: "Missing request ID" }, 400);
    }
    const result = await invitations.declineConnectionRequest({
      userId: verifyResult.userId,
      requestId,
    });
    return c.json(result, result.success ? 200 : 400);
  } catch (error) {
    console.error("Decline connection request error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to decline connection request"
    }, 500);
  }
});

/**
 * GET /make-server-deded1eb/connections
 * Get user's connections
 */
app.get("/make-server-deded1eb/connections", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const verifyResult = await auth.verifyToken(accessToken);
    if (!verifyResult.success || !verifyResult.userId) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const result = await invitations.getUserConnections(verifyResult.userId);
    return c.json(result);
  } catch (error) {
    console.error("Get connections error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to get connections"
    }, 500);
  }
});

/**
 * POST /make-server-deded1eb/connections/:connectionId/disconnect
 * Disconnect from a connection with option to delete memories
 */
app.post("/make-server-deded1eb/connections/:connectionId/disconnect", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const verifyResult = await auth.verifyToken(accessToken);
    if (!verifyResult.success || !verifyResult.userId) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const connectionId = c.req.param("connectionId");
    if (!connectionId) {
      return c.json({ success: false, error: "Missing connection ID" }, 400);
    }
    const body = await c.req.json();
    const deleteMemories = body.deleteMemories === true;
    const result = await invitations.disconnectConnection({
      userId: verifyResult.userId,
      connectionId,
      deleteMemories,
    });
    return c.json(result, result.success ? 200 : 400);
  } catch (error) {
    console.error("Disconnect connection error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to disconnect connection"
    }, 500);
  }
});

/**
 * GET /make-server-deded1eb/invitations
 * Get user's pending invitations
 */
app.get("/make-server-deded1eb/invitations", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const verifyResult = await auth.verifyToken(accessToken);
    if (!verifyResult.success || !verifyResult.userId) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const result = await invitations.getUserInvitations(verifyResult.userId);
    return c.json(result);
  } catch (error) {
    console.error("Get invitations error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to get invitations"
    }, 500);
  }
});

// ============================================================================
// MEMORY ROUTES
// ============================================================================
/**
 * POST /make-server-deded1eb/memories
 * Create a new memory
 */
app.post("/make-server-deded1eb/memories", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const verifyResult = await auth.verifyToken(accessToken);
    if (!verifyResult.success || !verifyResult.userId) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const body = await c.req.json();
    const result = await memories.createMemory({
      userId: verifyResult.userId,
      ...body,
    });
    return c.json(result, result.success ? 201 : 400);
  } catch (error) {
    console.error("Create memory error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to create memory"
    }, 500);
  }
});

/**
 * GET /make-server-deded1eb/memories/:connectionId
 * Get memories for a connection
 */
app.get("/make-server-deded1eb/memories/:connectionId", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      console.log("🔑 No token found - user needs to sign in");
      return c.json({ success: false, error: "No authentication token provided" }, 401);
    }
    const verifyResult = await auth.verifyToken(accessToken);
    if (!verifyResult.success || !verifyResult.userId) {
      console.log("❌ Token verification failed");
      return c.json({ success: false, error: "Invalid or expired token" }, 401);
    }
    const connectionId = c.req.param("connectionId");
    console.log(`📥 Getting memories for connection: ${connectionId}`);
   
    const result = await memories.getConnectionMemories({
      connectionId,
      userId: verifyResult.userId,
    });
    // Log result summary without full data
    if (result.success) {
      console.log(`✅ Found ${result.memories?.length || 0} memories for connection ${connectionId}`);
    } else {
      console.warn(`⚠️ API call succeeded but no memories found for connection: ${connectionId}`);
      console.log(` Response details:`, JSON.stringify(result, null, 2));
    }
    return c.json(result);
  } catch (error) {
    console.error("Get memories error:", error);
    return c.json({
      success: false,
      hasMemories: false,
      error: error instanceof Error ? error.message : "Failed to get memories"
    }, 500);
  }
});

/**
 * PUT /make-server-deded1eb/memories/:memoryId
 * Update a memory (Legacy Keeper only)
 */
app.put("/make-server-deded1eb/memories/:memoryId", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const verifyResult = await auth.verifyToken(accessToken);
    if (!verifyResult.success || !verifyResult.userId) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const memoryId = c.req.param("memoryId");
    const body = await c.req.json();
    const result = await memories.updateMemory({
      memoryId,
      userId: verifyResult.userId,
      updates: body,
    });
    return c.json(result, result.success ? 200 : 400);
  } catch (error) {
    console.error("Update memory error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to update memory"
    }, 500);
  }
});

/**
 * DELETE /make-server-deded1eb/memories/:memoryId
 * Delete a memory (Legacy Keeper only)
 */
app.delete("/make-server-deded1eb/memories/:memoryId", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const verifyResult = await auth.verifyToken(accessToken);
    if (!verifyResult.success || !verifyResult.userId) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const memoryId = c.req.param("memoryId");
    const result = await memories.deleteMemory({
      memoryId,
      userId: verifyResult.userId,
    });
    return c.json(result, result.success ? 200 : 400);
  } catch (error) {
    console.error("Delete memory error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete memory"
    }, 500);
  }
});

/**
 * POST /make-server-deded1eb/memories/:connectionId/mark-read
 * Mark messages as read for a connection
 */
app.post("/make-server-deded1eb/memories/:connectionId/mark-read", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const verifyResult = await auth.verifyToken(accessToken);
    if (!verifyResult.success || !verifyResult.userId) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const connectionId = c.req.param("connectionId");
    const body = await c.req.json().catch(() => ({})); // Body is optional
    const messageIds = body.messageIds; // Optional: specific message IDs to mark as read
    const result = await memories.markMessagesAsRead({
      connectionId,
      userId: verifyResult.userId,
      messageIds,
    });
    return c.json(result, result.success ? 200 : 400);
  } catch (error) {
    console.error("Mark messages as read error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to mark messages as read"
    }, 500);
  }
});

/**
 * GET /make-server-deded1eb/memory/:memoryId
 * Get a single memory
 */
app.get("/make-server-deded1eb/memory/:memoryId", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const verifyResult = await auth.verifyToken(accessToken);
    if (!verifyResult.success || !verifyResult.userId) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const memoryId = c.req.param("memoryId");
    const result = await memories.getMemory({
      memoryId,
      userId: verifyResult.userId,
    });
    return c.json(result);
  } catch (error) {
    console.error("Get memory error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to get memory"
    }, 500);
  }
});

/**
 * POST /make-server-deded1eb/memories/:memoryId/refresh-url
 * Refresh signed URLs for a memory's media files (Phase 3b)
 */
app.post("/make-server-deded1eb/memories/:memoryId/refresh-url", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const verifyResult = await auth.verifyToken(accessToken);
    if (!verifyResult.success || !verifyResult.userId) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const memoryId = c.req.param("memoryId");
    const result = await memories.refreshMemoryUrls({
      memoryId,
      userId: verifyResult.userId,
    });
    return c.json(result, result.success ? 200 : 400);
  } catch (error) {
    console.error("Refresh memory URL error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to refresh memory URL"
    }, 500);
  }
});

// ============================================================================
// STORAGE/UPLOAD ROUTES
// ============================================================================
/**
 * POST /make-server-deded1eb/upload
 * Upload a file to Supabase Storage (bypasses RLS
