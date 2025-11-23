/**
 * Timezone Detection and Management
 * 
 * Automatically detects user's timezone and syncs to backend
 * for 8am prompt notifications
 */

import { apiClient } from './api/client';

/**
 * Get user's current timezone (IANA format)
 * @returns Timezone string like 'America/New_York'
 */
export function detectUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.error('Failed to detect timezone:', error);
    return 'America/New_York'; // Default fallback
  }
}

/**
 * Sync user's timezone to backend
 * Should be called once on login/signup
 */
export async function syncTimezoneToBackend(accessToken: string): Promise<void> {
  try {
    const timezone = detectUserTimezone();
    console.log(`🌍 Detected timezone: ${timezone}`);
    
    const response = await fetch(
      `${apiClient.BASE_URL}/user/timezone`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ timezone })
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Timezone synced to backend: ${timezone}`);
      console.log(`📱 ${data.message}`);
      
      // Store in localStorage to avoid repeated syncs
      localStorage.setItem('adoras_timezone_synced', timezone);
    } else {
      console.error('Failed to sync timezone:', await response.text());
    }
  } catch (error) {
    console.error('Error syncing timezone:', error);
  }
}

/**
 * Check if timezone needs to be synced
 * @returns true if timezone has changed or never been synced
 */
export function needsTimezoneSync(): boolean {
  try {
    const currentTimezone = detectUserTimezone();
    const syncedTimezone = localStorage.getItem('adoras_timezone_synced');
    
    return !syncedTimezone || syncedTimezone !== currentTimezone;
  } catch (error) {
    return true; // Sync if error detecting
  }
}

/**
 * Format timezone for display
 * @param timezone IANA timezone string
 * @returns Human-readable timezone like 'Eastern Time (ET)'
 */
export function formatTimezone(timezone: string): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'short'
  });
  
  try {
    const parts = formatter.formatToParts(now);
    const timeZonePart = parts.find(part => part.type === 'timeZoneName');
    return timeZonePart?.value || timezone;
  } catch (error) {
    return timezone;
  }
}

/**
 * Get user's current local time formatted
 */
export function getUserLocalTime(timezone?: string): string {
  try {
    const tz = timezone || detectUserTimezone();
    return new Date().toLocaleString('en-US', {
      timeZone: tz,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    return new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }
}

/**
 * Check if it's currently 8am in user's timezone
 * Useful for testing notifications
 */
export function isEightAM(timezone?: string): boolean {
  try {
    const tz = timezone || detectUserTimezone();
    const hour = parseInt(
      new Date().toLocaleString('en-US', {
        timeZone: tz,
        hour: 'numeric',
        hour12: false
      })
    );
    return hour === 8;
  } catch (error) {
    return false;
  }
}
