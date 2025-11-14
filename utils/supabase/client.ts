/**
 * Shared Supabase Client Singleton
 * 
 * This ensures only ONE Supabase client instance is created
 * across the entire application, preventing the warning:
 * "Multiple GoTrueClient instances detected"
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

// Singleton instance
let supabaseInstance: SupabaseClient | null = null;

/**
 * Get or create the shared Supabase client instance
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(
      `https://${projectId}.supabase.co`,
      publicAnonKey,
      {
        auth: {
          persistSession: true, // Enable session persistence for token refresh
          autoRefreshToken: true, // Auto-refresh tokens to prevent 401 errors
          detectSessionInUrl: false,
          storage: {
            getItem: (key: string) => {
              // Use localStorage for persistence
              return localStorage.getItem(key);
            },
            setItem: (key: string, value: string) => {
              localStorage.setItem(key, value);
            },
            removeItem: (key: string) => {
              localStorage.removeItem(key);
            },
          },
        },
      }
    );
    
    console.log('✅ Supabase client initialized (singleton)');
  }
  
  return supabaseInstance;
}

/**
 * Export the client getter as default
 */
export default getSupabaseClient;
