/**
 * Frontend TypeScript types for Adoras API
 * Mirrors the backend schema
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
  birthday?: string;
  appLanguage?: 'english' | 'spanish' | 'french' | 'chinese' | 'korean' | 'japanese';
  createdAt: string;
  updatedAt: string;
}

export interface Memory {
  id: string;
  userId: string;
  connectionId: string;
  type: 'text' | 'photo' | 'voice' | 'video' | 'document';
  content: string;
  sender: 'keeper' | 'teller';
  timestamp: string;
  estimatedDate?: string;
  category?: string;
  tags: string[];
  
  // Voice memo specific
  transcript?: string;
  originalText?: string;
  voiceLanguage?: string;
  voiceLanguageCode?: string;
  englishTranslation?: string;
  audioUrl?: string;
  voiceVisualReference?: string;
  
  // Photo specific
  photoUrl?: string;
  photoDate?: string;
  photoLocation?: string;
  photoGPSCoordinates?: { latitude: number; longitude: number }>;
  detectedPeople?: string[];
  detectedFaces?: number;
  
  // Video specific
  videoUrl?: string;
  videoDate?: string;
  videoLocation?: string;
  videoGPSCoordinates?: { latitude: number; longitude: number }>;
  videoPeople?: string[];
  videoFaces?: number;
  
  // Document specific
  documentUrl?: string;
  documentType?: string;
  documentFileName?: string;
  documentScannedText?: string;
  documentPageCount?: number;
  documentScanLanguage?: string;
  
  // Admin fields
  notes?: string;
  location?: string;
  
  // Metadata
  promptQuestion?: string;
  conversationContext?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Connection {
  id: string;
  keeperId: string;
  tellerId: string;
  status: 'pending' | 'active' | 'declined';
  invitationCode?: string;
  createdAt: string;
  acceptedAt?: string;
}

export interface Invitation {
  id: string;
  code: string;
  keeperId: string;
  tellerPhoneNumber: string;
  tellerName?: string;
  status: 'sent' | 'accepted' | 'expired';
  sentAt: string;
  expiresAt: string;
  acceptedAt?: string;
}

export interface ConnectionWithPartner {
  connection: Connection;
  partner: UserProfile | null;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  error?: string;
  data?: T;
}

export interface SignupRequest {
  email: string;
  password: string;
  type: 'keeper' | 'teller';
  name: string;
  phoneNumber?: string;
  relationship?: string;
  bio?: string;
  photo?: string; // Base64 encoded avatar image
  appLanguage?: string;
  birthday?: string;
}

export interface SignupResponse {
  success: boolean;
  user?: UserProfile;
  authUserId?: string;
  error?: string;
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignInResponse {
  success: boolean;
  accessToken?: string;
  user?: UserProfile;
  error?: string;
}

export interface VerifyTokenResponse {
  success: boolean;
  userId?: string;
  user?: UserProfile;
  error?: string;
}

export interface CreateInvitationRequest {
  tellerPhoneNumber: string;
  tellerName?: string;
  tellerBirthday?: string;
  tellerRelationship?: string;
  tellerBio?: string;
  tellerPhoto?: string;
  code?: string; // Optional: Use provided code or generate new one
}

export interface CreateInvitationResponse {
  success: boolean;
  invitation?: Invitation;
  smsSent?: boolean;
  smsError?: string;
  error?: string;
}

export interface VerifyInvitationResponse {
  success: boolean;
  invitation?: Invitation;
  keeper?: UserProfile;
  error?: string;
}

export interface AcceptInvitationRequest {
  code: string;
}

export interface AcceptInvitationResponse {
  success: boolean;
  connection?: Connection;
  error?: string;
}

export interface GetConnectionsResponse {
  success: boolean;
  connections?: ConnectionWithPartner[];
  error?: string;
}

export interface GetInvitationsResponse {
  success: boolean;
  invitations?: Invitation[];
  error?: string;
}

export interface CreateMemoryRequest {
  connectionId: string;
  type: Memory['type'];
  content: string;
  sender: 'keeper' | 'teller';
  estimatedDate?: string;
  category?: string;
  tags?: string[];
  transcript?: string;
  originalText?: string;
  voiceLanguage?: string;
  englishTranslation?: string;
  audioUrl?: string;
  voiceVisualReference?: string;
  photoUrl?: string;
  photoDate?: string;
  photoLocation?: string;
  photoGPSCoordinates?: { latitude: number; longitude: number }>;
  detectedPeople?: string[];
  videoUrl?: string;
  videoDate?: string;
  videoLocation?: string;
  videoGPSCoordinates?: { latitude: number; longitude: number }>;
  videoPeople?: string[];
  documentUrl?: string;
  documentType?: string;
  documentFileName?: string;
  notes?: string;
  location?: string;
  promptQuestion?: string;
  conversationContext?: string;
}

export interface CreateMemoryResponse {
  success: boolean;
  memory?: Memory;
  error?: string;
}

export interface GetMemoriesResponse {
  success: boolean;
  memories?: Memory[];
  error?: string;
}

export interface GetMemoryResponse {
  success: boolean;
  memory?: Memory;
  error?: string;
}

export interface UpdateMemoryRequest {
  notes?: string;
  category?: string;
  tags?: string[];
  estimatedDate?: string;
  location?: string;
}

export interface UpdateMemoryResponse {
  success: boolean;
  memory?: Memory;
  error?: string;
}

export interface DeleteMemoryResponse {
  success: boolean;
  error?: string;
}

export interface UpdateProfileRequest {
  name?: string;
  bio?: string;
  photo?: string;
  phoneNumber?: string;
  appLanguage?: string;
  relationship?: string;
  birthday?: string;
}

export interface UpdateProfileResponse {
  success: boolean;
  user?: UserProfile;
  error?: string;
}