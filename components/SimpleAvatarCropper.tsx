import React, { useState } from "react";
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

  const handleSave = () => {
    onSave(imageUrl, { zoom, rotation });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'Archivo' }}>Adjust Profile Photo</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          {/* Preview Circle */}
          <div className="relative w-64 h-64 rounded-full overflow-hidden bg-gray-100 ring-2 ring-primary/20">
            <div
              className="absolute inset-0 transition-transform duration-200"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                touchAction: "none",
              }}
            >
              <img
                src={imageUrl}
                alt="Crop preview"
                className="w-full h-full object-cover select-none pointer-events-none"
                draggable={false}
                style={{ imageOrientation: "from-image" }}
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
              />
              <ZoomIn className="w-5 h-5 text-muted-foreground" />
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setRotation((r) => (r + 90) % 360)}
            >
              <RotateCw className="w-4 h-4 mr-2" />
              Rotate
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Use Photo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
