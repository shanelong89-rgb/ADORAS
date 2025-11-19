import React, { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { ZoomIn, ZoomOut, RotateCw } from "lucide-react";

export interface CropSettings {
  zoom: number;
  rotation: number;
}

interface SimpleAvatarCropperProps {
  imageUrl: string;
  onSave: (imageUrl: string, settings: CropSettings) => void;
  onCancel: () => void;
  open: boolean;
  initialZoom?: number;
  initialRotation?: number;
}

export function SimpleAvatarCropper({
  imageUrl,
  onSave,
  onCancel,
  open,
  initialZoom = 1.2,
  initialRotation = 0,
}: SimpleAvatarCropperProps) {
  const [zoom, setZoom] = useState(initialZoom);
  const [rotation, setRotation] = useState(initialRotation);
  const imageRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isGesturing, setIsGesturing] = useState(false);
  
  // Reset zoom and rotation when dialog opens or image changes
  useEffect(() => {
    if (open) {
      setZoom(initialZoom);
      setRotation(initialRotation);
      setIsGesturing(false);
    }
  }, [open, imageUrl, initialZoom, initialRotation]);
  
  // Touch gesture support
  const touchState = useRef({
    lastDistance: 0,
    lastAngle: 0,
  });

  const getDistance = (touches: TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getAngle = (touches: TouchList) => {
    const dx = touches[1].clientX - touches[0].clientX;
    const dy = touches[1].clientY - touches[0].clientY;
    return Math.atan2(dy, dx) * (180 / Math.PI);
  };

  // Use native event listeners for better touch control
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !open) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        setIsGesturing(true);
        touchState.current.lastDistance = getDistance(e.touches);
        touchState.current.lastAngle = getAngle(e.touches);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        
        // Pinch to zoom
        const distance = getDistance(e.touches);
        const scale = distance / touchState.current.lastDistance;
        setZoom((z) => Math.min(3, Math.max(1, z * scale)));
        touchState.current.lastDistance = distance;

        // Two-finger rotation
        const angle = getAngle(e.touches);
        const angleDiff = angle - touchState.current.lastAngle;
        setRotation((r) => (r + angleDiff) % 360);
        touchState.current.lastAngle = angle;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        setIsGesturing(false);
      }
    };

    // Add event listeners with passive: false to allow preventDefault
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [open]);

  const handleSave = () => {
    onSave(imageUrl, { zoom, rotation });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent 
        className="max-w-sm" 
        style={{ touchAction: 'none' }}
        data-avatar-cropper="true"
      >
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'Archivo' }}>Adjust Profile Photo</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          {/* Gesture hint */}
          {!isGesturing && (
            <p className="text-sm text-muted-foreground text-center px-4" style={{ fontFamily: 'Inter' }}>
              Use two fingers to pinch and zoom, or rotate
            </p>
          )}
          
          {/* Preview Circle */}
          <div 
            className={`relative w-64 h-64 rounded-full overflow-hidden bg-gray-100 transition-all ${
              isGesturing ? 'ring-4 ring-primary/40 scale-[1.02]' : 'ring-2 ring-primary/20'
            }`}
            ref={containerRef}
            style={{ touchAction: 'none' }}
          >
            <div
              ref={imageRef}
              className="absolute inset-0 transition-transform duration-200"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: 'center center',
                touchAction: "none",
              }}
            >
              <img
                src={imageUrl}
                alt="Crop preview"
                className="w-full h-full object-cover select-none pointer-events-none"
                draggable={false}
                style={{ 
                  imageOrientation: "from-image",
                  touchAction: "none",
                  userSelect: "none",
                  WebkitUserSelect: "none",
                }}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="w-full space-y-4">
            <div className="flex items-center gap-3">
              <ZoomOut className="w-5 h-5 text-muted-foreground" />
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                style={{ touchAction: 'auto' }}
              />
              <ZoomIn className="w-5 h-5 text-muted-foreground" />
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              style={{ fontFamily: 'Inter' }}
            >
              <RotateCw className="w-4 h-4 mr-2" />
              Rotate
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} style={{ fontFamily: 'Inter' }}>
            Cancel
          </Button>
          <Button onClick={handleSave} style={{ fontFamily: 'Inter' }}>
            Use Photo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
