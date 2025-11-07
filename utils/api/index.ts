/**
 * Adoras API - Main Export File
 */

// API Client
export { apiClient, AdorasAPIClient } from './client';

// Authentication Context
export { AuthProvider, useAuth } from './AuthContext';

// Storage Utilities
export {
  uploadFile,
  uploadPhoto,
  uploadVideo,
  uploadAudio,
  uploadDocument,
  getSignedUrl,
  deleteFile,
} from './storage';

// Types
export type {
  UserProfile,
  Memory,
  Connection,
  Invitation,
  ConnectionWithPartner,
  ApiResponse,
  SignupRequest,
  SignupResponse,
  SignInRequest,
  SignInResponse,
  VerifyTokenResponse,
  CreateInvitationRequest,
  CreateInvitationResponse,
  VerifyInvitationResponse,
  AcceptInvitationRequest,
  AcceptInvitationResponse,
  GetConnectionsResponse,
  GetInvitationsResponse,
  CreateMemoryRequest,
  CreateMemoryResponse,
  GetMemoriesResponse,
  GetMemoryResponse,
  UpdateMemoryRequest,
  UpdateMemoryResponse,
  DeleteMemoryResponse,
  UpdateProfileRequest,
  UpdateProfileResponse,
} from './types';
