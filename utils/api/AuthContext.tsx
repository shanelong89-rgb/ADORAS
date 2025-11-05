/**
 * Authentication Context for Adoras
 * Manages user authentication state across the app
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from './client';
import type { UserProfile, SignupRequest, SignInRequest } from './types';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  accessToken: string | null;
  signup: (data: SignupRequest) => Promise<{ success: boolean; error?: string }>;
  signin: (data: SignInRequest, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  signout: () => Promise<void>;
  updateUser: (updates: Partial<UserProfile>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  /**
   * Load user on mount if token exists
   */
  useEffect(() => {
    const loadUser = async () => {
      const token = apiClient.getAccessToken();
      if (token) {
        try {
          const response = await apiClient.getCurrentUser();
          if (response.success && response.user) {
            setUser(response.user);
            setAccessToken(token);
          } else {
            // Token invalid or expired - clear it silently
            console.log('ℹ️ Session expired - please sign in again');
            apiClient.setAccessToken(null);
          }
        } catch (error) {
          // Check if it's an auth error (expected for expired tokens)
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.includes('401') || errorMessage.includes('Invalid JWT') || errorMessage.includes('Unauthorized')) {
            console.log('ℹ️ Previous session expired - please sign in');
          } else {
            console.error('Failed to load user:', error);
          }
          apiClient.setAccessToken(null);
        }
      }
      setIsLoading(false);
    };

    loadUser();
  }, []);

  /**
   * Sign up a new user
   */
  const signup = async (data: SignupRequest) => {
    try {
      const response = await apiClient.signup(data);
      
      if (response.success && response.user) {
        // Auto sign in after signup (always remember for signups - better mobile UX)
        const signinResponse = await apiClient.signin({
          email: data.email,
          password: data.password,
        }, true); // Always remember for new signups

        if (signinResponse.success && signinResponse.user) {
          setUser(signinResponse.user);
          setAccessToken(apiClient.getAccessToken());
          return { success: true };
        }
      }

      return {
        success: false,
        error: response.error || 'Signup failed',
      };
    } catch (error) {
      console.error('Signup error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  };

  /**
   * Sign in a user
   */
  const signin = async (data: SignInRequest, rememberMe: boolean = true) => {
    try {
      const response = await apiClient.signin(data, rememberMe);
      
      if (response.success && response.user) {
        setUser(response.user);
        setAccessToken(apiClient.getAccessToken());
        return { success: true };
      }

      return {
        success: false,
        error: response.error || 'Sign in failed',
      };
    } catch (error) {
      console.error('Sign in error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  };

  /**
   * Sign out current user
   */
  const signout = async () => {
    try {
      await apiClient.signout();
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setUser(null);
      setAccessToken(null);
    }
  };

  /**
   * Update user in state (for optimistic updates)
   */
  const updateUser = (updates: Partial<UserProfile>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  /**
   * Refresh user data from server
   */
  const refreshUser = async () => {
    try {
      const response = await apiClient.getCurrentUser();
      if (response.success && response.user) {
        setUser(response.user);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    accessToken,
    signup,
    signin,
    signout,
    updateUser,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}