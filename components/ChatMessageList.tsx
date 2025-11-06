import React, { memo } from 'react';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Button } from './ui/button';
import { Download, Edit2, Trash2, Play, Pause, FileText, Calendar, MapPin } from 'lucide-react';
import { ImageWithFallback } from './components/figma/ImageWithFallback';
import { format } from 'date-fns';

interface Memory {
  id: string;
  type: string;
  content: string;
  sender: 'keeper' | 'teller';
  timestamp: Date;
  location?: string;
  mediaUrl?: string;
  videoUrl?: string;
  documentUrl?: string;
  documentName?: string;
  promptQuestion?: string;
  photoDate?: string;
  photoLocation?: string;
  aiGenerated?: boolean;
}

interface ChatMessageListProps {
  memories: Memory[];
  userType: 'keeper' | 'teller';
  partnerProfile: any;
  scrollAreaRef: React.RefObject<HTMLDivElement>;
  onEditMemory?: (id: string) => void;
  onDeleteMemory?: (id: string) => void;
  onImageClick?: (url: string) => void;
  onVideoClick?: (memory: Memory) => void;
  activePrompt?: string | null;
  currentPromptContext?: string | null;
}

// CRITICAL: Memoize to prevent re-renders when parent scrolls
export const ChatMessageList = memo(function ChatMessageList({
  memories,
  userType,
  partnerProfile,
  scrollAreaRef,
  onEditMemory,
  onDeleteMemory,
  onImageClick,
  onVideoClick,
  activePrompt,
  currentPromptContext
}: ChatMessageListProps) {
  console.log('📨 ChatMessageList rendering with', memories.length, 'memories');

  // Group messages by date
  const groupedMessages = React.useMemo(() => {
    const groups: { [key: string]: Memory[] } = {};
    
    memories.forEach(memory => {
      const dateKey = format(memory.timestamp, 'MMMM d, yyyy');
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(memory);
    });
    
    return groups;
  }, [memories]);

  const renderMessage = (memory: Memory) => {
    const isFromUser = memory.sender === userType;
    const senderName = isFromUser ? 'You' : partnerProfile?.name || 'Partner';

    return (
      <div key={memory.id} className={`flex items-start space-x-2 mb-4 ${isFromUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
        {/* Avatar */}
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={isFromUser ? undefined : partnerProfile?.photo} />
          <AvatarFallback className="text-xs">
            {isFromUser ? userType === 'keeper' ? 'K' : 'T' : partnerProfile?.name?.[0] || 'P'}
          </AvatarFallback>
        </Avatar>

        {/* Message Content */}
        <div className={`flex-1 max-w-[75%] ${isFromUser ? 'items-end' : 'items-start'}`}>
          {/* Sender Name & Timestamp */}
          <div className={`flex items-center space-x-2 mb-1 ${isFromUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
            <p className="text-xs font-medium" style={{ fontFamily: 'Archivo' }}>{senderName}</p>
            <p className="text-xs text-muted-foreground">
              {format(memory.timestamp, 'h:mm a')}
            </p>
          </div>

          {/* Message Bubble */}
          <div className={`rounded-2xl p-3 ${
            isFromUser 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted'
          }`}>
            {/* Prompt Question Header */}
            {memory.promptQuestion && (
              <div className="mb-2 pb-2 border-b border-current/20">
                <p className="text-xs opacity-70 italic" style={{ fontFamily: 'Inter' }}>
                  💭 {memory.promptQuestion}
                </p>
              </div>
            )}

            {/* Text Content */}
            {memory.type === 'text' && (
              <p className="text-sm whitespace-pre-wrap break-words" style={{ fontFamily: 'Inter' }}>
                {memory.content}
              </p>
            )}

            {/* Voice Message */}
            {memory.type === 'voice' && memory.mediaUrl && (
              <div className="space-y-2">
                <audio controls className="w-full max-w-xs" style={{ height: '32px' }}>
                  <source src={memory.mediaUrl} type="audio/webm" />
                  Your browser does not support audio playback.
                </audio>
                {memory.content && (
                  <p className="text-xs opacity-90 italic mt-2" style={{ fontFamily: 'Inter' }}>
                    "{memory.content}"
                  </p>
                )}
              </div>
            )}

            {/* Photo */}
            {memory.type === 'photo' && memory.mediaUrl && (
              <div className="space-y-2">
                <ImageWithFallback
                  src={memory.mediaUrl}
                  alt={memory.content}
                  className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => onImageClick?.(memory.mediaUrl!)}
                />
                {memory.content && (
                  <p className="text-sm mt-2" style={{ fontFamily: 'Inter' }}>
                    {memory.content}
                  </p>
                )}
                {(memory.photoDate || memory.photoLocation) && (
                  <div className="flex flex-wrap gap-2 text-xs opacity-80 mt-2">
                    {memory.photoDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {memory.photoDate}
                      </span>
                    )}
                    {memory.photoLocation && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {memory.photoLocation}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Video */}
            {memory.type === 'video' && memory.videoUrl && (
              <div className="space-y-2">
                <div 
                  className="relative rounded-lg overflow-hidden cursor-pointer group bg-black"
                  onClick={() => onVideoClick?.(memory)}
                >
                  <video
                    src={memory.videoUrl}
                    className="w-full h-auto max-h-[300px] object-contain"
                    playsInline
                    preload="metadata"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                    <Play className="w-12 h-12 text-white" />
                  </div>
                </div>
                {memory.content && (
                  <p className="text-sm mt-2" style={{ fontFamily: 'Inter' }}>
                    {memory.content}
                  </p>
                )}
              </div>
            )}

            {/* Document */}
            {memory.type === 'document' && memory.documentUrl && (
              <div className="flex items-center space-x-3 bg-background/10 rounded-lg p-3">
                <FileText className="w-8 h-8 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ fontFamily: 'Inter' }}>
                    {memory.documentName || 'Document'}
                  </p>
                  {memory.content && (
                    <p className="text-xs mt-1 opacity-80" style={{ fontFamily: 'Inter' }}>
                      {memory.content}
                    </p>
                  )}
                </div>
                <a
                  href={memory.documentUrl}
                  download={memory.documentName}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button size="sm" variant="ghost">
                    <Download className="w-4 h-4" />
                  </Button>
                </a>
              </div>
            )}

            {/* AI Generated Badge */}
            {memory.aiGenerated && (
              <div className="mt-2 pt-2 border-t border-current/20">
                <p className="text-xs opacity-70 flex items-center gap-1" style={{ fontFamily: 'Inter' }}>
                  <span>✨</span> AI Generated
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {isFromUser && (onEditMemory || onDeleteMemory) && (
            <div className="flex items-center space-x-1 mt-1">
              {onEditMemory && memory.type === 'text' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEditMemory(memory.id)}
                  className="h-6 px-2 text-xs"
                >
                  <Edit2 className="w-3 h-3 mr-1" />
                  Edit
                </Button>
              )}
              {onDeleteMemory && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteMemory(memory.id)}
                  className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <ScrollArea 
      ref={scrollAreaRef}
      className="flex-1 px-3 pt-4" 
      style={{ 
        paddingBottom: 'calc(240px + env(safe-area-inset-bottom, 0px))',
        touchAction: 'pan-y',
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain'
      }}
    >
      <div className="space-y-6">
        {Object.entries(groupedMessages).map(([dateKey, msgs]) => (
          <div key={dateKey}>
            {/* Date Divider */}
            <div className="flex items-center justify-center my-4">
              <div className="bg-muted px-3 py-1 rounded-full">
                <p className="text-xs font-medium text-muted-foreground" style={{ fontFamily: 'Archivo' }}>
                  {dateKey}
                </p>
              </div>
            </div>
            
            {/* Messages for this date */}
            {msgs.map(renderMessage)}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if memories actually changed
  return (
    prevProps.memories.length === nextProps.memories.length &&
    prevProps.memories[prevProps.memories.length - 1]?.id === nextProps.memories[nextProps.memories.length - 1]?.id &&
    prevProps.activePrompt === nextProps.activePrompt &&
    prevProps.currentPromptContext === nextProps.currentPromptContext
  );
});
