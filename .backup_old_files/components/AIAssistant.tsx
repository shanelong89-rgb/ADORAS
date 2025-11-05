/**
 * AI Assistant Component - Phase 4c
 * Chat interface for the Adoras AI Assistant
 */

import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { Sparkles, Send, Loader2, X, RefreshCw, Lightbulb } from 'lucide-react';
import { chatWithAI, generateAIPrompts } from '../utils/aiService';
import { Memory, UserProfile, UserType } from '../App';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIAssistantProps {
  memories: Memory[];
  userType: UserType;
  partnerProfile?: UserProfile;
  onClose?: () => void;
  onSelectPrompt?: (prompt: string) => void;
}

export function AIAssistant({ 
  memories, 
  userType, 
  partnerProfile, 
  onClose,
  onSelectPrompt 
}: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm your Adoras AI Assistant. I can help you explore your memories, generate thoughtful prompts, and answer questions. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Load initial prompt suggestions
  useEffect(() => {
    loadPromptSuggestions();
  }, []);

  const loadPromptSuggestions = async () => {
    setIsLoadingPrompts(true);
    try {
      const prompts = await generateAIPrompts({
        count: 3,
        context: {
          memories: memories.slice(-10),
          partnerName: partnerProfile?.name,
          relationship: partnerProfile?.relationship,
        },
      });
      setSuggestedPrompts(prompts);
    } catch (error) {
      console.error('Failed to load prompt suggestions:', error);
      // Don't show error to user, just skip suggestions
    } finally {
      setIsLoadingPrompts(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    // Add user message to chat
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Prepare context for AI
      const context = {
        memories: memories.slice(-10).map((m) => ({
          type: m.type,
          content: m.content,
          timestamp: m.timestamp.toISOString(),
        })),
        userType: userType === 'keeper' ? 'keeper' as const : 'teller' as const,
        partnerName: partnerProfile?.name,
        conversationHistory: messages.slice(-6).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      };

      // Call AI
      const response = await chatWithAI(userMessage.content, context);

      // Add AI response to chat
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Refresh prompt suggestions after conversation
      loadPromptSuggestions();
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message to chat
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: error instanceof Error && error.message === 'AI_NOT_CONFIGURED'
          ? "I'm not currently configured. Please add your Groq API key in settings to use AI features."
          : "I apologize, I'm having trouble responding right now. Please try again.",
        timestamp: new Date(),
      }]);
      toast.error('Failed to get AI response');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = async (prompt: string) => {
    setInputMessage(prompt);
    await handleSendMessage();
  };

  const handleUsePrompt = (prompt: string) => {
    if (onSelectPrompt) {
      onSelectPrompt(prompt);
      toast.success('Prompt selected for chat');
      if (onClose) onClose();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-purple-50/50 to-pink-50/50 dark:from-purple-950/10 dark:to-pink-950/10">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="font-semibold">AI Assistant</h3>
          <p className="text-xs text-muted-foreground">Powered by Groq ⚡</p>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4 pb-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarFallback className={message.role === 'assistant' 
                  ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white' 
                  : 'bg-[rgb(54,69,59)] text-white'
                }>
                  {message.role === 'assistant' ? <Sparkles className="w-4 h-4" /> : '👤'}
                </AvatarFallback>
              </Avatar>
              <div className={`flex-1 ${message.role === 'user' ? 'flex justify-end' : ''}`}>
                <div
                  className={`inline-block px-4 py-2 rounded-2xl max-w-[80%] ${
                    message.role === 'user'
                      ? 'bg-[rgb(54,69,59)] text-white'
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className={`text-xs mt-1 ${message.role === 'user' ? 'text-white/70' : 'text-muted-foreground'}`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          ))}
          
          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-3">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                  <Sparkles className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Suggested Prompts */}
      {suggestedPrompts.length > 0 && messages.length <= 2 && (
        <div className="p-4 border-t bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium">Suggested prompts for your chat:</span>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto h-6 w-6"
              onClick={loadPromptSuggestions}
              disabled={isLoadingPrompts}
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingPrompts ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestedPrompts.map((prompt, index) => (
              <Badge
                key={index}
                variant="outline"
                className="cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-950/20 transition-colors px-3 py-1"
                onClick={() => handleUsePrompt(prompt)}
              >
                <span className="text-xs">{prompt}</span>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex gap-2"
        >
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask me anything about your memories..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={!inputMessage.trim() || isLoading}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
        
        {/* Quick questions */}
        <div className="flex flex-wrap gap-2 mt-2">
          {[
            'What memories do I have from childhood?',
            'Suggest a prompt for today',
            'What are my most recent memories?',
          ].map((question, index) => (
            <button
              key={index}
              onClick={() => handleQuickPrompt(question)}
              disabled={isLoading}
              className="text-xs px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/30 transition-colors disabled:opacity-50"
            >
              {question}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}