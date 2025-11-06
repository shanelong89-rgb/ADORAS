import React, { useState, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Send, Camera, Mic, Paperclip, Video, BookOpen, X, Languages, ScanText } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { toast } from 'sonner';
import { UserType } from '../App';

interface ChatInputBoxProps {
  /** Current message text */
  message: string;
  
  /** Callback when message changes */
  onMessageChange: (message: string) => void;
  
  /** Callback when send button is clicked */
  onSendMessage: () => void;
  
  /** Callback when photo upload is triggered */
  onPhotoUpload: () => void;
  
  /** Callback when video upload is triggered */
  onVideoUpload: () => void;
  
  /** Callback when document upload is triggered */
  onDocumentUpload: () => void;
  
  /** Callback when voice recording is triggered */
  onVoiceRecord: () => void;
  
  /** Callback when prompt is selected */
  onPromptSelect: () => void;
  
  /** Whether voice recording is in progress */
  isRecording?: boolean;
  
  /** Whether AI features are available */
  hasAIConfigured?: boolean;
  
  /** User type (keeper or teller) */
  userType: UserType;
  
  /** Active prompt question (if any) */
  activePrompt?: string | null;
  
  /** Callback to clear active prompt */
  onClearPrompt?: () => void;
}

/**
 * Chat input box component - handles message composition and media uploads
 * Isolated from scroll logic to prevent re-render conflicts
 */
export function ChatInputBox({
  message,
  onMessageChange,
  onSendMessage,
  onPhotoUpload,
  onVideoUpload,
  onDocumentUpload,
  onVoiceRecord,
  onPromptSelect,
  isRecording = false,
  hasAIConfigured = false,
  userType,
  activePrompt,
  onClearPrompt
}: ChatInputBoxProps) {
  const [showMediaMenu, setShowMediaMenu] = useState(false);

  // Handle send (Enter key or button click)
  const handleSend = useCallback(() => {
    if (message.trim()) {
      onSendMessage();
    }
  }, [message, onSendMessage]);

  // Handle Enter key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-border z-40"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }}
    >
      {/* Active Prompt Header */}
      {activePrompt && (
        <div className="px-3 py-2 bg-primary/5 border-b border-primary/10 flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-1" style={{ fontFamily: 'Inter' }}>
              Responding to prompt:
            </p>
            <p className="text-sm font-medium line-clamp-2" style={{ fontFamily: 'Archivo' }}>
              💭 {activePrompt}
            </p>
          </div>
          {onClearPrompt && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearPrompt}
              className="flex-shrink-0 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-end gap-2 p-3">
        {/* Media Attachments */}
        <Popover open={showMediaMenu} onOpenChange={setShowMediaMenu}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0 h-10 w-10"
              aria-label="Attach media"
            >
              <Paperclip className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            side="top" 
            align="start" 
            className="w-48 p-2"
          >
            <div className="space-y-1">
              <Button
                variant="ghost"
                className="w-full justify-start gap-2"
                onClick={() => {
                  onPhotoUpload();
                  setShowMediaMenu(false);
                }}
              >
                <Camera className="h-4 w-4" />
                Photo
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2"
                onClick={() => {
                  onVideoUpload();
                  setShowMediaMenu(false);
                }}
              >
                <Video className="h-4 w-4" />
                Video
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2"
                onClick={() => {
                  onDocumentUpload();
                  setShowMediaMenu(false);
                }}
              >
                <ScanText className="h-4 w-4" />
                Document
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Voice Recording */}
        <Button
          variant={isRecording ? "destructive" : "ghost"}
          size="icon"
          className="flex-shrink-0 h-10 w-10"
          onClick={onVoiceRecord}
          aria-label={isRecording ? "Stop recording" : "Record voice"}
        >
          <Mic className={`h-5 w-5 ${isRecording ? 'animate-pulse' : ''}`} />
        </Button>

        {/* AI Prompts (only if AI is configured) */}
        {hasAIConfigured && (
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0 h-10 w-10"
            onClick={onPromptSelect}
            aria-label="Choose a prompt"
          >
            <BookOpen className="h-5 w-5" />
          </Button>
        )}

        {/* Message Input */}
        <div className="flex-1 relative">
          <Input
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              isRecording 
                ? "Recording..." 
                : activePrompt 
                ? "Share your memory..." 
                : "Type a message..."
            }
            disabled={isRecording}
            className="pr-12 min-h-[40px] resize-none"
            style={{ fontFamily: 'Inter' }}
          />
        </div>

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={!message.trim() || isRecording}
          size="icon"
          className="flex-shrink-0 h-10 w-10"
          aria-label="Send message"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
