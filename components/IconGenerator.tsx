import React, { useEffect, useRef } from 'react';

/**
 * IconGenerator - Generates Adoras app icons dynamically
 * This component creates PNG icons from canvas and makes them available
 * for PWA installation on iOS and other platforms
 */
export const IconGenerator: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to 512x512 (will be scaled down as needed)
    canvas.width = 512;
    canvas.height = 512;

    // Draw the Adoras icon
    drawAdorasIcon(ctx, 512);

    // Convert to blob and create object URL
    canvas.toBlob((blob) => {
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      
      // Update all apple-touch-icon links
      const touchIcons = document.querySelectorAll('link[rel="apple-touch-icon"]');
      touchIcons.forEach((icon) => {
        (icon as HTMLLinkElement).href = url;
      });

      // Update favicon
      const favicons = document.querySelectorAll('link[rel="icon"]');
      favicons.forEach((icon) => {
        if ((icon as HTMLLinkElement).type !== 'image/svg+xml') {
          (icon as HTMLLinkElement).href = url;
        }
      });

      // Store the icon URL for manifest updates
      (window as any).__adorasIconUrl = url;
    }, 'image/png');
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'none' }}
      aria-hidden="true"
    />
  );
};

/**
 * Draws the Adoras icon on a canvas context
 */
function drawAdorasIcon(ctx: CanvasRenderingContext2D, size: number) {
  // Colors from Adoras design system
  const ADORAS_GREEN = '#36453B';
  const ADORAS_BG = '#F5F9E9';
  const ADORAS_ACCENT = '#C1C1A5';

  // Draw background with rounded corners
  const cornerRadius = size * 0.2; // 20% corner radius for iOS style
  ctx.fillStyle = ADORAS_GREEN;
  roundRect(ctx, 0, 0, size, size, cornerRadius);
  ctx.fill();

  // Draw geometric "A" letter
  const centerX = size / 2;
  const centerY = size / 2;
  const scale = size / 512; // Scale factor based on 512px base

  // Main A triangle
  ctx.fillStyle = ADORAS_BG;
  ctx.strokeStyle = ADORAS_BG;
  ctx.lineWidth = 4 * scale;
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(centerX - 80 * scale, centerY + 100 * scale); // Bottom left
  ctx.lineTo(centerX, centerY - 100 * scale); // Top
  ctx.lineTo(centerX + 80 * scale, centerY + 100 * scale); // Bottom right
  ctx.lineTo(centerX + 50 * scale, centerY + 100 * scale); // Inner right
  ctx.lineTo(centerX, centerY); // Inner top
  ctx.lineTo(centerX - 50 * scale, centerY + 100 * scale); // Inner left
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Horizontal bar of A (creates the hole)
  ctx.fillStyle = ADORAS_GREEN;
  roundRect(
    ctx,
    centerX - 35 * scale,
    centerY + 20 * scale,
    70 * scale,
    20 * scale,
    2 * scale
  );
  ctx.fill();

  // Decorative elements
  // Top circle
  ctx.fillStyle = ADORAS_ACCENT;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.arc(centerX, centerY - 100 * scale, 12 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Bottom left circle
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.arc(centerX - 80 * scale, centerY + 100 * scale, 8 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Bottom right circle
  ctx.beginPath();
  ctx.arc(centerX + 80 * scale, centerY + 100 * scale, 8 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Subtle accent line at bottom
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = ADORAS_ACCENT;
  ctx.lineWidth = 3 * scale;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(centerX - 128 * scale, centerY + 154 * scale);
  ctx.lineTo(centerX + 128 * scale, centerY + 154 * scale);
  ctx.stroke();

  ctx.globalAlpha = 1;
}

/**
 * Draws a rounded rectangle
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export default IconGenerator;
