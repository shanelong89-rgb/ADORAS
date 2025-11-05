/**
 * Daily Prompt Scheduler
 * Gamified Duolingo-style daily prompt notifications
 */

import { notifyDailyPrompt } from './notificationService';

// Daily prompts pool (sample prompts)
const DAILY_PROMPTS = [
  "What's your favorite memory from childhood?",
  "Tell me about a time you laughed until you cried.",
  "What's a tradition you'd like to pass down?",
  "Describe your first home.",
  "What's the best advice you ever received?",
  "Share a story about your favorite holiday.",
  "What's something you're proud of?",
  "Tell me about a meaningful friendship.",
  "What's your earliest memory?",
  "Describe a perfect day from your past.",
  "What's a skill you learned that changed your life?",
  "Share a memory about your favorite food.",
  "Tell me about an adventure you had.",
  "What's a lesson you learned the hard way?",
  "Describe a moment that made you feel grateful.",
  "What's a dream you had as a child?",
  "Share a story about overcoming a challenge.",
  "Tell me about your favorite teacher or mentor.",
  "What's a memory that always makes you smile?",
  "Describe a place that feels like home to you.",
];

// Get today's prompt (deterministic based on date)
export function getTodaysPrompt(): string {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  );
  const index = dayOfYear % DAILY_PROMPTS.length;
  return DAILY_PROMPTS[index];
}

// Check if user should receive daily prompt
export function shouldSendDailyPrompt(
  userId: string,
  lastPromptDate?: string,
  timezone?: string
): boolean {
  const now = new Date();
  
  // Don't send if already sent today
  if (lastPromptDate) {
    const lastDate = new Date(lastPromptDate);
    const isSameDay = 
      now.getDate() === lastDate.getDate() &&
      now.getMonth() === lastDate.getMonth() &&
      now.getFullYear() === lastDate.getFullYear();
    
    if (isSameDay) {
      console.log('Daily prompt already sent today for user:', userId);
      return false;
    }
  }

  // Check if it's the right time (default 9 AM)
  const hour = now.getHours();
  if (hour < 9 || hour >= 10) {
    return false;
  }

  return true;
}

// Schedule daily prompt notification
export async function scheduleDailyPromptForUser(
  userId: string,
  timezone?: string,
  customTime?: string
): Promise<boolean> {
  try {
    const prompt = getTodaysPrompt();
    const scheduledTime = customTime || new Date().toISOString();

    const success = await notifyDailyPrompt({
      userId,
      promptText: prompt,
      scheduledTime,
    });

    if (success) {
      // Store last prompt date in localStorage
      try {
        localStorage.setItem(`lastPromptDate_${userId}`, new Date().toISOString());
      } catch (e) {
        console.warn('Could not save last prompt date to localStorage');
      }
    }

    return success;
  } catch (error) {
    console.error('Error scheduling daily prompt:', error);
    return false;
  }
}

// Initialize daily prompt scheduler (call on app start)
export function initializeDailyPromptScheduler(
  userId: string,
  preferences?: {
    enabled: boolean;
    time?: string; // HH:MM format
    timezone?: string;
  }
): void {
  if (!preferences?.enabled) {
    console.log('Daily prompts disabled for user');
    return;
  }

  // Check every hour if we should send a prompt
  const checkInterval = 60 * 60 * 1000; // 1 hour

  const check = () => {
    try {
      const lastPromptDate = localStorage.getItem(`lastPromptDate_${userId}`);
      
      if (shouldSendDailyPrompt(userId, lastPromptDate, preferences.timezone)) {
        scheduleDailyPromptForUser(userId, preferences.timezone, preferences.time);
      }
    } catch (error) {
      console.error('Error checking daily prompt schedule:', error);
    }
  };

  // Check immediately on start
  check();

  // Then check every hour
  setInterval(check, checkInterval);

  console.log('✅ Daily prompt scheduler initialized for user:', userId);
}

// Calculate streak (days in a row user has responded to prompts)
export function calculateStreak(
  responseDates: string[]
): { currentStreak: number; longestStreak: number } {
  if (!responseDates || responseDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Sort dates
  const sorted = responseDates
    .map(d => new Date(d))
    .sort((a, b) => b.getTime() - a.getTime());

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1;

  // Check current streak
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const mostRecent = new Date(sorted[0]);
  mostRecent.setHours(0, 0, 0, 0);
  
  const daysDiff = Math.floor((today.getTime() - mostRecent.getTime()) / 86400000);
  
  if (daysDiff <= 1) {
    currentStreak = 1;
    
    // Count consecutive days
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1]);
      prev.setHours(0, 0, 0, 0);
      
      const curr = new Date(sorted[i]);
      curr.setHours(0, 0, 0, 0);
      
      const diff = Math.floor((prev.getTime() - curr.getTime()) / 86400000);
      
      if (diff === 1) {
        currentStreak++;
        tempStreak++;
      } else {
        break;
      }
    }
  }

  // Calculate longest streak
  tempStreak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    prev.setHours(0, 0, 0, 0);
    
    const curr = new Date(sorted[i]);
    curr.setHours(0, 0, 0, 0);
    
    const diff = Math.floor((prev.getTime() - curr.getTime()) / 86400000);
    
    if (diff === 1) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
  }
  
  longestStreak = Math.max(longestStreak, currentStreak);

  return { currentStreak, longestStreak };
}

// Get motivational message based on streak
export function getStreakMessage(streak: number): string {
  if (streak === 0) {
    return "Start your memory journey today! 🌟";
  } else if (streak === 1) {
    return "Great start! Keep it going! 💪";
  } else if (streak < 7) {
    return `${streak} days strong! You're building a habit! 🔥`;
  } else if (streak < 30) {
    return `${streak} day streak! You're on fire! 🔥🔥`;
  } else if (streak < 100) {
    return `Incredible ${streak} day streak! You're a memory champion! 🏆`;
  } else {
    return `WOW! ${streak} days! You're a legend! 🌟✨`;
  }
}
