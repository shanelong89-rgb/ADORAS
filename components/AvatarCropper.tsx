import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

interface AvatarCropperProps {
  imageUrl: string;
  onCropComplete: (croppedImageUrl: string) => void;
  onCancel: () => void;
  isOpen: boolean;
}

export function AvatarCropper({ imageUrl, onCropComplete, onCancel, isOpen }: AvatarCropperProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [rotation, setRotation] = useState(0);
  const [minScale, setMinScale] = useState(1);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const imageBitmapRef = useRef<ImageBitmap | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const CROP_SIZE = 300; // Size of the circular crop area

  // Load image with automatic EXIF orientation correction using createImageBitmap
  useEffect(() => {
    if (!imageUrl) return;
    
    const loadImage = async () => {
      try {
        // Convert data URL to blob
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        
        // Use createImageBitmap with imageOrientation: 'from-image' to auto-correct EXIF
        const imageBitmap = await createImageBitmap(blob, {
          imageOrientation: 'from-image' // This automatically corrects EXIF orientation
        });
        
        console.log('✅ Image loaded with dimensions:', imageBitmap.width, 'x', imageBitmap.height);
        
        // Store the bitmap
        imageBitmapRef.current = imageBitmap;
        
        // Create an Image element for the canvas operations
        const img = new Image();
        img.onload = () => {
          imageRef.current = img;
          setImageSize({ width: imageBitmap.width, height: imageBitmap.height });
          
          // Calculate minimum scale to ensure the image ALWAYS covers the entire circle
          // The smallest dimension of the image must be at least as large as the circle diameter
          const minDimension = Math.min(imageBitmap.width, imageBitmap.height);
          const minScale = CROP_SIZE / minDimension;
          
          // Start with 10% more than minimum to ensure full coverage without black edges
          const initialScale = minScale * 1.1;
          
          console.log('🔎 Min dimension:', minDimension, 'Min scale:', minScale, 'Initial scale:', initialScale);
          setScale(initialScale);
          setPosition({ x: 0, y: 0 });
          setRotation(0);
          setMinScale(minScale);
        };
        
        // Create a canvas to convert the bitmap to a data URL
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = imageBitmap.width;
        tempCanvas.height = imageBitmap.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.drawImage(imageBitmap, 0, 0);
          img.src = tempCanvas.toDataURL();
        }
      } catch (error) {
        console.error('❌ Error loading image:', error);
        // Fallback to regular image loading
        const img = new Image();
        img.onload = () => {
          imageRef.current = img;
          setImageSize({ width: img.width, height: img.height });
          const minDimension = Math.min(img.width, img.height);
          const minScale = CROP_SIZE / minDimension;
          setScale(minScale * 1.1);
          setPosition({ x: 0, y: 0 });
          setRotation(0);
          setMinScale(minScale);
        };
        img.src = imageUrl;
      }
    };
    
    loadImage();
    
    // Cleanup
    return () => {
      if (imageBitmapRef.current) {
        imageBitmapRef.current.close();
      }
    };
  }, [imageUrl]);

  // Draw image on canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // IMPORTANT: Canvas internal resolution = 2x display size for crisp rendering
    // Display size: 300x300, Internal resolution: 600x600
    const displaySize = CROP_SIZE;
    const pixelRatio = 2;
    const outputSize = displaySize * pixelRatio;
    
    canvas.width = outputSize;
    canvas.height = outputSize;
    
    // Clear canvas with white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, outputSize, outputSize);
    
    // Save context state
    ctx.save();
    
    // Move to center of canvas
    ctx.translate(outputSize / 2, outputSize / 2);
    
    // Apply rotation
    ctx.rotate((rotation * Math.PI) / 180);
    
    // Calculate image dimensions in OUTPUT space (600x600)
    // Scale is relative to display size (300), so we multiply by pixelRatio
    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;
    
    // Convert to output resolution
    const outputWidth = scaledWidth * pixelRatio;
    const outputHeight = scaledHeight * pixelRatio;
    
    // Position is in display coordinates, convert to output coordinates
    const outputX = position.x * pixelRatio;
    const outputY = position.y * pixelRatio;
    
    // Draw image centered with no clipping (saves full square)
    ctx.drawImage(
      img,
      -outputWidth / 2 + outputX,
      -outputHeight / 2 + outputY,
      outputWidth,
      outputHeight
    );
    
    // Restore context
    ctx.restore();
    
    console.log('🎨 Canvas:', { 
      displaySize, 
      outputSize, 
      scale, 
      position, 
      scaledWidth, 
      scaledHeight,
      outputWidth,
      outputHeight 
    });
  }, [scale, position, rotation]);

  // Redraw when dependencies change
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Handle mouse/touch start
  const handleDragStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    setDragStart({ x: clientX - position.x, y: clientY - position.y });
  };

  // Handle mouse/touch move
  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return;
    
    const newX = clientX - dragStart.x;
    const newY = clientY - dragStart.y;
    
    setPosition({ x: newX, y: newY });
  }, [isDragging, dragStart]);

  // Handle mouse/touch end
  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX, e.clientY);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    handleDragMove(e.clientX, e.clientY);
  }, [handleDragMove]);

  const handleMouseUp = useCallback(() => {
    handleDragEnd();
  }, []);

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      handleDragStart(touch.clientX, touch.clientY);
    }
  };

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 1) {
      e.preventDefault(); // Prevent scrolling
      const touch = e.touches[0];
      handleDragMove(touch.clientX, touch.clientY);
    }
  }, [handleDragMove]);

  const handleTouchEnd = useCallback(() => {
    handleDragEnd();
  }, []);

  // Add/remove event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Handle crop and save
  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Ensure scale is at least the minimum to prevent white edges
    if (scale < minScale) {
      console.warn('⚠️ Scale too small, adjusting to minimum:', minScale);
      setScale(minScale * 1.05);
      // Redraw with correct scale then save
      setTimeout(() => {
        // Export as JPEG (standard for avatar images with solid background)
        const croppedImageUrl = canvas.toDataURL('image/jpeg', 0.95);
        onCropComplete(croppedImageUrl);
      }, 100);
      return;
    }
    
    // Verify canvas dimensions before export
    console.log('💾 Saving avatar:', {
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      isSquare: canvas.width === canvas.height,
      ratio: canvas.width / canvas.height
    });
    
    // Export as JPEG with high quality (like Instagram/Facebook)
    const croppedImageUrl = canvas.toDataURL('image/jpeg', 0.95);
    console.log('✅ Avatar exported - Scale:', scale, 'Min scale:', minScale);
    onCropComplete(croppedImageUrl);
  };

  // Handle rotate
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Your Photo</DialogTitle>
          <DialogDescription>
            Drag the image to reposition, use the slider to zoom, or rotate to adjust your profile photo.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Crop Preview */}
          <div className="flex justify-center">
            <div 
              ref={containerRef}
              className="relative bg-gray-100 rounded-full overflow-hidden"
              style={{ 
                width: CROP_SIZE, 
                height: CROP_SIZE,
                cursor: isDragging ? 'grabbing' : 'grab',
                touchAction: 'none'
              }}
            >
              <canvas
                ref={canvasRef}
                className="w-full h-full"
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                style={{ 
                  display: 'block',
                  width: '100%',
                  height: '100%'
                }}
              />
              
              {/* Instruction overlay - only show when not dragging */}
              {!isDragging && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-black/50 text-white text-xs px-3 py-1.5 rounded-full">
                    Drag to reposition
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Zoom Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Zoom</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRotate}
                className="h-8 px-2"
              >
                <RotateCw className="w-4 h-4 mr-1" />
                Rotate
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <ZoomOut className="w-4 h-4 text-muted-foreground" />
              <Slider
                value={[scale]}
                min={minScale}
                max={3}
                step={0.01}
                onValueChange={(value) => setScale(value[0])}
                className="flex-1"
              />
              <ZoomIn className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          {/* Help Text */}
          <p className="text-xs text-center text-muted-foreground">
            Drag the image to adjust the crop area. Use the slider to zoom in/out.
          </p>
        </div>

        <DialogFooter className="sm:space-x-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-primary">
            Save Photo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
