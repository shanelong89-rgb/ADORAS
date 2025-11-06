import { useEffect } from 'react';
import { generateAllIcons } from '../utils/iconGenerator';

// The Shopify icon URL
const SHOPIFY_ICON_URL = 'https://cdn.shopify.com/s/files/1/0504/5963/9996/files/touchicon.png?v=1761317408';

/**
 * PWAMetaTags Component
 * Programmatically injects all PWA meta tags and icons into document head
 * This ensures they're present even if index.html is not being used properly
 */
export const PWAMetaTags: React.FC = () => {
  useEffect(() => {
    const setupPWA = async () => {
      // Clear existing PWA tags to avoid duplicates
      const existingAppleIcons = document.querySelectorAll('link[rel="apple-touch-icon"]');
      existingAppleIcons.forEach(icon => icon.remove());
      
      const existingManifest = document.querySelector('link[rel="manifest"]');
      if (existingManifest) existingManifest.remove();

      // Get the current origin
      const origin = window.location.origin;

      // 1. iOS Web App Meta Tags (Enhanced for notifications and fullscreen)
      const metaTags = [
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'Adoras' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'theme-color', content: '#36453B' },
        { name: 'msapplication-TileColor', content: '#36453B' },
        { name: 'msapplication-navbutton-color', content: '#36453B' },
        // iOS notification support and orientation
        { name: 'apple-mobile-web-app-orientations', content: 'portrait' },
        { name: 'format-detection', content: 'telephone=no' },
      ];

      metaTags.forEach(({ name, content }) => {
        let meta = document.querySelector(`meta[name="${name}"]`);
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute('name', name);
          document.head.appendChild(meta);
        }
        meta.setAttribute('content', content);
      });

      // 2. Generate icons and create data URLs
      console.log('🎨 Generating PWA icons...');
      const iconMap = await generateAllIcons(SHOPIFY_ICON_URL);
      console.log(`✅ Generated ${iconMap.size} icons`);

      // 3. Apple Touch Icons (iOS Home Screen Icons) - Use data URLs
      const appleIcons = [
        { filename: 'apple-touch-icon.png', sizes: '180x180' },
        { filename: 'apple-touch-icon-152.png', sizes: '152x152' },
        { filename: 'apple-touch-icon-120.png', sizes: '120x120' },
      ];

      appleIcons.forEach(({ filename, sizes }) => {
        const dataURL = iconMap.get(filename);
        if (dataURL) {
          const link = document.createElement('link');
          link.rel = 'apple-touch-icon';
          link.href = dataURL;
          if (sizes) link.sizes.value = sizes;
          document.head.appendChild(link);
        }
      });

      // 4. Standard Icons - Use data URLs
      const standardIcons = [
        { filename: 'icon-192.png', sizes: '192x192' },
        { filename: 'icon-512.png', sizes: '512x512' },
      ];

      standardIcons.forEach(({ filename, sizes }) => {
        const dataURL = iconMap.get(filename);
        if (dataURL) {
          const link = document.createElement('link');
          link.rel = 'icon';
          link.href = dataURL;
          link.type = 'image/png';
          if (sizes) link.sizes.value = sizes;
          document.head.appendChild(link);
        }
      });

      // 5. Favicon
      const favicon192 = iconMap.get('icon-192.png');
      if (favicon192) {
        let favicon = document.querySelector('link[rel="shortcut icon"]') as HTMLLinkElement;
        if (!favicon) {
          favicon = document.createElement('link');
          favicon.rel = 'shortcut icon';
          document.head.appendChild(favicon);
        }
        favicon.href = favicon192;
      }

      // 6. PWA Manifest - Use blob URL with dynamic manifest (iOS notification support)
      const manifestContent = {
        name: "Adoras - Family Memory Sharing",
        short_name: "Adoras",
        description: "Reconnect with family through shared memories, stories, photos, and voice notes",
        start_url: "/",
        scope: "/",
        display: "fullscreen",
        display_override: ["fullscreen", "standalone", "minimal-ui"],
        background_color: "#F5F9E9",
        theme_color: "#36453B",
        orientation: "portrait-primary",
        prefer_related_applications: false,
        icons: [
          {
            src: iconMap.get('icon-192.png') || '',
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: iconMap.get('icon-512.png') || '',
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: iconMap.get('apple-touch-icon.png') || '',
            sizes: "180x180",
            type: "image/png",
            purpose: "any"
          },
          {
            src: iconMap.get('apple-touch-icon-152.png') || '',
            sizes: "152x152",
            type: "image/png",
            purpose: "any"
          },
          {
            src: iconMap.get('apple-touch-icon-120.png') || '',
            sizes: "120x120",
            type: "image/png",
            purpose: "any"
          }
        ],
        categories: ["social", "lifestyle", "productivity"],
        lang: "en-US",
        dir: "ltr",
        permissions: ["notifications", "push"],
        notifications: {
          preferredLanguage: "en-US"
        }
      };

      const manifestBlob = new Blob([JSON.stringify(manifestContent)], { type: 'application/json' });
      const manifestURL = URL.createObjectURL(manifestBlob);

      let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
      if (!manifestLink) {
        manifestLink = document.createElement('link');
        manifestLink.rel = 'manifest';
        document.head.appendChild(manifestLink);
      }
      manifestLink.href = manifestURL;

      console.log('✅ PWA Meta Tags Injected:', {
        origin,
        manifest: 'Blob URL with data URL icons',
        appleIcons: appleIcons.length,
        standardIcons: standardIcons.length,
        iconsGenerated: iconMap.size
      });
    };

    setupPWA().catch(error => {
      console.error('❌ Failed to setup PWA meta tags:', error);
    });
  }, []);

  return null; // This component doesn't render anything
};
