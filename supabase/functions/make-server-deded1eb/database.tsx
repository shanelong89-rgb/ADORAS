/**
 * Adoras Database Schema and Types
 * 
 * Uses the KV store with structured data for:
 * - User profiles (Legacy Keepers & Storytellers)
 * - Memories (photos, videos, voice, text, documents)
 * - Relationships (keeper-teller connections)
 * - Invitations (SMS invitation codes)
 * - Prompts (daily memory prompts)
 */

export interface UserProfile {
  id: string;
  type: 'keeper' | 'teller';
  name: string;
  email?: string;
  phoneNumber?: string;
  relationship?: string;
  bio?: string;
  photo?: string;
  age?: number;
  birthday?: string; // ISO date string
  appLanguage?: 'english' | 'spanish' | 'french' | 'chinese' | 'korean' | 'japanese';
  // Privacy & Security Settings
  privacySettings?: {
    privateProfile?: boolean; // Only invited people can see memories
    shareLocationData?: boolean; // Include location in memories
  };
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface Memory {
  id: string;
  userId: string; // Creator of the memory
  connectionId: string; // The keeper-teller relationship this belongs to
  type: 'text' | 'photo' | 'voice' | 'video' | 'document';
  content: string; // Text content or description
  sender: 'keeper' | 'teller';
  timestamp: string; // ISO timestamp
  estimatedDate?: string; // When the memory occurred
  category?: string;
  tags: string[];
  readBy?: string[]; // User IDs who have read this message
  
  // Voice memo specific
  transcript?: string;
  originalText?: string;
  voiceLanguage?: string;
  voiceLanguageCode?: string;
  englishTranslation?: string;
  audioUrl?: string; // Supabase Storage URL
  voiceVisualReference?: string; // Photo/image URL associated with voice note
  
  // Photo specific
  photoUrl?: string; // Supabase Storage URL
  photoDate?: string; // ISO date
  photoLocation?: string;
  photoGPSCoordinates?: { latitude: number; longitude: number };
  detectedPeople?: string[];
  detectedFaces?: number;
  
  // Video specific
  videoUrl?: string; // Supabase Storage URL
  videoThumbnail?: string; // Thumbnail image URL
  videoDate?: string; // ISO date
  videoLocation?: string;
  videoGPSCoordinates?: { latitude: number; longitude: number };
  videoPeople?: string[];
  videoFaces?: number;
  
  // Document specific
  documentUrl?: string; // Supabase Storage URL
  documentType?: string;
  documentFileName?: string;
  documentScannedText?: string;
  documentPageCount?: number;
  documentScanLanguage?: string;
  
  // Admin fields (for Legacy Keepers)
  notes?: string;
  location?: string;
  
  // Metadata
  promptQuestion?: string;
  conversationContext?: string;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface Connection {
  id: string;
  keeperId: string; // Legacy Keeper user ID
  tellerId: string; // Storyteller user ID
  status: 'pending' | 'active' | 'declined' | 'disconnected';
  invitationCode?: string;
  createdAt: string; // ISO timestamp
  acceptedAt?: string; // ISO timestamp
  disconnectedAt?: string; // ISO timestamp
  disconnectedBy?: string; // User ID who initiated disconnect
}

export interface Invitation {
  id: string;
  code: string; // Alphanumeric code like FAM-2024-XY9K
  keeperId: string; // Who sent the invitation
  tellerPhoneNumber: string; // Who it's sent to
  tellerName?: string; // Expected name
  status: 'sent' | 'accepted' | 'expired';
  sentAt: string; // ISO timestamp
  expiresAt: string; // ISO timestamp
  acceptedAt?: string; // ISO timestamp
  // Pre-filled storyteller information from keeper
  tellerBirthday?: string; // ISO date string
  tellerRelationship?: string;
  tellerBio?: string;
  tellerPhoto?: string; // Base64 encoded image
}

export interface ConnectionRequest {
  id: string;
  requesterId: string; // Who sent the request
  requesterName: string;
  requesterEmail: string;
  requesterPhoto?: string;
  recipientId: string; // Who should accept the request
  recipientName: string;
  recipientEmail: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string; // ISO timestamp
  respondedAt?: string; // ISO timestamp
}

export interface DailyPrompt {
  id: string;
  question: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'deep';
  tags: string[];
  createdAt: string; // ISO timestamp
}

export interface UserPrompt {
  id: string;
  userId: string;
  promptId: string;
  date: string; // ISO date (YYYY-MM-DD)
  status: 'pending' | 'answered' | 'skipped';
  answeredAt?: string; // ISO timestamp
  memoryId?: string; // Link to the memory created in response
}

// KV Store Key Patterns:
// - user:{userId} -> UserProfile
// - memory:{memoryId} -> Memory
// - connection:{connectionId} -> Connection
// - connection_request:{requestId} -> ConnectionRequest
// - invitation:{code} -> Invitation
// - prompt:{promptId} -> DailyPrompt
// - user_prompt:{userId}:{date} -> UserPrompt
// - user_connections:{userId} -> string[] (list of connection IDs)
// - user_connection_requests:{userId} -> string[] (list of connection request IDs)
// - connection_memories:{connectionId} -> string[] (list of memory IDs)
// - user_invitations:{userId} -> string[] (list of invitation codes)

/**
 * Helper functions for key generation
 */
export const Keys = {
  user: (userId: string) => `user:${userId}`,
  memory: (memoryId: string) => `memory:${memoryId}`,
  connection: (connectionId: string) => `connection:${connectionId}`,
  connectionRequest: (requestId: string) => `connection_request:${requestId}`,
  invitation: (code: string) => `invitation:${code}`,
  prompt: (promptId: string) => `prompt:${promptId}`,
  userPrompt: (userId: string, date: string) => `user_prompt:${userId}:${date}`,
  userConnections: (userId: string) => `user_connections:${userId}`,
  userConnectionRequests: (userId: string) => `user_connection_requests:${userId}`,
  connectionMemories: (connectionId: string) => `connection_memories:${connectionId}`,
  userInvitations: (userId: string) => `user_invitations:${userId}`,
  
  // For prefix queries
  prefixes: {
    users: 'user:',
    memories: 'memory:',
    connections: 'connection:',
    connectionRequests: 'connection_request:',
    invitations: 'invitation:',
    prompts: 'prompt:',
    userPrompts: (userId: string) => `user_prompt:${userId}:`,
  }
};

/**
 * Validation helpers
 */
export const Validators = {
  phoneNumber: (phone: string): boolean => {
    // Basic validation for international phone numbers
    return /^\+?[1-9]\d{1,14}$/.test(phone.replace(/[\s\-\(\)]/g, ''));
  },
  
  invitationCode: (code: string): boolean => {
    // Accept either 6-digit code OR alphanumeric format like FAM-2024-XY9K
    return /^\d{6}$/.test(code) || /^[A-Z0-9]{3,4}-\d{4}-[A-Z0-9]{4,5}$/i.test(code);
  },
  
  email: (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
};

/**
 * ID generators
 */
export const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

export const generateInvitationCode = (): string => {
  // Generate alphanumeric code in format: FAM-2025-XY9K
  const prefix = 'FAM';
  const year = new Date().getFullYear();
  const randomChars = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}-${year}-${randomChars}`;
};