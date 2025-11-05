/**
 * Video Thumbnail Utility
 * Extracts a thumbnail frame from video files
 */

/**
 * Extract a thumbnail from a video file or blob URL
 * @param videoSource - File object or blob URL
 * @param timeInSeconds - Time position to capture (default: 1 second)
 * @returns Data URL of the thumbnail image
 */
export async function extractVideoThumbnail(
  videoSource: File | Blob | string,
  timeInSeconds: number = 1
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';

      // Create object URL if source is File/Blob
      let videoUrl: string;
      let shouldRevoke = false;

      if (typeof videoSource === 'string') {
        videoUrl = videoSource;
      } else {
        videoUrl = URL.createObjectURL(videoSource);
        shouldRevoke = true;
      }

      video.addEventListener('loadedmetadata', () => {
        // Ensure we don't seek beyond video duration
        const seekTime = Math.min(timeInSeconds, video.duration * 0.1); // Use 10% of duration if 1s is too long
        video.currentTime = seekTime;
      });

      video.addEventListener('seeked', () => {
        try {
          // Create canvas to draw video frame
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('Could not get canvas context');
          }

          // Draw current video frame to canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Convert canvas to data URL (JPEG for smaller size)
          const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.8);

          // Clean up
          if (shouldRevoke) {
            URL.revokeObjectURL(videoUrl);
          }

          resolve(thumbnailDataUrl);
        } catch (error) {
          console.error('Error capturing video frame:', error);
          reject(error);
        }
      });

      video.addEventListener('error', (e) => {
        console.error('Video loading error:', e);
        if (shouldRevoke) {
          URL.revokeObjectURL(videoUrl);
        }
        reject(new Error('Failed to load video for thumbnail extraction'));
      });

      // Start loading video
      video.src = videoUrl;
    } catch (error) {
      console.error('Error in extractVideoThumbnail:', error);
      reject(error);
    }
  });
}

/**
 * Extract a thumbnail and convert to Blob for upload
 */
export async function extractVideoThumbnailBlob(
  videoSource: File | Blob | string,
  timeInSeconds: number = 1
): Promise<Blob> {
  const dataUrl = await extractVideoThumbnail(videoSource, timeInSeconds);
  
  // Convert data URL to Blob
  const response = await fetch(dataUrl);
  return response.blob();
}
