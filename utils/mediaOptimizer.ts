/**
 * Media Optimization Utility for Adoras
 * Phase 3d: Compress and optimize media files before upload
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1, where 1 is highest quality
  maxSizeKB?: number;
}

export interface OptimizationResult {
  success: boolean;
  file?: File | Blob;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  error?: string;
}

// Default compression settings
const DEFAULT_IMAGE_OPTIONS: CompressionOptions = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.85,
  maxSizeKB: 5000, // 5MB max
};

const DEFAULT_VIDEO_OPTIONS = {
  maxSizeKB: 50000, // 50MB max for videos
};

const DEFAULT_AUDIO_OPTIONS = {
  maxSizeKB: 10000, // 10MB max for audio
};

/**
 * Compress an image file
 * Resizes to max dimensions and compresses to target quality
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<OptimizationResult> {
  const {
    maxWidth = DEFAULT_IMAGE_OPTIONS.maxWidth!,
    maxHeight = DEFAULT_IMAGE_OPTIONS.maxHeight!,
    quality = DEFAULT_IMAGE_OPTIONS.quality!,
    maxSizeKB = DEFAULT_IMAGE_OPTIONS.maxSizeKB!,
  } = options;

  const originalSize = file.size;

  try {
    // Check if file exceeds max size
    if (originalSize > maxSizeKB * 1024) {
      return {
        success: false,
        originalSize,
        optimizedSize: originalSize,
        compressionRatio: 1,
        error: `Image size (${(originalSize / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${(maxSizeKB / 1024).toFixed(0)}MB)`,
      };
    }

    // Create image element
    const img = await createImageFromFile(file);
    
    // Calculate new dimensions maintaining aspect ratio
    const { width, height } = calculateOptimalDimensions(
      img.width,
      img.height,
      maxWidth,
      maxHeight
    );

    // If image is already smaller than max dimensions and within size limit, return original
    if (img.width <= maxWidth && img.height <= maxHeight && originalSize <= maxSizeKB * 1024 * 0.8) {
      console.log('✅ Image already optimized, skipping compression');
      return {
        success: true,
        file,
        originalSize,
        optimizedSize: originalSize,
        compressionRatio: 1,
      };
    }

    // Create canvas and draw resized image
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Use high-quality image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Draw image
    ctx.drawImage(img, 0, 0, width, height);

    // Convert to blob with compression
    const blob = await canvasToBlob(canvas, file.type, quality);
    
    const optimizedSize = blob.size;
    const compressionRatio = originalSize / optimizedSize;

    console.log(`📦 Image compressed: ${(originalSize / 1024).toFixed(1)}KB → ${(optimizedSize / 1024).toFixed(1)}KB (${compressionRatio.toFixed(2)}x)`);

    // Create File object from Blob to preserve filename
    const optimizedFile = new File([blob], file.name, {
      type: blob.type,
      lastModified: Date.now(),
    });

    return {
      success: true,
      file: optimizedFile,
      originalSize,
      optimizedSize,
      compressionRatio,
    };
  } catch (error) {
    console.error('❌ Image compression error:', error);
    return {
      success: false,
      originalSize,
      optimizedSize: originalSize,
      compressionRatio: 1,
      error: error instanceof Error ? error.message : 'Compression failed',
    };
  }
}

/**
 * Validate video file size
 * Note: Video compression is complex and requires server-side processing
 * For now, we just validate size and provide guidance
 */
export async function validateVideo(
  file: File,
  options: { maxSizeKB?: number } = {}
): Promise<OptimizationResult> {
  const { maxSizeKB = DEFAULT_VIDEO_OPTIONS.maxSizeKB } = options;
  const fileSize = file.size;

  if (fileSize > maxSizeKB * 1024) {
    return {
      success: false,
      originalSize: fileSize,
      optimizedSize: fileSize,
      compressionRatio: 1,
      error: `Video size (${(fileSize / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${(maxSizeKB / 1024).toFixed(0)}MB). Please use a shorter video or compress it before uploading.`,
    };
  }

  return {
    success: true,
    file,
    originalSize: fileSize,
    optimizedSize: fileSize,
    compressionRatio: 1,
  };
}

/**
 * Validate audio file size
 */
export async function validateAudio(
  blob: Blob,
  options: { maxSizeKB?: number } = {}
): Promise<OptimizationResult> {
  const { maxSizeKB = DEFAULT_AUDIO_OPTIONS.maxSizeKB } = options;
  const fileSize = blob.size;

  if (fileSize > maxSizeKB * 1024) {
    return {
      success: false,
      originalSize: fileSize,
      optimizedSize: fileSize,
      compressionRatio: 1,
      error: `Audio size (${(fileSize / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${(maxSizeKB / 1024).toFixed(0)}MB). Please record a shorter message.`,
    };
  }

  return {
    success: true,
    file: blob,
    originalSize: fileSize,
    optimizedSize: fileSize,
    compressionRatio: 1,
  };
}

/**
 * Helper: Create an Image element from a File
 */
function createImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
}

/**
 * Helper: Calculate optimal dimensions maintaining aspect ratio
 */
function calculateOptimalDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let width = originalWidth;
  let height = originalHeight;

  // Calculate aspect ratio
  const aspectRatio = width / height;

  // Resize if width exceeds max
  if (width > maxWidth) {
    width = maxWidth;
    height = Math.round(width / aspectRatio);
  }

  // Resize if height exceeds max
  if (height > maxHeight) {
    height = maxHeight;
    width = Math.round(height * aspectRatio);
  }

  return { width, height };
}

/**
 * Helper: Convert canvas to Blob
 */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      },
      mimeType,
      quality
    );
  });
}

/**
 * Get human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Check if file type is supported for compression
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

export function isVideoFile(file: File | Blob): boolean {
  return file.type.startsWith('video/');
}

export function isAudioFile(file: File | Blob): boolean {
  return file.type.startsWith('audio/');
}
