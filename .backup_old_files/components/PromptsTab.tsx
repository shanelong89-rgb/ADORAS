import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Memory, UserType, UserProfile } from '../App';
import { Send, Sparkles, Heart, Camera, Clock, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

interface PromptsTabProps {
  userType: UserType;
  partnerName: string | undefined; // Allow undefined for "not connected" state
  partnerProfile?: UserProfile;
  onAddMemory: (memory: Omit<Memory, 'id' | 'timestamp'>) => void;
  memories: Memory[];
  onNavigateToChat?: (prompt: string) => void;
}

const CHILD_PROMPTS = [
  {
    id: '1',
    text: "What was your favorite meal you cooked for me?",
    category: 'Food',
    icon: '🍳'
  },
  {
    id: '2', 
    text: "Tell me about a time when you were really proud of me.",
    category: 'Family',
    icon: '💝'
  },
  {
    id: '3',
    text: "What's your favorite memory from when I was little?",
    category: 'Childhood',
    icon: '👶'
  },
  {
    id: '4',
    text: "What lesson did your parents teach you that you want to share with me?",
    category: 'Wisdom',
    icon: '🌟'
  },
  {
    id: '5',
    text: "Describe a family tradition that means a lot to you.",
    category: 'Traditions',
    icon: '🎄'
  },
  {
    id: '6',
    text: "What was the bravest thing you ever did?",
    category: 'Courage',
    icon: '🦁'
  },
  {
    id: '7',
    text: "Tell me about your best friend growing up.",
    category: 'Friendships',
    icon: '👯'
  },
  {
    id: '8',
    text: "What's a family recipe you want me to remember?",
    category: 'Food',
    icon: '📖'
  },
  {
    id: '9',
    text: "What's the funniest thing that ever happened to you?",
    category: 'Humor',
    icon: '😂'
  },
  {
    id: '10',
    text: "Tell me about a time you failed but learned something valuable.",
    category: 'Life Lessons',
    icon: '💡'
  },
  {
    id: '11',
    text: "What was your favorite book or movie when you were my age?",
    category: 'Culture',
    icon: '📚'
  },
  {
    id: '12',
    text: "What's the most beautiful place you've ever been?",
    category: 'Travel',
    icon: '🌄'
  },
  {
    id: '13',
    text: "What advice would you give your younger self?",
    category: 'Wisdom',
    icon: '⏳'
  },
  {
    id: '14',
    text: "Tell me about the day I was born.",
    category: 'Family',
    icon: '🎂'
  },
  {
    id: '15',
    text: "What's something you wish we did more often together?",
    category: 'Bonding',
    icon: '🤝'
  }
];

const PARENT_STORY_TOPICS = [
  {
    id: '1',
    text: "What did you want to be when you grew up, and why?",
    category: 'Dreams',
    icon: '✨'
  },
  {
    id: '2',
    text: "What family recipe tells our story best?",
    category: 'Food & Culture',
    icon: '🍳'
  },
  {
    id: '3',
    text: "What's one family saying or wisdom that's been passed down?",
    category: 'Wisdom',
    icon: '📖'
  },
  {
    id: '4',
    text: "What failure taught you the most valuable lesson?",
    category: 'Life Lessons',
    icon: '💡'
  },
  {
    id: '5',
    text: "What cultural traditions from your childhood do you wish we still practiced?",
    category: 'Traditions',
    icon: '🌍'
  },
  {
    id: '6',
    text: "What's the kindest thing someone in our family ever did for you?",
    category: 'Family',
    icon: '💝'
  },
  {
    id: '7',
    text: "What's the craziest adventure you ever had?",
    category: 'Adventures',
    icon: '🗺️'
  },
  {
    id: '8',
    text: "What does 'success' mean to you now vs. when you were young?",
    category: 'Perspective',
    icon: '🎯'
  },
  {
    id: '9',
    text: "What's a talent or skill you wish you'd pursued?",
    category: 'Reflections',
    icon: '🎨'
  },
  {
    id: '10',
    text: "What's your secret to lasting relationships?",
    category: 'Relationships',
    icon: '❤️'
  },
  {
    id: '11',
    text: "What ordinary things from your youth would amaze kids today?",
    category: 'Nostalgia',
    icon: '📻'
  },
  {
    id: '12',
    text: "What was the hardest decision you ever had to make?",
    category: 'Life Choices',
    icon: '🤔'
  },
  {
    id: '13',
    text: "Tell me about a moment that changed your life forever.",
    category: 'Turning Points',
    icon: '🌅'
  },
  {
    id: '14',
    text: "What song always brings back memories for you, and why?",
    category: 'Music & Memory',
    icon: '🎵'
  },
  {
    id: '15',
    text: "What's the best advice you ever received?",
    category: 'Wisdom',
    icon: '💭'
  },
  {
    id: '16',
    text: "Describe a perfect day from your childhood.",
    category: 'Nostalgia',
    icon: '☀️'
  },
  {
    id: '17',
    text: "What holiday tradition meant the most to you growing up?",
    category: 'Traditions',
    icon: '🎉'
  },
  {
    id: '18',
    text: "What's something you've never told anyone before?",
    category: 'Secrets',
    icon: '🤫'
  },
  {
    id: '19',
    text: "What historical event do you remember most vividly?",
    category: 'History',
    icon: '📰'
  },
  {
    id: '20',
    text: "What's the most important thing you want your grandchildren to know?",
    category: 'Legacy',
    icon: '🌳'
  }
];

const CHILD_SUGGESTED_PROMPTS = [
  "What was your favorite song when you were my age?",
  "Tell me about your first job.",
  "What's something you wish you knew at my age?",
  "Describe your dream vacation we could take together.",
  "What's a skill you'd like to teach me?",
  "Tell me about a challenge you overcame."
];

const PARENT_SUGGESTED_TOPICS = [
  "Growing up in my hometown",
  "How I met your other parent",
  "My favorite childhood memory",
  "A lesson I learned the hard way",
  "Our family's immigration story",
  "My proudest achievement"
];

export function PromptsTab({ userType, partnerName, partnerProfile, onAddMemory, memories, onNavigateToChat }: PromptsTabProps) {
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [displayedPrompts, setDisplayedPrompts] = useState<typeof CHILD_PROMPTS>([]);
  const [todaysPromptIndex, setTodaysPromptIndex] = useState(0);
  const [currentDate, setCurrentDate] = useState(new Date());

  const isParent = userType === 'parent';
  const allPrompts = isParent ? PARENT_STORY_TOPICS : CHILD_PROMPTS;
  const suggestedPrompts = isParent ? PARENT_SUGGESTED_TOPICS : CHILD_SUGGESTED_PROMPTS;

  // Calculate day of year for deterministic daily prompt selection
  const getDayOfYear = (date: Date): number => {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  };

  // Update today's prompt index based on current date
  useEffect(() => {
    const dayOfYear = getDayOfYear(currentDate);
    const index = dayOfYear % allPrompts.length;
    setTodaysPromptIndex(index);
  }, [currentDate, allPrompts.length]);

  // Check for date change every minute
  useEffect(() => {
    const checkDateChange = () => {
      const now = new Date();
      const currentDateString = now.toDateString();
      const storedDateString = currentDate.toDateString();
      
      if (currentDateString !== storedDateString) {
        setCurrentDate(now);
        toast.success('✨ New daily prompt available!');
      }
    };

    // Check immediately
    checkDateChange();

    // Check every minute
    const interval = setInterval(checkDateChange, 60000);
    
    return () => clearInterval(interval);
  }, [currentDate]);

  // Initialize displayed prompts on mount
  useEffect(() => {
    setDisplayedPrompts(allPrompts);
  }, [userType]);

  const handleGenerateNew = () => {
    // Shuffle the prompts to show different ones
    const shuffled = [...allPrompts].sort(() => Math.random() - 0.5);
    setDisplayedPrompts(shuffled);
    setSelectedPrompt(null);
    toast.success('✨ New prompts generated!');
  };

  const handleSendPrompt = (promptText: string) => {
    // Safety check: Don't send if no partner connected
    if (!partnerName) {
      toast.error('Please connect with a partner first');
      return;
    }
    
    // For children (Legacy Keepers), send the prompt as a message to the storyteller
    if (!isParent) {
      onAddMemory({
        type: 'text',
        content: promptText,
        sender: userType as 'keeper' | 'teller',
        category: 'Prompts',
        tags: ['prompt', 'question'],
        promptQuestion: promptText
      });
      toast.success('💡 Prompt sent to Storyteller! They will see it in the chat tab.');
    } else {
      toast.success('Ready to share your story!');
    }
    
    // Navigate to chat for both user types
    if (onNavigateToChat) {
      onNavigateToChat(promptText);
    }
    
    setSelectedPrompt(null);
  };

  const todaysPrompt = displayedPrompts[todaysPromptIndex] || allPrompts[0];

  // Show empty state if no partner is connected
  if (!partnerName) {
    return (
      <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4 text-center space-y-6">
        <div className="p-4 bg-primary/10 rounded-full">
          <Send className="w-12 h-12 sm:w-16 sm:h-16 text-primary" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl sm:text-2xl font-medium" style={{ fontFamily: 'Archivo', letterSpacing: '-0.05em' }}>
            {userType === 'keeper' ? 'No Storyteller Connected' : 'No Connection Yet'}
          </h3>
          <p className="text-muted-foreground max-w-md text-sm sm:text-base">
            {userType === 'keeper' 
              ? 'Create an invitation to connect with a storyteller and start collecting memories together.'
              : 'Accept an invitation code from a legacy keeper to start sharing your stories.'}
          </p>
        </div>
        <Button
          onClick={() => toast.info('Go to Menu → Invite to create or accept a connection')}
          className="gap-2"
        >
          <Send className="w-4 h-4" />
          Get Started
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-7 max-w-2xl mx-auto">
      {/* Today's Featured Prompt */}
      <Card className="border-0 gradient-accent shadow-lg animate-scale-in border border-primary/10">
        <CardHeader className="py-4 px-5 sm:py-5 sm:px-6 pb-3 sm:pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="p-2 sm:p-3 bg-primary/15 rounded-xl">
                <Sparkles className="w-5 h-5 sm:w-7 sm:h-7 text-primary" />
              </div>
              <CardTitle className="text-base sm:text-lg font-medium text-white" style={{ fontFamily: 'Archivo', letterSpacing: '-0.05em' }}>
                {isParent ? "Today's Story" : "Today's Prompt"}
              </CardTitle>
            </div>
            <Badge variant="secondary" className="bg-white/60 backdrop-blur-sm text-primary border-primary/20 font-medium text-[10px] sm:text-xs">
              <Clock className="w-3 h-3 mr-0.5 sm:mr-1" />
              <span className="hidden xs:inline">Daily</span>
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 sm:space-y-6 pt-4 px-5 pb-5 sm:pt-5 sm:px-6 sm:pb-7">
          <div className="flex items-start space-x-3 sm:space-x-4">
            <div className="text-2xl sm:text-3xl p-2 sm:p-3 bg-white/60 rounded-xl backdrop-blur-sm border border-white/20 flex-shrink-0">
              {todaysPrompt.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base sm:text-xl font-medium leading-snug mb-2 sm:mb-3" style={{ fontFamily: 'Archivo', letterSpacing: '-0.05em' }}>
                {todaysPrompt.text}
              </p>
              <Badge variant="outline" className="bg-white/50 backdrop-blur-sm border-primary/25 text-primary font-medium text-[10px] sm:text-xs">
                {todaysPrompt.category}
              </Badge>
            </div>
          </div>
          <Button 
            onClick={() => handleSendPrompt(todaysPrompt.text)}
            className="w-full border-0 shadow-lg hover:shadow-xl transition-all duration-200 h-11 font-semibold"
            size="lg"
            style={{ fontFamily: 'Inter', backgroundColor: 'rgb(54, 69, 59)', color: 'rgb(255, 255, 255)' }}
          >
            {isParent ? (
              <>
                <BookOpen className="w-5 h-5 mr-2" />
                Share with {partnerName}
              </>
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Send to {partnerName}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Other Prompts */}
      <div className="space-y-4 sm:space-y-5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-lg sm:text-xl font-semibold" style={{ fontFamily: 'Archivo', letterSpacing: '-0.04em' }}>{isParent ? 'More Story Topics' : 'More Prompts'}</h3>
          <Button variant="ghost" size="sm" onClick={handleGenerateNew} className="text-sm">
            <Sparkles className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Generate New</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>

        <div className="grid gap-3 sm:gap-4">
          {displayedPrompts.slice(1, 9).map((prompt) => (
            <Card 
              key={prompt.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border bg-white/80 backdrop-blur-sm border-border/40 rounded-xl ${
                selectedPrompt === prompt.id ? 'ring-2 ring-primary shadow-md scale-[1.01] bg-primary/5' : ''
              }`}
              onClick={() => setSelectedPrompt(selectedPrompt === prompt.id ? null : prompt.id)}
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start space-x-4">
                  <div className="text-2xl p-2.5 bg-muted/40 rounded-xl border border-border/20">
                    {prompt.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium leading-relaxed mb-3" style={{ fontFamily: 'Archivo', letterSpacing: '-0.05em' }}>
                      {prompt.text}
                    </p>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="bg-primary/10 border-primary/25 text-primary font-medium">
                        {prompt.category}
                      </Badge>
                      {selectedPrompt === prompt.id && (
                        <Button 
                          size="sm"
                          className="bg-primary hover:bg-primary/90 shadow-md h-8 px-3 font-semibold"
                          style={{ fontFamily: 'Inter' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendPrompt(prompt.text);
                          }}
                        >
                          {isParent ? (
                            <>
                              <BookOpen className="w-4 h-4 mr-2" />
                              Share
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              Send
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick Suggestions */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">{isParent ? 'More Topics' : 'Quick Questions'}</h3>
        <div className="flex flex-wrap gap-2">
          {suggestedPrompts.map((prompt, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => handleSendPrompt(prompt)}
              className="text-xs sm:text-sm h-auto min-h-8 px-2.5 sm:px-3 py-1.5 whitespace-normal text-left break-words max-w-full flex-shrink"
              style={{ wordBreak: 'break-word', hyphens: 'auto' }}
            >
              {prompt}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}