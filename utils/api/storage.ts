/**
 * Supabase Storage Utilities for Adoras
 * Handles file uploads via backend API (which bypasses RLS)
 */

import { projectId, publicAnonKey } from '../supabase/info';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-deded1eb`;

export interface UploadFileOptions {
  userId: string;
  connectionId: string;
  file: File | Blob;
  fileName: string;
  accessToken: string; // Required for authenticated uploads
  onProgress?: (progress: number) => void; // Phase 3c: Progress callback
}

export interface UploadFileResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

/**
 * Upload a file via backend API (bypasses RLS)
 */
export async function uploadFile({
  userId,
  connectionId,
  file,
  fileName,
  accessToken,
  onProgress,
}: UploadFileOptions): Promise<UploadFileResult> {
  try {
    // Validate required parameters
    if (!fileName) {
      console.error('❌ Upload error: fileName is undefined or empty');
      throw new Error('File name is required for upload');
    }
    
    if (!userId || !connectionId) {
      console.error('❌ Upload error: userId or connectionId missing');
      throw new Error('User ID and connection ID are required');
    }

    if (!accessToken) {
      console.error('❌ Upload error: accessToken missing');
      throw new Error('Access token is required for authenticated uploads');
    }
    
    // Phase 3c: Simulate upload progress
    if (onProgress) {
      const fileSize = file.size;
      const estimatedDuration = Math.min(fileSize / (1024 * 100), 10000); // Max 10 seconds
      
      // Progress simulation: 0% → 30% → 60% → 90%
      onProgress(0);
      
      setTimeout(() => onProgress(30), estimatedDuration * 0.2);
      setTimeout(() => onProgress(60), estimatedDuration * 0.5);
      setTimeout(() => onProgress(90), estimatedDuration * 0.8);
    }

    // Create FormData for multipart upload
    const formData = new FormData();
    formData.append('file', file, fileName);
    formData.append('connectionId', connectionId);
    formData.append('fileName', fileName);

    // Upload via backend API
    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Upload failed');
    }

    // Progress: Complete
    if (onProgress) {
      onProgress(100);
    }

    return {
      success: true,
      url: result.url,
      path: result.path,
    };
  } catch (error) {
    console.error('File upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Upload photo and return URL
 */
export async function uploadPhoto(
  userId: string,
  connectionId: string,
  file: File,
  accessToken: string,
  onProgress?: (progress: number) => void
): Promise<UploadFileResult> {
  // Get file name with fallback
  const fileName = file.name || `photo-${Date.now()}.jpg`;
  
  return uploadFile({
    userId,
    connectionId,
    file,
    fileName,
    accessToken,
    onProgress,
  });
}

/**
 * Upload video and return URL
 */
export async function uploadVideo(
  userId: string,
  connectionId: string,
  file: File,
  accessToken: string,
  onProgress?: (progress: number) => void
): Promise<UploadFileResult> {
  // Get file name with fallback
  const fileName = file.name || `video-${Date.now()}.mp4`;
  
  return uploadFile({
    userId,
    connectionId,
    file,
    fileName,
    accessToken,
    onProgress,
  });
}

/**
 * Upload audio and return URL
 */
export async function uploadAudio(
  userId: string,
  connectionId: string,
  blob: Blob,
  accessToken: string,
  fileName: string = 'recording.webm',
  onProgress?: (progress: number) => void
): Promise<UploadFileResult> {
  // fileName already has a default value, but ensure it's not empty
  const finalFileName = fileName || `audio-${Date.now()}.webm`;
  
  return uploadFile({
    userId,
    connectionId,
    file: blob,
    fileName: finalFileName,
    accessToken,
    onProgress,
  });
}

/**
 * Upload document and return URL
 */
export async function uploadDocument(
  userId: string,
  connectionId: string,
  file: File,
  accessToken: string,
  onProgress?: (progress: number) => void
): Promise<UploadFileResult> {
  // Get file name with fallback
  const fileName = file.name || `document-${Date.now()}.pdf`;
  
  return uploadFile({
    userId,
    connectionId,
    file,
    fileName,
    accessToken,
    onProgress,
  });
}

/**
 * Get signed URL for a file
 */
export async function getSignedUrl(
  path: string,
  accessToken: string
): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/storage/signed-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ path }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to get signed URL');
    }

    return result.url;
  } catch (error) {
    console.error('Get signed URL error:', error);
    return null;
  }
}

/**
 * Delete a file from storage
 */
export async function deleteFile(
  path: string,
  accessToken: string
): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/storage/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ path }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to delete file');
    }

    return true;
  } catch (error) {
    console.error('Delete file error:', error);
    return false;
  }
}