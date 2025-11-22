import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Memory, UserType, UserProfile } from '../App';
import { Send, Sparkles, Loader2, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../utils/api/client';
import { useAuth } from '../utils/api/AuthContext';

interface PromptsTabProps {
  userType: UserType;
  partnerName: string | undefined;
  partnerProfile?: UserProfile;
  onAddMemory: (memory: Omit<Memory, 'id' | 'timestamp'>) => void;
  memories: Memory[];
  onNavigateToChat?: (prompt: string) => void;
}

interface TodaysPrompt {
  date: string;
  question: string; // Backend uses "question" not "text"
  topicHeader?: string;
  category?: string;
  userType: 'keeper' | 'teller';
  answered: boolean;
  memoryId?: string;
}

interface RandomPrompt {
  question: string;
  topicHeader?: string;
  category: string;
  userType: 'keeper' | 'teller';
}

export function PromptsTab({ userType, partnerName, partnerProfile, onAddMemory, memories, onNavigateToChat }: PromptsTabProps) {
  const { user } = useAuth();
  const [todaysPrompt, setTodaysPrompt] = useState<TodaysPrompt | null>(null);
  const [randomPrompts, setRandomPrompts] = useState<RandomPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingPrompts, setIsRefreshingPrompts] = useState(false);
  const [selectedRandomPromptIndex, setSelectedRandomPromptIndex] = useState<number | null>(null);

  // Fetch today's prompt from the API
  useEffect(() => {
    const fetchTodaysPrompt = async () => {
      if (!user?.id) {
        console.log('📝 No user ID available, skipping prompt fetch');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        console.log('📝 Fetching today\'s prompt for user:', user.id);

        const response = await apiClient.getTodaysPrompt(user.id);
        
        if (response.success && response.prompt) {
          console.log('✅ Today\'s prompt loaded:', response.prompt);
          setTodaysPrompt(response.prompt);
        } else {
          console.warn('⚠️ No prompt available:', response.error);
        }
      } catch (err) {
        console.error('❌ Failed to fetch prompt:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTodaysPrompt();
  }, [user?.id]);

  // Fetch random prompts for inspiration
  useEffect(() => {
    fetchRandomPrompts();
  }, [user?.id]);

  const fetchRandomPrompts = async () => {
    if (!user?.id) return;
    
    try {
      setIsRefreshingPrompts(true);
      console.log('🎲 Fetching random prompts...');
      
      const response = await apiClient.getRandomPrompts(user.id, 3);
      
      if (response.success && response.prompts) {
        console.log('✅ Random prompts loaded:', response.prompts);
        setRandomPrompts(response.prompts);
      }
    } catch (err) {
      console.error('❌ Failed to fetch random prompts:', err);
    } finally {
      setIsRefreshingPrompts(false);
    }
  };
  
  const handleSendToPartner = (promptText: string) => {
    if (!partnerName) {
      toast.error('No partner connected');
      return;
    }

    // For keepers: Actually send the prompt as a message
    if (userType === 'keeper') {
      onAddMemory({
        type: 'text',
        content: promptText,
        sender: 'keeper',
        category: 'Prompts',
        tags: ['prompt', 'daily-prompt', todaysPrompt?.category || ''].filter(Boolean),
        promptQuestion: promptText,
        conversationContext: todaysPrompt?.topicHeader || todaysPrompt?.category
      });
      toast.success(`Prompt sent to ${partnerName}!`);
    } 
    // For tellers: Navigate to chat to respond
    else if (onNavigateToChat) {
      onNavigateToChat(promptText);
      toast.success('Opening chat to respond...');
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ top: '100px' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading today's prompt...</p>
        </div>
      </div>
    );
  }

  // Render no prompt state
  if (!todaysPrompt) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Calendar className="w-8 h-8 text-primary" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="font-semibold">No prompt today</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Check back tomorrow for your next prompt!
          </p>
        </div>
      </div>
    );
  }

  // Determine what to display based on userType
  const isKeeper = userType === 'keeper';
  const isTeller = userType === 'teller';
  
  // For keepers: Show BOTH topic header and question
  // For tellers: Show full question only
  const displayText = todaysPrompt.question;
  const showTopicHeader = isKeeper && todaysPrompt.topicHeader;
  const categoryIcon = getCategoryIcon(todaysPrompt.category || '');

  return (
    <div className="space-y-6">
      {/* Today's Prompt Card */}
      <Card className="border-none bg-gradient-to-b from-[rgb(182,191,179)] to-[#F5F9E9] shadow-md">
        <CardHeader className="pb-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[#3d5a52]" />
              </div>
              <CardTitle className="text-lg text-[rgb(255,255,255)]" style={{ fontFamily: 'Archivo' }}>Today's Prompt</CardTitle>
            </div>
            <Clock className="w-4 h-4 text-[#6b6b6b]" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Prompt Display */}
          <div className="flex items-start gap-4 p-4 bg-white/80 rounded-xl">
            <div className="text-4xl">{categoryIcon}</div>
            <div className="flex-1 space-y-2">
              {/* Show topic header for keepers */}
              {showTopicHeader && (
                <div className="mb-2">
                  <Badge variant="default" className="bg-[#3d5a52] text-white border-none text-sm">
                    📌 {todaysPrompt.topicHeader}
                  </Badge>
                </div>
              )}
              <p className="text-lg text-[#2d2d2d] leading-snug" style={{ fontFamily: 'Archivo' }}>{displayText}</p>
              {todaysPrompt.category && (
                <Badge variant="secondary" className="bg-white/60 text-[#3d5a52] border-none">
                  {todaysPrompt.category}
                </Badge>
              )}
              
              {/* Keeper-specific info */}
              {isKeeper && (
                <p className="text-xs text-[#6b6b6b] mt-2">
                  💡 The topic header helps categorize your stories. Share your thoughts on this question!
                </p>
              )}
              
              {/* Teller-specific info */}
              {isTeller && (
                <p className="text-xs text-[#6b6b6b] mt-2">
                  💡 You receive detailed prompts every 2 days to give you time to respond thoughtfully.
                </p>
              )}
            </div>
          </div>

          {/* Action Button */}
          {!todaysPrompt.answered ? (
            <Button
              onClick={() => handleSendToPartner(displayText || todaysPrompt.question)}
              className="w-full bg-[rgb(54,69,59)] hover:bg-[#2d4a42] text-white"
              size="lg"
            >
              <Send className="w-4 h-4 mr-2" />
              {isKeeper ? `Share with ${partnerName || 'Partner'}` : `Respond to Prompt`}
            </Button>
          ) : (
            <div className="text-center py-4 space-y-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#3d5a52]/10 text-[#3d5a52] rounded-full">
                <span className="text-xl">✓</span>
                <span className="text-sm font-medium">Prompt answered!</span>
              </div>
              <p className="text-xs text-[#6b6b6b]">
                You've already responded to today's prompt
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Section */}
      <div className="space-y-4 px-4">
        <h3 className="font-semibold flex items-center gap-2 text-[#2d2d2d]">
          <Sparkles className="w-4 h-4 text-[#3d5a52]" />
          How Prompts Work
        </h3>
        
        {isKeeper ? (
          <div className="space-y-3 text-sm text-[#6b6b6b]">
            <div className="flex gap-3">
              <span className="text-2xl">📅</span>
              <div>
                <p className="font-medium text-[#2d2d2d]">Daily Topic Headers</p>
                <p>You receive a new topic every day to share stories about</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-2xl">💬</span>
              <div>
                <p className="font-medium text-[#2d2d2d]">Share Freely</p>
                <p>Use the topic as inspiration to share memories and stories</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-sm text-[#6b6b6b]">
            <div className="flex gap-3">
              <span className="text-2xl">📅</span>
              <div>
                <p className="font-medium text-[#2d2d2d]">Every 2 Days</p>
                <p>You receive a new detailed prompt every 2 days</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-2xl">💭</span>
              <div>
                <p className="font-medium text-[#2d2d2d]">Thoughtful Questions</p>
                <p>Take your time to craft meaningful responses</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* More Prompts Section */}
      {randomPrompts.length > 0 && (
        <div className="space-y-4 px-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[#2d2d2d]" style={{ fontFamily: 'Archivo' }}>More Prompts</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchRandomPrompts}
              disabled={isRefreshingPrompts}
              className="text-[#3d5a52] hover:text-[#2d4a42] hover:bg-[#3d5a52]/10"
            >
              {isRefreshingPrompts ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span className="ml-2">Generate New</span>
            </Button>
          </div>

          <div className="space-y-3">
            {randomPrompts.map((prompt, index) => {
              const isSelected = selectedRandomPromptIndex === index;
              
              return (
                <div
                  key={index}
                  className={`bg-white rounded-lg border transition-all ${
                    isSelected 
                      ? 'border-[#3d5a52] bg-[#F5F9E9] shadow-md' 
                      : 'border-gray-200'
                  }`}
                >
                  <button
                    onClick={() => setSelectedRandomPromptIndex(isSelected ? null : index)}
                    className="w-full text-left p-4 hover:bg-[#F5F9E9]/50 transition-colors rounded-lg"
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl flex-shrink-0">{getCategoryIcon(prompt.category)}</div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm mb-2 ${
                          isSelected ? 'text-[#3d5a52]' : 'text-[#2d2d2d]'
                        } transition-colors`} style={{ fontFamily: 'Archivo' }}>
                          {prompt.question}
                        </p>
                        <Badge variant="secondary" className="bg-gray-100 text-[#6b6b6b] border-none text-xs">
                          {prompt.category}
                        </Badge>
                      </div>
                    </div>
                  </button>
                  
                  {/* Show Share Button when selected */}
                  {isSelected && (
                    <div className="px-4 pb-4 pt-2">
                      <Button
                        onClick={() => {
                          handleSendToPartner(prompt.question);
                          setSelectedRandomPromptIndex(null);
                        }}
                        className="w-full bg-[rgb(54,69,59)] hover:bg-[#2d4a42] text-white"
                        size="sm"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {isKeeper ? `Share with ${partnerName || 'Partner'}` : `Respond to Prompt`}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Connection Status */}
      {!partnerName && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Connect with a partner to start sharing prompts!
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper function to get emoji icon for categories
function getCategoryIcon(category: string): string {
  const iconMap: Record<string, string> = {
    'Family & Relationships': '👨‍👩‍👧‍👦',
    'Childhood & Growing Up': '🧸',
    'Milestones & Achievements': '🏆',
    'Daily Life & Routines': '☕',
    'Hobbies & Interests': '🎨',
    'Travel & Adventures': '✈️',
    'Food & Cooking': '🍳',
    'Work & Career': '💼',
    'Wisdom & Life Lessons': '💡',
    'Dreams & Aspirations': '⭐',
    'Family': '💝',
    'Childhood': '👶',
    'Wisdom': '🌟',
    'Traditions': '🎄',
    'Courage': '🦁',
    'Friendships': '👯',
    'Food': '🍳',
    'Humor': '😂',
    'Life Lessons': '💡',
    'Culture': '📚',
    'Travel': '🌄',
    'Dreams': '✨',
    'Adventures': '🗺️',
    'Perspective': '🎯',
    'Reflections': '🎨',
    'Relationships': '❤️',
    'Nostalgia': '📻',
    'Life Choices': '🤔',
    'Turning Points': '🌅',
    'Music & Memory': '🎵',
    'Secrets': '🤫',
    'History': '📰',
    'Legacy': '🌳',
  };

  return iconMap[category] || '💭';
}
