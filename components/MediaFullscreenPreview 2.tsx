import React, { useEffect, useRef, useState } from 'react';
import { X, Play, Pause } from 'lucide-react';
import { Button } from './ui/button';

interface MediaFullscreenPreviewProps {
  type: 'photo' | 'video';
  url: string;
  title?: string;
  onClose: () => void;
}

export function MediaFullscreenPreview({ type, url, title, onClose }: MediaFullscreenPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    
    // Prevent body scroll when fullscreen is open
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  // Auto-play video when opened
  useEffect(() => {
    if (type === 'video' && videoRef.current) {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.error('Auto-play failed:', err);
      });
    }
  }, [type]);

  const handleVideoClick = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    // Only close if clicking the overlay itself, not the media
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      {/* Close Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-[10000] bg-black/50 hover:bg-black/70 text-white rounded-full w-10 h-10 backdrop-blur-sm"
        onClick={onClose}
      >
        <X className="w-6 h-6" />
      </Button>

      {/* Title */}
      {title && (
        <div className="absolute top-4 left-4 z-[10000] bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-lg max-w-[calc(100vw-120px)]">
          <p className="text-sm truncate">{title}</p>
        </div>
      )}

      {/* Media Content */}
      <div className="w-full h-full flex items-center justify-center p-4">
        {type === 'photo' && (
          <img
            src={url}
            alt={title || 'Photo preview'}
            className="max-w-full max-h-full object-contain"
            style={{
              maxWidth: '100vw',
              maxHeight: '100vh',
              width: 'auto',
              height: 'auto'
            }}
          />
        )}

        {type === 'video' && (
          <div className="relative w-full h-full flex items-center justify-center">
            <video
              ref={videoRef}
              src={url}
              className="max-w-full max-h-full"
              style={{
                maxWidth: '100vw',
                maxHeight: '100vh',
                width: 'auto',
                height: 'auto'
              }}
              playsInline
              controls
              preload="metadata"
              crossOrigin="anonymous"
              onClick={handleVideoClick}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            />
            
            {/* Video Play/Pause Overlay - only show when paused */}
            {!isPlaying && (
              <div 
                className="absolute inset-0 flex items-center justify-center cursor-pointer"
                onClick={handleVideoClick}
              >
                <div className="bg-white/90 rounded-full w-16 h-16 flex items-center justify-center shadow-2xl">
                  <Play className="w-8 h-8 text-black ml-1" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tap hint for mobile */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white/60 text-xs">
        Tap outside to close
      </div>
    </div>
  );
}
