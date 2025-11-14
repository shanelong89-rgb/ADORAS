import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Custom plugin to completely block backend files from being processed
function excludeBackendFiles() {
  return {
    name: 'exclude-backend-files',
    enforce: 'pre' as const,
    // Block imports during resolution phase
    resolveId(source: string, importer: string | undefined) {
      // Block any imports that reference backend directories or packages
      if (
        source.includes('supabase/functions') || 
        source.includes('supabase\\functions') ||
        source === '@supabase/functions-js' ||
        source === 'hono' ||
        source.startsWith('npm:') ||
        source.startsWith('node:')
      ) {
        console.error(`\n❌ BLOCKED BACKEND IMPORT: ${source}`);
        if (importer) {
          console.error(`   ↳ Imported from: ${importer}`);
        }
        // Return empty module instead of external
        return '\0virtual:empty';
      }
      return null;
    },
    // Block files during load phase
    load(id: string) {
      // Return mock module for @supabase/functions-js
      if (id === '\0virtual:empty') {
        console.log('✅ Returning complete mock for @supabase/functions-js');
        // Return a complete stub that satisfies ALL @supabase/supabase-js imports
        return `
          // Mock FunctionsClient class
          export class FunctionsClient {
            constructor() {}
            invoke() { 
              return Promise.resolve({ 
                data: null, 
                error: new Error('Edge Functions not available in browser build') 
              }); 
            }
            setAuth() { return this; }
          }
          
          // Mock error classes
          export class FunctionsHttpError extends Error {
            constructor(message) {
              super(message);
              this.name = 'FunctionsHttpError';
            }
          }
          
          export class FunctionsFetchError extends Error {
            constructor(message) {
              super(message);
              this.name = 'FunctionsFetchError';
            }
          }
          
          export class FunctionsRelayError extends Error {
            constructor(message) {
              super(message);
              this.name = 'FunctionsRelayError';
            }
          }
          
          export class FunctionsError extends Error {
            constructor(message) {
              super(message);
              this.name = 'FunctionsError';
            }
          }
          
          // Mock FunctionRegion enum/type
          export const FunctionRegion = {
            Any: 'any',
            ApNortheast1: 'ap-northeast-1',
            ApNortheast2: 'ap-northeast-2',
            ApSouth1: 'ap-south-1',
            ApSoutheast1: 'ap-southeast-1',
            ApSoutheast2: 'ap-southeast-2',
            CaCentral1: 'ca-central-1',
            EuCentral1: 'eu-central-1',
            EuWest1: 'eu-west-1',
            EuWest2: 'eu-west-2',
            EuWest3: 'eu-west-3',
            SaEast1: 'sa-east-1',
            UsEast1: 'us-east-1',
            UsWest1: 'us-west-1',
            UsWest2: 'us-west-2'
          };
          
          export default FunctionsClient;
        `;
      }
      if (id.includes('supabase/functions') || id.includes('supabase\\functions')) {
        console.error(`\n❌ BLOCKED BACKEND FILE: ${id}`);
        return 'export default {}';
      }
      return null;
    },
  };
}

