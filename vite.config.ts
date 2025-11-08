import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Custom plugin to completely block backend files from being processed
function excludeBackendFiles() {
  return {
    name: 'exclude-backend-files',
    // Block imports during resolution phase
    resolveId(source: string) {
      // Block any imports that reference backend directories or packages
      if (
        source.includes('supabase/functions') || 
        source.includes('supabase\\functions') ||
        source === '@supabase/functions-js' ||
        source === 'hono' ||
        source.startsWith('npm:') ||
        source.startsWith('node:')
      ) {
        console.log(`🚫 Blocked backend import: ${source}`);
        return { id: source, external: true };
      }
      return null;
    },
    // Block files during load phase
    load(id: string) {
      if (id.includes('supabase/functions') || id.includes('supabase\\functions')) {
        console.log(`🚫 Blocked backend file load: ${id}`);
        return { code: 'export default {}', moduleSideEffects: false };
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
    outDir: 'build',
    sourcemap: true,
    emptyOutDir: true,
    rollupOptions: {
      external: [
        /^npm:/,  // Exclude all npm: imports (Deno-specific)
        /^node:/,  // Exclude all node: imports (Deno-specific)
        /supabase[\\/]functions/,  // Exclude all Supabase Edge Functions (backend code)
        '@supabase/functions-js',  // Explicitly exclude Deno package
        'hono',  // Explicitly exclude Hono framework
      ],
      output: {
        manualChunks: undefined,
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
