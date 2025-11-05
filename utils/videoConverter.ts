/**
 * Video Converter Utility for Adoras
 * Converts .MOV and other formats to web-compatible MP4
 */

export interface VideoConversionResult {
  success: boolean;
  file?: File | Blob;
  originalSize: number;
  convertedSize: number;
  format: string;
  error?: string;
}

/**
 * Check if video needs conversion (e.g., .MOV files)
 */
export function needsConversion(file: File): boolean {
  const fileName = file.name.toLowerCase();
  const needsConversionFormats = ['.mov', '.qt', '.avi', '.wmv', '.flv'];
  return needsConversionFormats.some(format => fileName.endsWith(format));
}

/**
 * Check if browser can play the video format
 */
export async function canPlayVideo(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      // If we can load metadata, the format is supported
      resolve(true);
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(url);
      // Error loading means format not supported
      resolve(false);
    };
    
    video.src = url;
    
    // Timeout after 3 seconds
    setTimeout(() => {
      URL.revokeObjectURL(url);
      resolve(false);
    }, 3000);
  });
}

/**
 * Convert video to MP4 using canvas and MediaRecorder
 * This works for .MOV files that can be decoded but not directly played
 */
export async function convertVideoToMP4(
  file: File,
  onProgress?: (progress: number) => void
): Promise<VideoConversionResult> {
  const originalSize = file.size;
  
  try {
    console.log('🎬 Starting video conversion:', {
      name: file.name,
      type: file.type,
      size: `${(originalSize / 1024 / 1024).toFixed(2)}MB`
    });
    
    // First, try to see if we can play it directly (Safari can play .MOV)
    const canPlay = await canPlayVideo(file);
    
    if (canPlay && !needsConversion(file)) {
      console.log('✅ Video format is already web-compatible');
      return {
        success: true,
        file,
        originalSize,
        convertedSize: originalSize,
        format: file.type || 'video/mp4',
      };
    }
    
    // Check if the video can be decoded even if not playable
    const videoElement = document.createElement('video');
    const videoUrl = URL.createObjectURL(file);
    
    // Load the video with timeout
    try {
      await Promise.race([
        new Promise<void>((resolve, reject) => {
          videoElement.onloadedmetadata = () => {
            console.log('✅ Video metadata loaded:', {
              width: videoElement.videoWidth,
              height: videoElement.videoHeight,
              duration: videoElement.duration
            });
            resolve();
          };
          videoElement.onerror = (e) => {
            console.error('❌ Video loading error:', e);
            reject(new Error(`Failed to load video: ${videoElement.error?.message || 'Unknown error'}`));
          };
          videoElement.src = videoUrl;
        }),
        new Promise<void>((_, reject) => 
          setTimeout(() => reject(new Error('Video loading timeout - file may be too large or codec unsupported')), 10000)
        )
      ]);
    } catch (error) {
      URL.revokeObjectURL(videoUrl);
      throw error;
    }
    
    onProgress?.(10);
    
    // Create canvas to draw video frames
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth || 1280;
    canvas.height = videoElement.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    
    console.log(`📐 Video dimensions: ${canvas.width}x${canvas.height}`);
    
    onProgress?.(20);
    
    // Create MediaStream from canvas
    const stream = canvas.captureStream(30); // 30 fps
    
    // Check for supported MIME types
    const mimeTypes = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4',
    ];
    
    let selectedMimeType = '';
    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        selectedMimeType = mimeType;
        console.log('✅ Using MIME type:', mimeType);
        break;
      }
    }
    
    if (!selectedMimeType) {
      throw new Error('No supported video format found in this browser');
    }
    
    onProgress?.(30);
    
    // Create MediaRecorder to record the canvas stream
    const chunks: Blob[] = [];
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: selectedMimeType,
      videoBitsPerSecond: 2500000, // 2.5 Mbps
    });
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };
    
    // Start recording
    mediaRecorder.start(100); // Collect data every 100ms
    
    // Play and draw video frames
    videoElement.currentTime = 0;
    await videoElement.play();
    
    const duration = videoElement.duration;
    let lastTime = 0;
    
    const drawFrame = () => {
      if (videoElement.currentTime >= duration || videoElement.ended || videoElement.paused) {
        return;
      }
      
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      
      // Update progress
      const progress = 30 + (videoElement.currentTime / duration) * 60;
      onProgress?.(Math.min(progress, 90));
      
      requestAnimationFrame(drawFrame);
    };
    
    requestAnimationFrame(drawFrame);
    
    // Wait for video to finish
    await new Promise<void>((resolve) => {
      videoElement.onended = () => resolve();
      // Fallback timeout (max 5 minutes)
      setTimeout(() => resolve(), 5 * 60 * 1000);
    });
    
    // Stop recording
    mediaRecorder.stop();
    
    onProgress?.(95);
    
    // Wait for final chunks
    await new Promise<void>((resolve) => {
      mediaRecorder.onstop = () => resolve();
      setTimeout(() => resolve(), 1000);
    });
    
    // Cleanup
    URL.revokeObjectURL(videoUrl);
    stream.getTracks().forEach(track => track.stop());
    
    // Create final blob
    const convertedBlob = new Blob(chunks, { type: selectedMimeType });
    const convertedSize = convertedBlob.size;
    
    onProgress?.(100);
    
    // Create File object
    const outputFileName = file.name.replace(/\.[^.]+$/, '.webm');
    const convertedFile = new File([convertedBlob], outputFileName, {
      type: selectedMimeType,
      lastModified: Date.now(),
    });
    
    console.log(`✅ Video converted: ${(originalSize / 1024 / 1024).toFixed(2)}MB → ${(convertedSize / 1024 / 1024).toFixed(2)}MB`);
    
    // IMPORTANT: Test if the converted video is actually playable
    const testVideoUrl = URL.createObjectURL(convertedFile);
    const canPlayConverted = await new Promise<boolean>((resolve) => {
      const testVideo = document.createElement('video');
      testVideo.onloadedmetadata = () => {
        URL.revokeObjectURL(testVideoUrl);
        console.log('✅ Converted video is playable');
        resolve(true);
      };
      testVideo.onerror = (e) => {
        URL.revokeObjectURL(testVideoUrl);
        console.error('❌ Converted video is NOT playable:', e);
        resolve(false);
      };
      testVideo.src = testVideoUrl;
      // Timeout after 3 seconds
      setTimeout(() => {
        URL.revokeObjectURL(testVideoUrl);
        resolve(false);
      }, 3000);
    });
    
    // If converted video isn't playable, return original file with warning
    if (!canPlayConverted) {
      console.warn('⚠️ Conversion created unplayable video - using original file');
      return {
        success: false,
        file,
        originalSize,
        convertedSize: originalSize,
        format: file.type,
        error: 'Converted video is not playable - using original format',
      };
    }
    
    return {
      success: true,
      file: convertedFile,
      originalSize,
      convertedSize,
      format: selectedMimeType,
    };
    
  } catch (error) {
    console.error('❌ Video conversion error:', error);
    
    // Return original file as fallback
    return {
      success: false,
      file,
      originalSize,
      convertedSize: originalSize,
      format: file.type,
      error: error instanceof Error ? error.message : 'Conversion failed - using original format',
    };
  }
}

/**
 * Quick check if video is playable, and provide helpful message if not
 */
export async function getVideoPlayabilityInfo(file: File): Promise<{
  canPlay: boolean;
  needsConversion: boolean;
  message: string;
}> {
  const needsConv = needsConversion(file);
  const canPlay = await canPlayVideo(file);
  
  if (canPlay) {
    return {
      canPlay: true,
      needsConversion: false,
      message: 'Video is ready to play',
    };
  }
  
  if (needsConv) {
    return {
      canPlay: false,
      needsConversion: true,
      message: 'Video will be converted to web-compatible format',
    };
  }
  
  return {
    canPlay: false,
    needsConversion: true,
    message: 'Video format may not be supported - will attempt conversion',
  };
}