// Production-ready Vercel configuration
export default defineConfig({
  plugins: [
    react({
      // Exclude backend files from React plugin processing
      exclude: [/supabase[\\/]functions/, /supabase\\functions/],
    }),
    excludeBackendFiles(),
  ],
  root: './',
  build: {
    outDir: 'dist',
    sourcemap: false,
    emptyOutDir: true,
    rollupOptions: {
      // DON'T use external - it leaves import statements in the code!
      // Instead, the plugin above returns empty modules for blocked imports
      output: {
        manualChunks: undefined,
        // Force new bundle hash by adding build timestamp
        entryFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        chunkFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        assetFileNames: `assets/[name]-[hash]-${Date.now()}.[ext]`,
      },
    },
  },
  optimizeDeps: {
    exclude: [
      'supabase/functions',
      '@supabase/functions-js',
      'hono',
      'npm:hono',
    ],
    include: ['react', 'react-dom'],
    // Don't scan backend directory for dependencies - CRITICAL
    entries: [
      'index.html',
      'main.tsx',
      'App.tsx',
      'components/**/*.tsx',
      'utils/**/*.ts',
      '!supabase/**',  // Exclude ALL supabase directory
      '!**/supabase/**',  // Exclude nested supabase directories
    ],
  },
  publicDir: 'public',
  server: {
    port: 3000,
    host: true,
    strictPort: true,
    fs: {
      // Strictly prevent access to backend files
      deny: [
        '**/supabase/functions/**',
        '**/@supabase/functions-js/**',
        '**/hono/**',
      ],
    },
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 3000,
    },
  },
  base: '/',
  css: {
    postcss: './postcss.config.js',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      // Map motion/react to framer-motion for compatibility
      'motion/react': 'framer-motion',
      // Remove version specifiers from imports
      'sonner@2.0.3': 'sonner',
      'lucide-react@0.487.0': 'lucide-react',
      'react-day-picker@8.10.1': 'react-day-picker',
      '@radix-ui/react-accordion@1.2.3': '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog@1.1.6': '@radix-ui/react-alert-dialog',
      'class-variance-authority@0.7.1': 'class-variance-authority',
      '@radix-ui/react-aspect-ratio@1.1.2': '@radix-ui/react-aspect-ratio',
      '@radix-ui/react-avatar@1.1.3': '@radix-ui/react-avatar',
      '@radix-ui/react-slot@1.1.2': '@radix-ui/react-slot',
      'embla-carousel-react@8.6.0': 'embla-carousel-react',
      'recharts@2.15.2': 'recharts',
      '@radix-ui/react-checkbox@1.1.4': '@radix-ui/react-checkbox',
      '@radix-ui/react-collapsible@1.1.3': '@radix-ui/react-collapsible',
      'cmdk@1.1.1': 'cmdk',
      '@radix-ui/react-context-menu@2.2.6': '@radix-ui/react-context-menu',
      '@radix-ui/react-dialog@1.1.6': '@radix-ui/react-dialog',
      'vaul@1.1.2': 'vaul',
      '@radix-ui/react-dropdown-menu@2.1.6': '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-label@2.1.2': '@radix-ui/react-label',
      'react-hook-form@7.55.0': 'react-hook-form',
      '@radix-ui/react-hover-card@1.1.6': '@radix-ui/react-hover-card',
      'input-otp@1.4.2': 'input-otp',
      '@radix-ui/react-menubar@1.1.6': '@radix-ui/react-menubar',
      '@radix-ui/react-navigation-menu@1.2.2': '@radix-ui/react-navigation-menu',
      '@radix-ui/react-popover@1.1.6': '@radix-ui/react-popover',
      '@radix-ui/react-progress@1.1.3': '@radix-ui/react-progress',
      '@radix-ui/react-radio-group@1.2.3': '@radix-ui/react-radio-group',
      '@radix-ui/react-scroll-area@1.2.3': '@radix-ui/react-scroll-area',
      '@radix-ui/react-select@2.1.6': '@radix-ui/react-select',
      '@radix-ui/react-separator@1.1.2': '@radix-ui/react-separator',
      '@radix-ui/react-slider@1.2.3': '@radix-ui/react-slider',
      '@radix-ui/react-switch@1.1.4': '@radix-ui/react-switch',
      '@radix-ui/react-tabs@1.1.3': '@radix-ui/react-tabs',
      '@radix-ui/react-toast@1.2.6': '@radix-ui/react-toast',
      '@radix-ui/react-toggle@1.1.3': '@radix-ui/react-toggle',
      '@radix-ui/react-toggle-group@1.1.3': '@radix-ui/react-toggle-group',
      '@radix-ui/react-tooltip@1.1.6': '@radix-ui/react-tooltip',
    },
  },
});
