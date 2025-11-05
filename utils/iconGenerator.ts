/**
 * Icon Generator Utility
 * Generates PNG icons programmatically for iOS PWA support
 */

export interface IconConfig {
  size: number;
  filename: string;
  cornerRadius?: number;
}

export const ICON_CONFIGS: IconConfig[] = [
  { size: 180, filename: 'apple-touch-icon.png', cornerRadius: 30 },
  { size: 152, filename: 'apple-touch-icon-152.png', cornerRadius: 25 },
  { size: 120, filename: 'apple-touch-icon-120.png', cornerRadius: 20 },
  { size: 192, filename: 'icon-192.png', cornerRadius: 32 },
  { size: 512, filename: 'icon-512.png', cornerRadius: 85 },
];

/**
 * Generates a PNG icon with the Adoras logo
 * Falls back to a simple "A" text if the logo fails to load
 */
export async function generateIcon(
  config: IconConfig,
  logoUrl: string
): Promise<Blob> {
  const { size, cornerRadius = 0 } = config;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Draw background with rounded corners
  ctx.fillStyle = '#36453B'; // Adoras Green
  if (cornerRadius > 0) {
    // Draw rounded rectangle
    ctx.beginPath();
    ctx.moveTo(cornerRadius, 0);
    ctx.lineTo(size - cornerRadius, 0);
    ctx.quadraticCurveTo(size, 0, size, cornerRadius);
    ctx.lineTo(size, size - cornerRadius);
    ctx.quadraticCurveTo(size, size, size - cornerRadius, size);
    ctx.lineTo(cornerRadius, size);
    ctx.quadraticCurveTo(0, size, 0, size - cornerRadius);
    ctx.lineTo(0, cornerRadius);
    ctx.quadraticCurveTo(0, 0, cornerRadius, 0);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillRect(0, 0, size, size);
  }

  try {
    // Try to load and draw the logo
    const img = await loadImage(logoUrl);
    
    // Calculate padding (10% of size)
    const padding = size * 0.1;
    const logoSize = size - (padding * 2);
    
    // Draw logo centered
    ctx.drawImage(img, padding, padding, logoSize, logoSize);
  } catch (error) {
    console.warn('Failed to load logo, using fallback:', error);
    
    // Fallback: Draw simple "A" text
    ctx.fillStyle = '#F5F9E9'; // Adoras BG color
    ctx.font = `bold ${size * 0.4}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('A', size / 2, size / 2);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to generate blob'));
      }
    }, 'image/png');
  });
}

/**
 * Helper to load an image
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => resolve(img);
    img.onerror = reject;
    
    img.src = src;
  });
}

/**
 * Converts a Blob to a data URL
 */
export async function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Generates all icons and returns them as data URLs
 */
export async function generateAllIcons(logoUrl: string): Promise<Map<string, string>> {
  const iconMap = new Map<string, string>();

  for (const config of ICON_CONFIGS) {
    try {
      const blob = await generateIcon(config, logoUrl);
      const dataURL = await blobToDataURL(blob);
      iconMap.set(config.filename, dataURL);
    } catch (error) {
      console.error(`Failed to generate ${config.filename}:`, error);
    }
  }

  return iconMap;
}

/**
 * Downloads an icon blob as a file
 */
export function downloadIcon(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
