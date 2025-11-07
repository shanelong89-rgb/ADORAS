import { Hono } from "npm:hono";

const app = new Hono();

// The source icon from Shopify
const ICON_SOURCE_URL = 'https://cdn.shopify.com/s/files/1/0504/5963/9996/files/touchicon.png?v=1761317408';

/**
 * Fetch and resize icon to specified dimensions
 * This serves as a proxy for the touch icons, fetching from Shopify
 * and returning the proper PNG format for iOS/Android
 */
async function fetchAndResizeIcon(size: number): Promise<Response> {
  try {
    // Fetch the source image from Shopify
    const response = await fetch(ICON_SOURCE_URL);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch icon: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    
    // If it's already a PNG and the right size, we can just pass it through
    // For simplicity, we'll just return the fetched image with proper headers
    const imageBuffer = await response.arrayBuffer();
    
    return new Response(imageBuffer, {
      headers: {
        'Content-Type': contentType || 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error(`Error fetching icon (size ${size}):`, error);
    
    // Return a simple colored square as fallback
    const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="#36453B"/>
      <text x="50%" y="50%" font-size="${size * 0.3}" fill="#F5F9E9" text-anchor="middle" dy=".3em" font-family="Arial">A</text>
    </svg>`;
    
    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }
}

/**
 * GET /make-server-deded1eb/icons/apple-touch-icon.png
 * Serves 180x180 icon for iOS default
 */
app.get('/make-server-deded1eb/icons/apple-touch-icon.png', async (c) => {
  return await fetchAndResizeIcon(180);
});

/**
 * GET /make-server-deded1eb/icons/apple-touch-icon-152.png
 * Serves 152x152 icon for iPad
 */
app.get('/make-server-deded1eb/icons/apple-touch-icon-152.png', async (c) => {
  return await fetchAndResizeIcon(152);
});

/**
 * GET /make-server-deded1eb/icons/apple-touch-icon-120.png
 * Serves 120x120 icon for iPhone
 */
app.get('/make-server-deded1eb/icons/apple-touch-icon-120.png', async (c) => {
  return await fetchAndResizeIcon(120);
});

/**
 * GET /make-server-deded1eb/icons/icon-192.png
 * Serves 192x192 icon for Android
 */
app.get('/make-server-deded1eb/icons/icon-192.png', async (c) => {
  return await fetchAndResizeIcon(192);
});

/**
 * GET /make-server-deded1eb/icons/icon-512.png
 * Serves 512x512 icon for PWA splash screen
 */
app.get('/make-server-deded1eb/icons/icon-512.png', async (c) => {
  return await fetchAndResizeIcon(512);
});

export default app;
