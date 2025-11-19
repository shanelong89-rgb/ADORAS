import React from "react";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { cn } from "./ui/utils";

interface SmartAvatarProps {
  src?: string;
  alt?: string;
  fallback?: React.ReactNode;
  fallbackClassName?: string;
  zoom?: number;
  rotation?: number;
  className?: string;
}

/**
 * SmartAvatar - Avatar component with CSS transform support
 * 
 * Works at ANY size - the transform scales proportionally!
 * - Small sidebar avatars (w-9 h-9)
 * - Medium avatars (w-14 h-14)
 * - Large avatars (w-24 h-24)
 * 
 * The zoom/rotation applies the same way regardless of size.
 */
export function SmartAvatar({
  src,
  alt = "",
  fallback,
  fallbackClassName,
  zoom = 1,
  rotation = 0,
  className,
}: SmartAvatarProps) {
  return (
    <Avatar className={cn(className)}>
      {src ? (
        <div className="w-full h-full overflow-hidden rounded-full">
          <img
            src={src}
            alt={alt}
            className="w-full h-full"
            style={{
              objectFit: 'cover',
              objectPosition: 'center center',
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
              imageOrientation: "from-image",
            }}
          />
        </div>
      ) : (
        <AvatarFallback className={fallbackClassName}>
          {fallback}
        </AvatarFallback>
      )}
    </Avatar>
  );
}
