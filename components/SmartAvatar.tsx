import React from "react";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { cn } from "./ui/utils";

interface SmartAvatarProps {
  src?: string;
  alt?: string;
  fallback?: React.ReactNode;
  zoom?: number;
  rotation?: number;
  className?: string;
}

export function SmartAvatar({
  src,
  alt = "",
  fallback,
  zoom = 1,
  rotation = 0,
  className,
}: SmartAvatarProps) {
  return (
    <Avatar className={cn("ring-2 ring-background", className)}>
      <AvatarImage
        src={src}
        alt={alt}
        className="object-cover transition-transform duration-300"
        style={{
          transform: `scale(${zoom}) rotate(${rotation}deg)`,
          imageOrientation: "from-image",
        }}
      />
      <AvatarFallback>{fallback}</AvatarFallback>
    </Avatar>
  );
}
